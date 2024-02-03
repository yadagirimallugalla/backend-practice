import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (filePath, folder) => {
  try {
    if (!filePath) {
      return null;
    }
    const response = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "auto",
    });
    console.log("File uploaded to Cloudinary", response?.url);
    return response;
  } catch (error) {
    fs.unlinkSync(filePath);
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  console.log("publicId from Cloudinary", publicId);
  try {
    if (!publicId) {
      return null;
    }

    const response = await cloudinary.uploader.destroy(publicId);

    console.log("File deleted from Cloudinary", response);
  } catch (error) {
    fs.unlinkSync(publicId);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
