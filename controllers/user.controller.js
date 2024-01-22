import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registeredUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;
  console.log("body", req.body);

  //validatin for empty fields
  if (
    [username, email, fullname, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //find the existing user with email and username
  const existedUser = User.findOne({ $or: [{ username }, { email }] });

  if (existedUser) {
    throw new ApiError(409, "User with same email or username already exists");
  }
  console.log("existedUser", existedUser);

  const avatarLocalPath = req.files?.avatar[0]?.path; //file fullpath
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  console.log("avatarLocalPath", avatarLocalPath);
  console.log("coverImageLocalPath", coverImageLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) throw new ApiError(400, "Avatar file is required");

  const user = User.create({
    username: username.toLowercase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    fullname,
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registerd Successfully"));
});

export { registeredUser };
