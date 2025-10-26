import express from "express";
import {
  getInfoUser,
  changeInfoUser,
  forgotPassword,
  resetPassword,
} from "../app/controllers/UserControllers.js";
import { verifyToken } from "../middlewares/verify.js";

const router = express.Router();

router.get("/info", verifyToken, getInfoUser);
router.put("/change-info", verifyToken, changeInfoUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
