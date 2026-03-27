import express from 'express';
import { aiChat, aiGenerateReport } from '../app/controllers/AIController.js';
import { verifyToken } from '../middlewares/verify.js';

const router = express.Router();

// AI Chatbot - Hỏi đáp ngôn ngữ tự nhiên
router.post('/chat', verifyToken, aiChat);

// AI Auto-Generate Report - Tạo báo cáo tự động
// Query param: ?period=weekly hoặc ?period=monthly
router.get('/report', verifyToken, aiGenerateReport);

export default router;
