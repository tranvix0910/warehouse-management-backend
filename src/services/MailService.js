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
  host: "smtp-relay.brevo.com",
  port: 2525,     // 👈 ĐỔI TỪ 587 SANG 2525 (Port dự phòng của Brevo, rất quan trọng)
  secure: false,  // false cho port 2525
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  
  // 👇 CẤU HÌNH MẠNG (BẮT BUỘC TRÊN RENDER)
  family: 4,               // Ép dùng IPv4, tránh việc Render bị treo khi tìm đường IPv6
  connectionTimeout: 20000, // Tăng thời gian chờ lên 20s
  greetingTimeout: 20000,
  socketTimeout: 20000,

  logger: true, // Bật log để xem chi tiết
  debug: true,
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Vẫn lỗi kết nối:", error);
  } else {
    console.log("✅ KẾT NỐI THÀNH CÔNG (Port 2525 + IPv4)");
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
