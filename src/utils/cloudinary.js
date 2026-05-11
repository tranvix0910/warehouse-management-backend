// utils/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Validate Cloudinary credentials
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error("❌ Missing Cloudinary credentials!");
  console.error("CLOUDINARY_CLOUD_NAME:", cloudName ? "✓" : "✗");
  console.error("CLOUDINARY_API_KEY:", apiKey ? "✓" : "✗");
  console.error("CLOUDINARY_API_SECRET:", apiSecret ? "✓" : "✗");
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true, // Use HTTPS
});

// Test connection on startup
cloudinary.api.ping()
  .then(() => console.log("✅ Cloudinary connected successfully"))
  .catch((err) => {
    console.error("❌ Cloudinary connection failed:", err.message);
    console.error("Please check your Cloudinary credentials and account status");
  });

export default cloudinary;
