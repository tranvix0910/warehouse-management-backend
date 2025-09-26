import express from 'express';

import { verifyToken } from '../middlewares/verify.js';
import {
  getReportSummary,
  getLowStock,
  getOldStock,
  getOutOfStock,
} from '../app/controllers/ReportController.js';

const router = express.Router();

router.get('/summary', verifyToken, getReportSummary);
router.get('/old-stock', verifyToken, getOldStock);
router.get('/out-of-stock', verifyToken, getOutOfStock);
router.get('/low-stock', verifyToken, getLowStock);

export default router;
