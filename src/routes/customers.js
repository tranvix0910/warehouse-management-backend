import express from 'express';

import {
  createCustomer,
  getAllCustomers,
  toggleFavoriteCustomer,
  deleteCustomer,
  updateCustomer,
} from '../app/controllers/CustomerController.js';
import { verifyToken } from '../middlewares/verify.js';

const router = express.Router();

router.get('/', verifyToken, getAllCustomers);
router.put('/:id', verifyToken, updateCustomer);
router.delete('/:id', verifyToken, deleteCustomer);
router.post('/create', verifyToken, createCustomer);
router.put('/favorite/:id', verifyToken, toggleFavoriteCustomer);

export default router;
