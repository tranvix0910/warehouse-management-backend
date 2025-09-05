import express from "express";
import {
  getAllProducts,
  getSingleProduct,
  createProduct,
} from "../app/controllers/ProductController.js";
import { verifyToken } from "../middlewares/verify.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

router.get("/all", verifyToken, getAllProducts);
router.get("/single/:productId", verifyToken, getSingleProduct);
router.post("/create", upload.single("image"), verifyToken, createProduct);

export default router;
