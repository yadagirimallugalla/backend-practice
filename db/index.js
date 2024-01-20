import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(
      `${process.env.DB_URI}/${DB_NAME}`
    );
    console.log(
      "Connected to the MongoDB. HOST is ",
      connection.connection.host
    );
  } catch (error) {
    console.error("Error connecting to the DB", error);
  }
};

export default connectDB;
