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

// import nodemailer from "nodemailer";
// import dotenv from "dotenv";

// dotenv.config();

// export const transporter = nodemailer.createTransport({
//   host: "smtp-relay.brevo.com",
//   port: 2525,     // 👈 ĐỔI TỪ 587 SANG 2525 (Port dự phòng của Brevo, rất quan trọng)
//   secure: false,  // false cho port 2525
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD,
//   },
  
//   // 👇 CẤU HÌNH MẠNG (BẮT BUỘC TRÊN RENDER)
//   family: 4,               // Ép dùng IPv4, tránh việc Render bị treo khi tìm đường IPv6
//   connectionTimeout: 20000, // Tăng thời gian chờ lên 20s
//   greetingTimeout: 20000,
//   socketTimeout: 20000,

//   logger: true, // Bật log để xem chi tiết
//   debug: true,
// });

// transporter.verify((error, success) => {
//   if (error) {
//     console.error("❌ Vẫn lỗi kết nối:", error);
//   } else {
//     console.log("✅ KẾT NỐI THÀNH CÔNG (Port 2525 + IPv4)");
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

// File: services/emailService.js (hoặc file sendMail của bạn)
import dotenv from "dotenv";
dotenv.config();

// Gửi email bằng Brevo API bằng phương thức HTTP POST
export const sendMail = async (to, subject, html) => {
  const url = "https://api.brevo.com/v3/smtp/email";
  
  const options = {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY, // Lấy API Key từ Render
    },
    body: JSON.stringify({
      sender: { 
        email: process.env.EMAIL_USER, // Email đăng nhập Brevo
        name: "Nagav Inventory"        // Tên hiển thị tùy thích
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html,
    }),
  };

  try {
    console.log(`📨 Đang gửi API tới: ${to}...`);
    const response = await fetch(url, options);
    
    if (!response.ok) {
      // Nếu lỗi thì in chi tiết lỗi ra xem Brevo bảo gì
      const errorDetail = await response.json();
      console.error("❌ Lỗi từ Brevo API:", JSON.stringify(errorDetail, null, 2));
      throw new Error("Gửi mail thất bại");
    }

    const data = await response.json();
    console.log("✅ Gửi thành công! Message ID:", data.messageId);
    return data;

  } catch (error) {
    console.error("❌ Lỗi mạng hoặc code:", error);
    throw error;
  }
};
