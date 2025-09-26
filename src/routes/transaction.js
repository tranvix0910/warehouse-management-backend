import express from 'express';
import {
  createTransaction,
  getAllTransaction,
  deleteTransaction,
  updateTransaction,
} from '../app/controllers/TransactionController.js';
import { verifyToken } from '../middlewares/verify.js';

const router = express.Router();

router.get('/', verifyToken, getAllTransaction);
router.delete('/:id', verifyToken, deleteTransaction);
router.put('/:id', verifyToken, updateTransaction);
router.post('/create', verifyToken, createTransaction);

export default router;
