import express from 'express';

import {
  register,
  login,
  refreshToken,
  logout,
  verifyOTP,
  resendOTP,
} from '../app/controllers/AuthControllers.js';
import { verifyToken } from '../middlewares/verify.js';
import { validatePassword } from '../middlewares/validatePassword.js';

const router = express.Router();

router.post('/register', validatePassword, register);
router.post('/login', login);
router.post('/refreshToken', refreshToken);
router.post('/logout', verifyToken, logout);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

export default router;
