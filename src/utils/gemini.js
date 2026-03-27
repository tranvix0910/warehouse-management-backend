import { GoogleGenerativeAI } from '@google/generative-ai';
import SettingsModel from '../app/models/SettingsModel.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Lấy Gemini API Key theo thứ tự ưu tiên:
 * 1. Từ database (do user cấu hình qua frontend)
 * 2. Từ .env file (fallback)
 */
export const getGeminiApiKey = async () => {
    // Ưu tiên lấy từ database
    const setting = await SettingsModel.findOne({ key: 'GEMINI_API_KEY' });
    if (setting?.value) {
        return setting.value;
    }

    // Fallback: lấy từ .env
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
        return process.env.GEMINI_API_KEY;
    }

    return null;
};

/**
 * Tạo Gemini model instance với API key động
 * Gọi hàm này mỗi lần cần dùng AI (để luôn dùng key mới nhất)
 */
export const getGeminiModel = async () => {
    const apiKey = await getGeminiApiKey();

    if (!apiKey) {
        throw new Error(
            'Gemini API Key chưa được cấu hình. Vui lòng cấu hình API Key trong Settings.'
        );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
};
