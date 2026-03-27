import express from 'express';
import {
    getGeminiConfig,
    updateGeminiConfig,
    deleteGeminiConfig,
} from '../app/controllers/SettingsController.js';
import { verifyToken } from '../middlewares/verify.js';

const router = express.Router();

// Gemini API Key configuration
router.get('/gemini', verifyToken, getGeminiConfig);
router.put('/gemini', verifyToken, updateGeminiConfig);
router.delete('/gemini', verifyToken, deleteGeminiConfig);

export default router;
