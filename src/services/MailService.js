import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Tạo transporter với Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify transporter khi khởi động
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Lỗi kết nối Gmail:", error);
  } else {
    console.log("✅ Gmail SMTP sẵn sàng gửi mail");
  }
});

export const sendMail = async (to, subject, html) => {
  const mailOptions = {
    from: {
      name: "Nagav Inventory",
      address: process.env.EMAIL_USER,
    },
    to: to,
    subject: subject,
    html: html,
  };

  try {
    console.log(`📨 Đang gửi email tới: ${to}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Gửi email thành công! Message ID:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Lỗi gửi email:", error.message);
    throw new Error(`Gửi mail thất bại: ${error.message}`);
  }
};
