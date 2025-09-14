import nodemailer from 'nodemailer';

import dotenv from 'dotenv';

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  service: 'Gmail',
  port: 587,
  secure: false, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
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
