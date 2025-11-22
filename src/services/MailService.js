import nodemailer from "nodemailer";

import dotenv from "dotenv";

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  service: "Gmail",
  port: 465,
  secure: true, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  family: 4,       // Ép dùng IPv4 (Chìa khóa sửa lỗi Timeout)
  logger: true,    // Bật log để xem chi tiết
  debug: true,     // Bật debug
  tls: {
    ciphers: "SSLv3", // Giúp tương thích tốt hơn
    rejectUnauthorized: false, // Bỏ qua lỗi chứng chỉ (nếu có)
  },
  connectionTimeout: 10000, // Tăng thời gian chờ kết nối lên 10s (mặc định là 2s)
  greetingTimeout: 10000, // Tăng thời gian chờ Google chào hỏi
  socketTimeout: 10000,
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Transporter Verify Error:", error);
  } else {
    console.log("✅ Server is ready to take our messages");
  }
});

export const sendMail = async (to, subject, html) => {
  const message = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  };
  const result = await transporter.sendMail(message);
  return result;
};
