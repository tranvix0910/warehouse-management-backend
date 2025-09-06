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
    return {
      folder: "waterhouse_management/products", // Folder chứa ảnh sản phẩm
      resource_type: "image", // chỉ lưu image
      use_filename: true, // giữ nguyên tên file gốc
      unique_filename: false, // không thêm chuỗi random
      public_id: file.originalname.split(".")[0], // giữ nguyên tên (bỏ phần đuôi mở rộng)
    };
  },
}); 

// Middleware upload
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
  },
});


