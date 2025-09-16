import UserModel from '../models/UserModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendMail } from '../../services/MailService.js';
import {
  generateOTPEmailTemplate,
  generateWelcomeEmailTemplate,
} from '../../services/EmailTemplates.js';
import TempUserModel from '../models/TempUserModel.js';


const generateAccessToken = (user) => {
  return jwt.sign({ _id: user._id }, process.env.JWT_ACCESSTOKEN_KEY, {
    expiresIn: '5m',
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ _id: user._id }, process.env.JWT_REFRESHTOKEN_KEY, {
    expiresIn: '365d',
  });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// REGISTER
export const register = async (req, res) => {
  const { email, password, username } = req.body;
  try {
    // Check if user already exists in main database
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email has been used',
      });
    }

    // Check if user already exists in temporary database
    const existingTempUser = await TempUserModel.findOne({ email });
    if (existingTempUser) {
      // Delete existing temp user and create new one
      await TempUserModel.deleteOne({ email });
    }

    // Generate OTP
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Create temporary user in database
    const tempUser = new TempUserModel({
      email,
      username,
      password, // Store plain password temporarily
      otp: {
        code: otpCode,
        expiresAt: otpExpiresAt,
      },
    });

    await tempUser.save();

    // Send OTP email
    const emailHtml = generateOTPEmailTemplate(username, otpCode, false);
    sendMail(email, 'Email Verification - Nagav Inventory', emailHtml);

    return res.status(200).json({
      success: true,
      message: 'Register successfully. Please check your email for verification code.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// LOGIN
export const login = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Email does not exist' });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect password' });
    }

    if (!user.isEmailVerified) {
      return res
        .status(400)
        .json({ success: false, message: 'Please verify your email before logging in' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const { password, ...rest } = user._doc;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
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
      return res.status(401).json({ success: false, message: "You're not authenticated" });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESHTOKEN_KEY, async (err, user) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'RefreshToken is invalid' });
      }

      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      return res.status(200).json({
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// VERIFY OTP
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    // Check if user exists in temporary database
    const tempUser = await TempUserModel.findOne({ email });
    if (!tempUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if OTP exists and is valid
    if (!tempUser.otp || !tempUser.otp.code || !tempUser.otp.expiresAt) {
      return res
        .status(400)
        .json({ success: false, message: 'No OTP found. Please request a new one.' });
    }

    if (new Date() > tempUser.otp.expiresAt) {
      return res
        .status(400)
        .json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (tempUser.otp.code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    // Hash password and create user in main database
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(tempUser.password, salt);

    const newUser = new UserModel({
      email: tempUser.email,
      username: tempUser.username,
      password: hash,
      isEmailVerified: true,
    });

    await newUser.save();

    // Remove from temporary database
    await TempUserModel.deleteOne({ email });

    // Send welcome email
    const welcomeHtml = generateWelcomeEmailTemplate(tempUser.username);
    sendMail(email, 'Welcome to Nagav Inventory!', welcomeHtml);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// RESEND OTP
export const resendOTP = async (req, res) => {
  const { email } = req.body;
  try {
    // Check if user exists in temporary database
    const tempUser = await TempUserModel.findOne({ email });
    if (!tempUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate new OTP
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Update OTP in temporary database
    tempUser.otp = {
      code: otpCode,
      expiresAt: otpExpiresAt,
    };

    await tempUser.save();

    // Send OTP email
    const emailHtml = generateOTPEmailTemplate(tempUser.username, otpCode, true);
    sendMail(email, 'New Verification Code - Nagav Inventory', emailHtml);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully. Please check your email.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// LOGOUT
export const logout = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Xóa refreshToken trong DB
    user.refreshToken = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
