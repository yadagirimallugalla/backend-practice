import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registeredUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;
  // console.log("body", req.body);
  // console.log("files", req.files);

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

  const avatarLocalPath = req.files?.avatar[0]?.path; //file fullpath

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

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) throw new ApiError(400, "Avatar file is required");

  const user = await User.create({
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
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

  console.log("login data", req.body);

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

  console.log("accessToken here ", accessToken);
  console.log("refreshToken ", refreshToken);

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

export { registeredUser, loginUser, logoutUser };
