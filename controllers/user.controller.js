import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went from while generating tokens");
  }
};

const registeredUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;
  console.log("body", req.body);
  console.log("files", req.files);

  //validatin for empty fields
  if (
    [username, email, fullname, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //find the existing user with email and username
  const existedUser = await User.findOne({ $or: [{ username }, { email }] });

  if (existedUser) {
    throw new ApiError(409, "User with same email or username already exists");
  }

  // console.log("req.files", req.files);

  const avatarLocalPath = req?.files?.avatar[0]?.path; //file fullpath

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files?.coverImage) &&
    req.files?.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }
  // console.log("avatarLocalPath", avatarLocalPath);
  // console.log("coverImageLocalPath", coverImageLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath, "avatars");
  const coverImage = await uploadOnCloudinary(
    coverImageLocalPath,
    "cover_images"
  );

  if (!avatar) throw new ApiError(400, "Avatar file is required");

  const user = await User.create({
    username: username.toLowerCase(),
    avatar,
    coverImage,
    email,
    fullname,
    password,
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registerd Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  // console.log("login data", req.body);
  // console.log("login user", req.user);

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required ");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });
  console.log("user", user);

  if (!user) {
    throw new ApiError(404, "User doesn't exist, please register");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  // console.log("accessToken here ", accessToken);
  // console.log("refreshToken ", refreshToken);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200, //status code
        { user: loggedInUser, accessToken, refreshToken }, //data
        "User logged in successfully" //message
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  await User.findByIdAndUpdate(userId, {
    $set: {
      refreshToken: undefined,
    },
  });

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.accessToken;
  console.log("incomingRefreshToken", incomingRefreshToken);
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    console.log(decodedToken);

    const user = await User.findById(decodedToken?._id);
    console.log(user);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired");
    }

    const options = { httpOnly: true, secure: true }; //for cookies

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token refreshed"
        )
      );
  } catch (e) {
    throw new ApiError(401, e?.message || "Invalid refresh token");
  }
});

const updatePassword = asyncHandler(async (req, res) => {
  console.log("req.user", req.user);
  const { oldPassword, newPassword } = req.body;

  const userId = req.user?._id;

  console.log(oldPassword, newPassword);

  const user = await User.findById(userId);

  const isPasswordCorrect = await user?.isPasswordCorrect(oldPassword);

  console.log(isPasswordCorrect);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Incorrect password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req?.user, "Current user fetched successfully"));
});

const updateUserAccount = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  console.log("body", req.body);

  console.log(fullname, email);

  if (!fullname || !email) {
    throw new ApiError(400, "All fields required");
  }

  const user = await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set: { fullname, email },
    },
    { new: true }
  ).select("-password");

  console.log("user from patch", user);
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file.path;
  // console.log("avatarLocalPath", avatarLocalPath);

  const avatarPublicId = req?.user?.avatar?.public_id;
  // console.log("publicId from update", publicId);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  if (!avatarPublicId) {
    throw new ApiError(400, "Public ID is not found");
  } else {
    await deleteFromCloudinary(avatarPublicId);
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath, "avatars");

  if (!avatar?.url) {
    throw new ApiError(400, "Error while uploading the avatar");
  }

  const userId = req?.user?._id;

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: { avatar },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  const coverImagePublicId = req?.user?.coverImage?.public_id;

  console.log("coverImagePublicId", coverImagePublicId);

  if (!coverImagePublicId) {
    throw new ApiError(400, "Cover image public id is missing");
  } else {
    await deleteFromCloudinary(coverImagePublicId);
  }

  const coverImage = await uploadOnCloudinary(
    coverImageLocalPath,
    "cover_images"
  );

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading the cover image");
  }

  const userId = req?.user?._id;

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: { coverImage },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) throw new ApiError(400, "Username is missing");

  const channel = await User.aggregate([
    { $match: { username: username?.toLowerCase() } },
    {
      $lookup: {
        // for getting subscribers
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },

    {
      $lookup: {
        //for getting channel
        from: "subscriptions",
        localField: "channel",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },

    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers", //dollar sign for fields
        },
        chennalsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        email: 1,
        subscriberCount: 1,
        chennalsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);
  console.log("channel", channel);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  console.log("userid", req.user?._id);
  const user = await User.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(req.user?._id) },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    email: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
                {
                  $addFields: {
                    owner: {
                      $first: "$owner",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);

  console.log("user from watch", user);

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "User watch history fetched successfully")
    );
});

export {
  registeredUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updatePassword,
  getCurrentUser,
  updateUserAccount,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
