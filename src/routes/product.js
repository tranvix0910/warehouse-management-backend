import express from "express";
import {
  getAllProducts,
  getSingleProduct,
} from "../app/controllers/ProductController.js";
import { verifyToken } from "../middlewares/verify.js";

const router = express.Router();

router.get("/all", verifyToken, getAllProducts);
router.get("/single/:productId", verifyToken, getSingleProduct);

export default router;
