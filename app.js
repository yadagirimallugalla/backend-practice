import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

const CORS_ORIGIN = process.env.CORS_ORIGIN;

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//routes import

import router from "./routes/user.router.js";

app.use("/api/users", router); // /api/users is a prefix

export { app };
