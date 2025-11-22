// import nodemailer from "nodemailer";
// import dotenv from "dotenv";

// dotenv.config();

// export const transporter = nodemailer.createTransport({
//   host: "smtp-relay.brevo.com",
//   port: 587,      // 👉 ĐỔI SANG 465 (SSL)
//   secure: true,   // 👉 Bắt buộc true cho port 465
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD,
//   },
// });

// transporter.verify((error, success) => {
//   if (error) {
//     console.error("❌ Transporter Verify Error:", error);
//   } else {
//     console.log("✅ Server is ready to take our messages");
//   }
// });

// export const sendMail = async (to, subject, html) => {
//   try {
//     const message = {
//       from: process.env.EMAIL_USER,
//       to,
//       subject,
//       html,
//     };
//     const result = await transporter.sendMail(message);
//     return result;
//   } catch (err) {
//     console.error("Gửi mail thất bại:", err);
//     throw err;
//   }
// };

import nodemailer from "nodemailer";

import dotenv from "dotenv";

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  service: "Gmail",
  port: 587,
  secure: false, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    ciphers: "SSLv3", // Giúp tương thích tốt hơn
    rejectUnauthorized: false, // Bỏ qua lỗi chứng chỉ (nếu có)
  },
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
