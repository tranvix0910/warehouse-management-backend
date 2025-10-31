import UserModel from "../models/UserModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendMail } from "../../services/MailService.js";
import {
  generateOTPEmailTemplate,
  generateWelcomeEmailTemplate,
} from "../../services/EmailTemplates.js";

const generateAccessToken = (user) => {
  return jwt.sign({ _id: user._id }, process.env.JWT_ACCESSTOKEN_KEY, {
    expiresIn: "5m",
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ _id: user._id }, process.env.JWT_REFRESHTOKEN_KEY, {
    expiresIn: "365d",
  });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// REGISTER
export const register = async (req, res) => {
  const { email, password, username } = req.body;
  try {
    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      if (existingUser.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: "Email has been used",
        });
      } else {
        // Xóa tài khoản chưa xác minh để tạo lại
        await UserModel.deleteOne({ email });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const newUser = new UserModel({
      email,
      username,
      password: hashedPassword,
      isEmailVerified: false,
      otp: {
        code: otpCode,
        expiresAt: otpExpiresAt,
      },
    });

    await newUser.save();

    const emailHtml = generateOTPEmailTemplate(username, otpCode, "register");
    sendMail(email, "Email Verification - Nagav Inventory", emailHtml);

    return res.status(200).json({
      success: true,
      message:
        "Register successfully. Please check your email for verification code.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// LOGIN
export const login = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Email does not exist" });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect password" });
    }

    if (!user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const { password, ...rest } = user._doc;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: { ...rest },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// REFRESH TOKEN
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  try {
    if (!refreshToken) {
      return res
        .status(401)
        .json({ success: false, message: "You're not authenticated" });
    }

    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESHTOKEN_KEY,
      async (err, user) => {
        if (err) {
          return res
            .status(403)
            .json({ success: false, message: "RefreshToken is invalid" });
        }

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        return res.status(200).json({
          success: true,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });
      }
    );
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// VERIFY OTP
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // 1️⃣ Tìm user theo email
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 2️⃣ Kiểm tra xem đã xác minh chưa
    if (user.isEmailVerified) {
      return res
        .status(400)
        .json({ success: false, message: "Email already verified" });
    }

    // 3️⃣ Kiểm tra OTP có tồn tại không
    if (!user.otp || !user.otp.code || !user.otp.expiresAt) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new one.",
      });
    }

    // 4️⃣ Kiểm tra thời hạn OTP
    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // 5️⃣ Kiểm tra mã OTP
    if (user.otp.code !== otp) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP code" });
    }

    // 6️⃣ Cập nhật trạng thái xác minh
    user.isEmailVerified = true;
    user.otp = undefined; // Xóa OTP khỏi DB
    await user.save();

    // 7️⃣ Gửi email chào mừng
    const welcomeHtml = generateWelcomeEmailTemplate(user.username);
    sendMail(email, "Welcome to Nagav Inventory!", welcomeHtml);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully!",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// RESEND OTP
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // 1️⃣ Kiểm tra có nhập email không
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    // 2️⃣ Tìm user trong database
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "This email is not registered.",
      });
    }

    // 3️⃣ Kiểm tra user đã xác thực chưa
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "This account is already verified.",
      });
    }

    // 4️⃣ Tạo OTP mới
    const otpCode = generateOTP(); // Ví dụ: 6 số ngẫu nhiên
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    // 5️⃣ Cập nhật lại OTP
    user.otp = {
      code: otpCode,
      expiresAt: otpExpiresAt,
    };
    await user.save();

    // 6️⃣ Gửi email OTP mới
    const emailHtml = generateOTPEmailTemplate(user.username, otpCode, "resend");
    await sendMail(email, "New Verification Code - Nagav Inventory", emailHtml);

    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent. Please check your email.",
    });
  } catch (error) {
    console.error("Error in resendOTP:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while resending the OTP.",
    });
  }
};

// LOGOUT
export const logout = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Xóa refreshToken trong DB
    user.refreshToken = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
