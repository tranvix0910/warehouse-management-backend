import express from "express";
import multer from "multer";
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
router.post("/create", verifyToken, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size too large. Maximum size is 5MB",
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      // Other errors (e.g., file type validation)
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    // No error, proceed to controller
    next();
  });
}, createProduct);
router.put("/update/:productId", verifyToken, upload.single("image"), updateProduct);
router.delete("/delete/:productId", verifyToken, deleteProduct);

export default router;
