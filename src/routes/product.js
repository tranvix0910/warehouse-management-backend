import express from "express";
import {
  getAllProducts,
  getSingleProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../app/controllers/ProductController.js";
import { verifyToken } from "../middlewares/verify.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

router.get("/all", verifyToken, getAllProducts);
router.get("/single/:productId", verifyToken, getSingleProduct);
router.post("/create", verifyToken, upload.single("image"), createProduct);
router.put("/update/:productId", verifyToken, upload.single("image"), updateProduct);
router.delete("/delete/:productId", verifyToken, deleteProduct);

export default router;
