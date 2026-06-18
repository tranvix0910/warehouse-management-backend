import express from "express";
import { upload } from "../middlewares/upload.js";
import {
  getInfoUser,
  changeInfoUser,
  forgotPassword,
  resetPassword,
  uploadAvatar,
  getProfile,
  updateProfile,
} from "../app/controllers/UserControllers.js";
import { verifyToken } from "../middlewares/verify.js";

const router = express.Router();

// Lấy thông tin cá nhân của người dùng
router.get("/info", verifyToken, getInfoUser);

// Cập nhật thông tin cá nhân của người dùng
router.put("/change-info", verifyToken, changeInfoUser);

// Lấy thông tin hồ sơ người dùng (profile)
router.get("/profile", verifyToken, getProfile);

// Cập nhật thông tin hồ sơ người dùng (profile)
router.patch("/profile", verifyToken, updateProfile);

// Đăng tải ảnh đại diện (avatar) của người dùng
router.post("/avatar", verifyToken, upload.single("avatar"), uploadAvatar);

// Yêu cầu gửi mã OTP để đặt lại mật khẩu
router.post("/forgot-password", forgotPassword);

// Xác thực OTP và đặt lại mật khẩu mới
router.post("/reset-password", resetPassword);

export default router;
