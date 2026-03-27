import express from 'express';
import {
  createSupplier,
  getAllSuppliers,
  updateSupplier,
  deleteSupplier,
  toggleFavoriteSupplier,
} from '../app/controllers/SupplierController.js';
import { verifyToken } from '../middlewares/verify.js';

const router = express.Router();

router.post('/', verifyToken, createSupplier);
router.get('/', verifyToken, getAllSuppliers);
router.put('/favorite/:id', verifyToken, toggleFavoriteSupplier);
router.put('/:id', verifyToken, updateSupplier);
router.delete('/:id', verifyToken, deleteSupplier);

export default router;
