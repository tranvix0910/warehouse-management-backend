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
router.post('/create', verifyToken, createCustomer);
router.put('/favorite/:id', verifyToken, toggleFavoriteCustomer);
router.put('/:id', verifyToken, updateCustomer);
router.delete('/:id', verifyToken, deleteCustomer);

export default router;
