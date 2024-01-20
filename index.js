import "dotenv/config";
import connectDB from "./db/index.js";

connectDB();

/*import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import express from "express";

const app = express();

const PORT = process.env.PORT;
const DB_URI = process.env.DB_URI;

async function connectDB() {
  try {
    await mongoose.connect(`${DB_URI}/${DB_NAME}`, {});
    console.log("Connected to MongoDB");
    app
      .on("error", (e) => {
        console.error("Error:", e);
      })
      .listen(PORT, () => {
        console.log("Server is running on port", PORT);
      });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

connectDB();
*/
