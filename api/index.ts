import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables for local/serverless contexts
dotenv.config();

const app = express();
app.use(express.json());

// In-memory OTP store for the duration of the serverless container lifetime
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// Health Check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Stream Hub serverless API is active on Vercel" });
});

// Send Transaction Ticket billing Email
app.post("/api/send-email", async (req, res) => {
  const { email, serviceName, orderId, price, duration } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Recipient email is required" });
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER || "lr4239469@gmail.com";
  const pass = (process.env.SMTP_PASS || "tadajrcewcaimtma").replace(/\s+/g, "");

  const emailSubject = `Stream Hub Confirmation: #${orderId}`;

  const emailTextBody = `Hello,

Thank you for selecting Stream Hub. We have logged your order request.

Order Details:
- Order Reference ID: ${orderId}
- Service: ${serviceName}
- Plan Duration: ${duration || "30 Days"}
- Total Paid: ₹${price}

Best regards,
Lokesh Rathi
Stream Hub Team`;

  const emailHtmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmed</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #fafafa; color: #2d3748; margin: 0; padding: 0; line-height: 1.6; }
        .email-wrapper { width: 100%; background-color: #fafafa; padding: 20px 0; }
        .email-container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #edf2f7; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .email-header { padding: 24px; border-bottom: 1px solid #edf2f7; text-align: center; }
        .email-header h1 { margin: 0; font-size: 18px; font-weight: 700; color: #1a202c; letter-spacing: 0.05em; }
        .email-body { padding: 32px 24px; }
        .greeting { font-size: 15px; color: #2d3748; margin-bottom: 24px; }
        .status-text { font-size: 14px; color: #4a5568; margin-bottom: 16px; }
        .hindi-translation { font-size: 13.5px; color: #718096; background-color: #f7fafc; border-left: 3px solid #cbd5e0; padding: 12px 16px; margin-bottom: 24px; border-radius: 0 4px 4px 0; }
        .receipt-table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px; }
        .receipt-table td { padding: 12px; border-bottom: 1px solid #edf2f7; color: #2d3748; }
        .receipt-table .label-cell { color: #718096; font-weight: 500; }
        .receipt-table .value-cell { text-align: right; font-weight: 600; color: #1a202c; }
        .receipt-table .total-row td { font-weight: 700; color: #1a202c; border-top: 1px solid #cbd5e0; border-bottom: none; background-color: #fffaf0; }
        .action-section { text-align: center; margin: 30px 0 10px 0; }
        .btn-primary { display: inline-block; background-color: #1a202c; color: #ffffff !important; text-decoration: none; padding: 12px 24px; font-weight: 600; font-size: 13px; border-radius: 6px; }
        .email-footer { padding: 20px 24px; background-color: #f7fafc; border-top: 1px solid #edf2f7; text-align: center; font-size: 11px; color: #718096; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="email-container">
          <div class="email-header">
            <h1>STREAM HUB</h1>
          </div>
          <div class="email-body">
            <div class="greeting">
              <p>Hello,</p>
              <p class="status-text">
                Thank you for placing an order with <strong>Stream Hub</strong>! We are currently validating your subscription slot request. It will be activated shortly.
              </p>
            </div>
            <div class="hindi-translation">
              <strong>हिन्दी:</strong> Stream Hub चुनने के लिए धन्यवाद! हमें आपका ऑर्डर प्राप्त हो गया है। हमारे एक्सपर्ट्स आपके ट्रांजेक्शन को सत्यापित कर रहे हैं और जल्द ही आपका प्रीमियम सब्सक्रिप्शन सक्रिय कर दिया जाएगा।
            </div>
            <table class="receipt-table">
              <tr>
                <td class="label-cell">Order ID:</td>
                <td class="value-cell" style="font-family: monospace;">${orderId}</td>
              </tr>
              <tr>
                <td class="label-cell">Premium Service:</td>
                <td class="value-cell">${serviceName}</td>
              </tr>
              <tr>
                <td class="label-cell">Plan Duration:</td>
                <td class="value-cell">${duration || "30 Days"}</td>
              </tr>
              <tr class="total-row">
                <td class="label-cell" style="color: #1a202c;">Total Amount Paid:</td>
                <td class="value-cell" style="color: #1a202c;">₹${price}</td>
              </tr>
            </table>
            <div class="action-section">
              <a href="https://wa.me/919024885265?text=Hello%20Stream%20Hub!%20I%20have%20purchased%20${encodeURIComponent(serviceName)}%20(ID:%20${orderId}).%20Please%20verify." class="btn-primary" target="_blank">
                💬 Share Screenshot on WhatsApp
              </a>
            </div>
          </div>
          <div class="email-footer">
            <p>This is a secure transactional receipt regarding your Stream Hub request.</p>
            <p>&copy; 2026 Stream Hub. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });

      await transporter.sendMail({
        from: `"Lokesh Rathi" <${user}>`,
        to: email,
        subject: emailSubject,
        text: emailTextBody,
        html: emailHtmlBody
      });

      return res.json({ success: true, channel: "SMTP", message: "Real transaction email sent successfully" });
    } catch (smtpError: any) {
      console.error("SMTP error in serverless function:", smtpError);
      return res.json({ success: false, channel: "SMTP_FAILED", error: smtpError.message });
    }
  } else {
    return res.status(405).json({ success: false, message: "SMTP configuration parameters missing" });
  }
});

// Send Verification OTP
app.post("/api/auth/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email ID is required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  otpStore.set(cleanEmail, { otp, expiresAt });

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER || "lr4239469@gmail.com";
  const pass = (process.env.SMTP_PASS || "tadajrcewcaimtma").replace(/\s+/g, "");

  if (!user || !pass) {
    return res.status(400).json({
      success: false,
      error: "SMTP NOT CONFIGURED"
    });
  }

  const emailSubject = "Your Stream Hub Verification Code";
  const emailHtmlBody = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: sans-serif; background-color: #fafafa; padding: 20px;">
      <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #edf2f7; border-radius: 12px; padding: 28px;">
        <h2 style="text-align: center; color: #1a202c; border-bottom: 1px solid #edf2f7; padding-bottom: 18px;">STREAM HUB</h2>
        <p>Thank you for choosing Stream Hub! Your requested 6-digit verification code is:</p>
        <div style="background-color: #f7fafc; border: 1px dashed #cbd5e0; border-radius: 10px; padding: 18px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 0.2rem; color: #4f46e5; margin: 24px 0;">
          ${otp}
        </div>
        <p style="font-size: 13px; color: #718096;">This security code is single-use, valid for exactly 10 minutes, and should not be shared.</p>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    await transporter.sendMail({
      from: `"Stream Hub Security" <${user}>`,
      to: cleanEmail,
      subject: emailSubject,
      html: emailHtmlBody
    });

    return res.json({ success: true, message: "OTP sent successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: `Failed to deliver email: ${error.message}` });
  }
});

// Verify Verification OTP
app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email ID and OTP are required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const record = otpStore.get(cleanEmail);

  if (!record) {
    return res.status(400).json({ error: "No OTP was requested for this email address" });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanEmail);
    return res.status(400).json({ error: "OTP has expired" });
  }

  if (record.otp !== otp.trim()) {
    return res.status(400).json({ error: "Invalid OTP code" });
  }

  otpStore.delete(cleanEmail);
  return res.json({ success: true, message: "OTP verified successfully" });
});

export default app;
