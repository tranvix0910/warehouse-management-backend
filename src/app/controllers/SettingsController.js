import SettingsModel from '../models/SettingsModel.js';
import UserModel from '../models/UserModel.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mask API key cho bảo mật (chỉ hiện 4 ký tự cuối)
const maskApiKey = (key) => {
    if (!key || key.length <= 4) return '****';
    return '*'.repeat(key.length - 4) + key.slice(-4);
};

// ============================================================
// GET - Lấy cấu hình Gemini API Key (đã mask)
// ============================================================
export const getGeminiConfig = async (req, res) => {
    const userId = req.user._id;

    try {
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const setting = await SettingsModel.findOne({ key: 'GEMINI_API_KEY' });

        return res.status(200).json({
            success: true,
            message: 'Get Gemini config success',
            data: {
                isConfigured: !!setting?.value,
                apiKey: setting ? maskApiKey(setting.value) : null,
                updatedAt: setting?.updatedAt || null,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================
// PUT - Cập nhật Gemini API Key
// ============================================================
export const updateGeminiConfig = async (req, res) => {
    const userId = req.user._id;
    const { apiKey } = req.body;

    try {
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!apiKey || apiKey.trim() === '') {
            return res
                .status(400)
                .json({ success: false, message: 'API Key is required' });
        }

        // Validate API key bằng cách thử gọi Gemini
        try {
            const testGenAI = new GoogleGenerativeAI(apiKey.trim());
            const testModel = testGenAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            await testModel.generateContent('Hello');
        } catch (validationError) {
            console.error('Gemini Validation Error:', validationError);
            return res.status(400).json({
                success: false,
                message: 'Invalid API Key. Error: ' + validationError.message,
            });
        }

        // Lưu hoặc cập nhật API key vào database
        const setting = await SettingsModel.findOneAndUpdate(
            { key: 'GEMINI_API_KEY' },
            {
                key: 'GEMINI_API_KEY',
                value: apiKey.trim(),
                description: 'Google Gemini API Key for AI features',
            },
            { upsert: true, new: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Gemini API Key configured successfully',
            data: {
                isConfigured: true,
                apiKey: maskApiKey(setting.value),
                updatedAt: setting.updatedAt,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================
// DELETE - Xóa Gemini API Key
// ============================================================
export const deleteGeminiConfig = async (req, res) => {
    const userId = req.user._id;

    try {
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await SettingsModel.findOneAndDelete({ key: 'GEMINI_API_KEY' });

        return res.status(200).json({
            success: true,
            message: 'Gemini API Key removed successfully',
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
