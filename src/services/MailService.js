import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,      // 👉 ĐỔI SANG 465 (SSL)
  secure: true,   // 👉 Bắt buộc true cho port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // 👇 ĐÂY LÀ DÒNG QUAN TRỌNG NHẤT ĐỂ SỬA LỖI TIMEOUT
  family: 4,      // 🛑 Ép buộc dùng IPv4, chặn IPv6 (nguyên nhân gây treo)
  
  // Các cấu hình timeout và log
  logger: true,
  debug: true,
  connectionTimeout: 10000,
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Transporter Verify Error:", error);
  } else {
    console.log("✅ Server is ready to take our messages");
  }
});

export const sendMail = async (to, subject, html) => {
  try {
    const message = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    };
    const result = await transporter.sendMail(message);
    return result;
  } catch (err) {
    console.error("Gửi mail thất bại:", err);
    throw err;
  }
};
