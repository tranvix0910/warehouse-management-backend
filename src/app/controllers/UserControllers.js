import UserModel from "../models/UserModel.js";
import bcrypt from "bcryptjs";
import { sendMail } from "../../services/MailService.js";
import { generateOTPEmailTemplate } from "../../services/EmailTemplates.js";

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getInfoUser = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await UserModel.findById(userId).select("-password -otp");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Get info success", data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error?.message });
  }
};

export const changeInfoUser = async (req, res) => {
  const userId = req.user._id;
  const { username, surName, birthday, company } = req.body;

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Cập nhật các trường nếu có truyền dữ liệu
    if (username !== undefined) user.username = username;
    if (surName !== undefined) user.surName = surName;
    if (birthday !== undefined) user.birthday = birthday;
    if (company !== undefined) user.company = company;

    await user.save();

    // Return user without password and otp
    const { password, otp, ...userWithoutSensitiveData } = user.toObject();

    return res.status(200).json({
      success: true,
      message: "User info updated successfully",
      data: userWithoutSensitiveData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// FORGOT PASSWORD - Send OTP
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email does not exist",
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    // Generate OTP
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP to user
    user.otp = {
      code: otpCode,
      expiresAt: otpExpiresAt,
    };
    await user.save();

    // Send OTP email
    const emailHtml = generateOTPEmailTemplate(
      user.username,
      otpCode,
      "forgot-password"
    );
    sendMail(email, "Reset Password - Nagav Inventory", emailHtml);

    return res.status(200).json({
      success: true,
      message: "Password reset code sent to your email",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// RESET PASSWORD - Verify OTP and change password
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    // Validate input
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    // Check if user exists
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if OTP exists
    if (!user.otp || !user.otp.code || !user.otp.expiresAt) {
      return res.status(400).json({
        success: false,
        message: "No reset code found. Please request a new one.",
      });
    }

    // Check if OTP is expired
    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({
        success: false,
        message: "Reset code has expired. Please request a new one.",
      });
    }

    // Verify OTP
    if (user.otp.code !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset code",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear OTP
    user.password = hashedPassword;
    user.otp = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
