import dotenv from "dotenv";
dotenv.config();

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
    console.log("✅ Gửi thành công !!");
    return data;

  } catch (error) {
    console.error("❌ Lỗi mạng hoặc code:", error);
    throw error;
  }
};

// Không cần hàm verify hay transporter nữa!
