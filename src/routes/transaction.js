import express from 'express';
import { createTransaction, getAllTransaction } from '../app/controllers/TransactionController.js';
import { verifyToken } from '../middlewares/verify.js';

const router = express.Router();

router.get('/', verifyToken, getAllTransaction);
router.post('/create', verifyToken, createTransaction);

export default router;
