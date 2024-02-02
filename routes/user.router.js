import { Router } from "express";
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registeredUser,
  updatePassword,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    { name: "coverImage", maxCount: 1 },
  ]),
  registeredUser
);

router.route("/login").post(loginUser);

//secured routes
//when needed user data pass the auth middleware(verifyJWt)
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/update-password").post(verifyJWT, updatePassword);

export default router;
