export const generateOTPEmailTemplate = (username, otpCode, isResend = false) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - Nagav Inventory</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f5f5f5;
                line-height: 1.6;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                letter-spacing: -0.5px;
            }
            .header p {
                margin: 10px 0 0 0;
                font-size: 16px;
                opacity: 0.9;
            }
            .content {
                padding: 40px 30px;
                text-align: center;
            }
            .greeting {
                font-size: 18px;
                color: #333333;
                margin-bottom: 20px;
            }
            .message {
                font-size: 16px;
                color: #666666;
                margin-bottom: 30px;
                line-height: 1.6;
            }
            .otp-container {
                background: linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%);
                border: 2px solid #4A90E2;
                border-radius: 16px;
                padding: 30px;
                margin: 30px 0;
                position: relative;
            }
            .otp-container::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(135deg, #4A90E2, #357ABD);
                border-radius: 16px;
                z-index: -1;
            }
            .otp-label {
                font-size: 14px;
                color: #4A90E2;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 15px;
            }
            .otp-code {
                font-size: 36px;
                font-weight: 700;
                color: #4A90E2;
                letter-spacing: 8px;
                margin: 0;
                font-family: 'Courier New', monospace;
                text-shadow: 0 2px 4px rgba(74, 144, 226, 0.2);
            }
            .expiry-info {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
                font-size: 14px;
            }
            .expiry-info strong {
                color: #d63031;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e9ecef;
            }
            .footer p {
                margin: 0 0 10px 0;
                color: #6c757d;
                font-size: 14px;
            }
            .footer .brand {
                color: #4A90E2;
                font-weight: 600;
                font-size: 16px;
            }
            .security-note {
                background-color: #e8f5e8;
                border-left: 4px solid #28a745;
                padding: 15px;
                margin: 20px 0;
                border-radius: 0 8px 8px 0;
            }
            .security-note p {
                margin: 0;
                color: #155724;
                font-size: 14px;
            }
            .divider {
                height: 1px;
                background: linear-gradient(90deg, transparent, #e9ecef, transparent);
                margin: 30px 0;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 8px;
                }
                .header, .content, .footer {
                    padding: 20px;
                }
                .otp-code {
                    font-size: 28px;
                    letter-spacing: 4px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📧 Email Verification</h1>
                <p>Nagav Inventory Management System</p>
            </div>
            
            <div class="content">
                <div class="greeting">
                    Hello <strong>${username}</strong>! 👋
                </div>
                
                <div class="message">
                    ${
                      isResend
                        ? 'Here is your new verification code to complete your account setup:'
                        : 'Thank you for registering with Nagav Inventory! Please verify your email address to activate your account:'
                    }
                </div>
                
                <div class="otp-container">
                    <div class="otp-label">Your Verification Code</div>
                    <div class="otp-code">${otpCode}</div>
                </div>
                
                <div class="expiry-info">
                    ⏰ <strong>Important:</strong> This code will expire in <strong>5 minutes</strong> for security reasons.
                </div>
                
                <div class="security-note">
                    <p>🔒 <strong>Security Notice:</strong> Never share this code with anyone. Our team will never ask for your verification code.</p>
                </div>
                
                <div class="divider"></div>
                
                <div class="message">
                    Simply enter this code in the verification screen to complete your registration and start managing your inventory!
                </div>
            </div>
            
            <div class="footer">
                <p>If you didn't request this verification code, please ignore this email.</p>
                <p>This is an automated message, please do not reply to this email.</p>
                <div class="brand">🏢 Nagav Inventory Management</div>
            </div>
        </div>
    </body>
    </html>
  `;
};

export const generateWelcomeEmailTemplate = (username) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Nagav Inventory</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f5f5f5;
                line-height: 1.6;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                letter-spacing: -0.5px;
            }
            .content {
                padding: 40px 30px;
                text-align: center;
            }
            .greeting {
                font-size: 24px;
                color: #333333;
                margin-bottom: 20px;
            }
            .message {
                font-size: 16px;
                color: #666666;
                margin-bottom: 30px;
                line-height: 1.6;
            }
            .features {
                text-align: left;
                margin: 30px 0;
            }
            .feature-item {
                display: flex;
                align-items: center;
                margin: 15px 0;
                padding: 10px;
                background-color: #f8f9fa;
                border-radius: 8px;
            }
            .feature-icon {
                font-size: 24px;
                margin-right: 15px;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e9ecef;
            }
            .footer p {
                margin: 0 0 10px 0;
                color: #6c757d;
                font-size: 14px;
            }
            .footer .brand {
                color: #28a745;
                font-weight: 600;
                font-size: 16px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to Nagav Inventory!</h1>
            </div>
            
            <div class="content">
                <div class="greeting">
                    Hello <strong>${username}</strong>! 👋
                </div>
                
                <div class="message">
                    Congratulations! Your email has been successfully verified and your account is now active.
                </div>
                
                <div class="features">
                    <div class="feature-item">
                        <span class="feature-icon">📦</span>
                        <span>Track your inventory in real-time</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">📊</span>
                        <span>Generate detailed reports and analytics</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">👥</span>
                        <span>Manage your team and permissions</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">🔔</span>
                        <span>Get alerts for low stock and important updates</span>
                    </div>
                </div>
                
                <div class="message">
                    You can now log in to your account and start managing your inventory efficiently!
                </div>
            </div>
            
            <div class="footer">
                <p>Thank you for choosing Nagav Inventory Management System.</p>
                <div class="brand">🏢 Nagav Inventory Management</div>
            </div>
        </div>
    </body>
    </html>
  `;
};
