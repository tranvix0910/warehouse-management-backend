import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";

// Lưu ảnh sản phẩm vào Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    if (!file.mimetype.startsWith("image/")) {
      throw new Error("Only image files are allowed!");
    }
    
    // Validate Cloudinary is configured
    if (!cloudinary.config().cloud_name) {
      throw new Error("Cloudinary is not configured properly. Please check environment variables.");
    }
    
    return {
      folder: "waterhouse_management/products", // Folder chứa ảnh sản phẩm
      resource_type: "image", // chỉ lưu image
      use_filename: true, // giữ nguyên tên file gốc
      unique_filename: true, // thêm chuỗi random để tránh trùng lặp
      public_id: file.originalname.split(".")[0], // giữ nguyên tên (bỏ phần đuôi mở rộng)
      transformation: [{ width: 1000, height: 1000, crop: "limit" }], // Optimize image size
    };
  },
}); 

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Middleware upload
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
  },
});


