import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, deleteDoc, query, where, serverTimestamp as firestoreServerTimestamp } from "firebase/firestore";

// Load environment variables
dotenv.config();

// Firebase configuration for both client and server connection
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyCbfJN0YwcS_Gd5-rY5mJ1nsA0Uy1arwgA",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "double-composition-667s8.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "double-composition-667s8",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "double-composition-667s8.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "158055240353",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:158055240353:web:fe2c28baad710109f6d6e0"
};

let serverApp: any;
let serverDb: any;
let isDbReady = false;

try {
  if (getApps().length === 0) {
    serverApp = initializeApp(firebaseConfig);
  } else {
    serverApp = getApp();
  }
  serverDb = getFirestore(serverApp, "ai-studio-b37509cf-5a5d-4dd7-be69-7e2538cd2dc8");
  isDbReady = true;
  console.log("[Backend Firebase] Connected server-side successfully to Firestore: ID ai-studio-b37509cf-5a5d-4dd7-be69-7e2538cd2dc8");
} catch (err) {
  console.warn("[Backend Firebase] Lazy initializing server-side connection skipped/failed:", err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parse JSON payloads
  app.use(express.json());

  // API routes first
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Stream Hub server is active" });
  });

  // API endpoint to send a "Thank you for purchasing" transactional email
  app.post("/api/send-email", async (req, res) => {
    const { email, serviceName, orderId, price, duration } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Recipient email is required" });
    }

    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER || "lr4239469@gmail.com";
    const pass = (process.env.SMTP_PASS || "tadajrcewcaimtma").replace(/\s+/g, "");

    // Use a clean, non-spammy subject line
    const emailSubject = `Stream Hub Confirmation: #${orderId}`;

    // Simple text version to satisfy spam filters (MIME completeness)
    const emailTextBody = `Hello,

Thank you for selecting Stream Hub. We have logged your order request.

Order Details:
- Order Reference ID: ${orderId}
- Service: ${serviceName}
- Plan Duration: ${duration || "30 Days"}
- Total Paid: ₹${price}

हिन्दी: Stream Hub चुनने के लिए धन्यवाद! हमें आपका ऑर्डर प्राप्त हो गया है। हमारे एक्सपर्ट्स आपके ट्रांजेक्शन को सत्यापित कर रहे हैं और जल्द ही आपका प्रीमियम सब्सक्रिप्शन सक्रिय कर दिया जाएगा।

Please share your payment screenshot on our customer support WhatsApp link to speed up activation:
https://wa.me/919024885265?text=Hello%20Stream%20Hub!%20I%20have%20purchased%20${encodeURIComponent(serviceName)}%20(ID:%20${orderId}).%20Please%20verify.

If you have any questions, feel free to reply directly to this email.

Best regards,
Lokesh Rathi
Stream Hub Team`;

    // Extremely clean, professional and lightweight HTML design
    const emailHtmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmed</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #fafafa;
            color: #2d3748;
            margin: 0;
            padding: 0;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
          }
          .email-wrapper {
            width: 100%;
            background-color: #fafafa;
            padding: 20px 0;
          }
          .email-container {
            max-width: 580px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #edf2f7;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          }
          .email-header {
            padding: 24px;
            border-bottom: 1px solid #edf2f7;
            text-align: center;
          }
          .email-header h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 700;
            color: #1a202c;
            letter-spacing: 0.05em;
          }
          .email-body {
            padding: 32px 24px;
          }
          .greeting {
            font-size: 15px;
            color: #2d3748;
            margin-bottom: 24px;
          }
          .status-text {
            font-size: 14px;
            color: #4a5568;
            margin-bottom: 16px;
          }
          .hindi-translation {
            font-size: 13.5px;
            color: #718096;
            background-color: #f7fafc;
            border-left: 3px solid #cbd5e0;
            padding: 12px 16px;
            margin-bottom: 24px;
            border-radius: 0 4px 4px 0;
          }
          .receipt-table {
            width: 100%;
            border-collapse: collapse;
            margin: 24px 0;
            font-size: 14px;
          }
          .receipt-table td {
            padding: 12px;
            border-bottom: 1px solid #edf2f7;
            color: #2d3748;
          }
          .receipt-table .label-cell {
            color: #718096;
            font-weight: 500;
          }
          .receipt-table .value-cell {
            text-align: right;
            font-weight: 600;
            color: #1a202c;
          }
          .receipt-table .total-row td {
            font-weight: 700;
            color: #1a202c;
            border-top: 1px solid #cbd5e0;
            border-bottom: none;
            background-color: #fffaf0;
          }
          .action-section {
            text-align: center;
            margin: 30px 0 10px 0;
          }
          .btn-primary {
            display: inline-block;
            background-color: #1a202c;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            font-weight: 600;
            font-size: 13px;
            border-radius: 6px;
            transition: background-color 0.2s ease;
          }
          .email-footer {
            padding: 20px 24px;
            background-color: #f7fafc;
            border-top: 1px solid #edf2f7;
            text-align: center;
            font-size: 11px;
            color: #718096;
          }
          .email-footer p {
            margin: 4px 0;
          }
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

              <h2 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #4a5568; margin-bottom: 10px;">
                Order Receipt Summary
              </h2>

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
                <p style="font-size: 13px; margin-bottom: 14px; color: #4a5568;">
                  Please send your payment screenshot to our customer support on WhatsApp to finalize activation:
                </p>
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

    // Try utilizing registered SMTP configuration
    if (host && user && pass) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: {
            user,
            pass
          }
        });

        const mailOptions = {
          from: `"Lokesh Rathi" <${user}>`,
          to: email,
          subject: emailSubject,
          text: emailTextBody,
          html: emailHtmlBody,
          headers: {
            "List-Unsubscribe": `<mailto:${user}?subject=unsubscribe>`,
            "X-Auto-Response-Suppress": "OOF, AutoReply",
            "X-Priority": "3",
            "X-MSMail-Priority": "Normal",
            "Importance": "Normal"
          }
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[SMTP] Success! Thank-you email sent to ${email}. Message ID: ${info.messageId}`);
        return res.json({ 
          success: true, 
          channel: "SMTP", 
          message: `Real transaction email delivered successfully to ${email}.` 
        });

      } catch (smtpError: any) {
        console.error("[SMTP] Error sending via configured SMTP server:", smtpError);
        return res.json({ 
          success: false, 
          channel: "SMTP_FAILED", 
          error: smtpError.message,
          message: "Attempted real SMTP delivery but server failed to send. Check SMTP credentials."
        });
      }
    } else {
      console.log(`\n========================================================`);
      console.log(`⚠️  [REAL DISPATCH REJECTED] SMTP credentials are not set in the environment variables!`);
      console.log(`📧  Target recipient: ${email}`);
      console.log(`========================================================\n`);

      return res.status(400).json({
        success: false,
        channel: "NOT_CONFIGURED",
        message: "SMTP server environment parameters are missing. Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS in your variables."
      });
    }
  });

  // In-memory OTP store
  const otpStore = new Map<string, { otp: string; expiresAt: number }>();

  // API endpoint to send a verification OTP via email
  app.post("/api/auth/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email ID is required (ईमेल आईडी आवश्यक है)" });
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Generate a high-quality 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes valid

    otpStore.set(cleanEmail, { otp, expiresAt });
    console.log(`[OTP Engine] Generated OTP for ${cleanEmail}: ${otp}`);

    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER || "lr4239469@gmail.com";
    const pass = (process.env.SMTP_PASS || "tadajrcewcaimtma").replace(/\s+/g, "");

    if (!user || !pass) {
      console.error("[OTP Engine] SMTP credentials are not set in .env or Settings!");
      return res.status(400).json({
        success: false,
        error: "SMTP NOT CONFIGURED",
        message: "SMTP credentials are not configured in settings. Please configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in settings to send OTP to Gmail inbox. (एमटीएमपी कॉन्फ़िगरेशन नहीं मिला। कृपया सेटिंग्स में SMTP_USER और SMTP_PASS सेट करें ताकि जीमेल इनबॉक्स पर ओटीपी भेजा जा सके।)"
      });
    }

    const emailSubject = "Your Stream Hub Verification Code";
    const emailTextBody = `Hello,

Thank you for choosing Stream Hub! 

Your requested 6-digit verification security code is: ${otp}

Please enter this verification key in your Stream Hub window to complete secure account authentication. For security, this single-use code is valid for exactly 10 minutes and should not be shared.

यह कोड 10 मिनट के लिए वैध है। सुरक्षा कारणों से कृपया इसे किसी के साथ साझा न करें।

Regards,
Stream Hub Team`;

    const emailHtmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Stream Hub Security Code</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; color: #2d3748; padding: 20px; margin: 0; line-height: 1.6;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #edf2f7; border-radius: 12px; padding: 28px; box-shadow: 0 4px 6px rgba(0,0,0,0.01);">
          <div style="text-align: center; border-bottom: 1px solid #edf2f7; padding-bottom: 18px; margin-bottom: 24px;">
            <h1 style="font-size: 22px; font-weight: 700; color: #1a202c; margin: 0; letter-spacing: 0.05em;">STREAM HUB</h1>
          </div>
          <div style="font-size: 14.5px; color: #4a5568; margin-bottom: 20px;">
            <p style="margin: 0 0 12px 0;">नमस्ते / Hello,</p>
            <p style="margin: 0 0 16px 0;">Thank you for selecting <strong>Stream Hub</strong>! Please use the secure login confirmation code below to authenticate your registration:</p>
          </div>
          <div style="background-color: #f7fafc; border: 1px dashed #cbd5e0; border-radius: 10px; padding: 18px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 0.2em; color: #4f46e5; margin: 24px 0; font-family: 'Courier New', Courier, monospace;">
            ${otp}
          </div>
          <div style="font-size: 13.5px; color: #718096; line-height: 1.6;">
            <p style="margin: 0 0 8px 0; color: #4a5568; font-weight: 500;">यह कोड 10 मिनट के लिए वैध है। कृपया इसे किसी के साथ साझा न करें।</p>
            <p style="margin: 0 0 16px 0;">This security code will expire in 10 minutes. Please do not forward or share this email.</p>
          </div>
          <div style="margin-top: 32px; text-align: center; font-size: 11.5px; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 20px; line-height: 1.5;">
            <p style="margin: 0 0 4px 0;">Secure transaction transmitted automatically on behalf of Stream Hub.</p>
            <p style="margin: 0;">&copy; 2026 Stream Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass
        }
      });

      // Generate a high priority, authentic SMTP Message-ID resembling normal system dispatches
      const cleanMessageId = `<auth_verification_${Date.now()}_${Math.random().toString(36).substring(2, 11)}@gmail.com>`;

      await transporter.sendMail({
        from: `"Stream Hub Security" <${user}>`,
        to: cleanEmail,
        subject: emailSubject,
        text: emailTextBody,
        html: emailHtmlBody,
        headers: {
          "Message-ID": cleanMessageId,
          "X-Priority": "1 (Highest)",
          "X-MSMail-Priority": "High",
          "Importance": "High",
          "Priority": "urgent",
          "X-Entity-Ref-ID": `security_verify_${Date.now()}`
        }
      });

      console.log(`[OTP Engine] Real verification email successfully sent to ${cleanEmail}`);
      return res.json({
        success: true,
        message: "OTP sent successfully to your email. (ओटीपी सफलतापूर्वक भेजा गया है।)"
      });
    } catch (error: any) {
      console.error("[OTP Engine] SMTP delivery error:", error);
      return res.status(500).json({
        success: false,
        message: `Failed to deliver real email OTP: ${error.message}. Please review your SMTP configurations in Settings.`
      });
    }
  });

  // API endpoint to verify the email OTP
  app.post("/api/auth/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email ID and OTP are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = otpStore.get(cleanEmail);

    if (!record) {
      return res.status(400).json({ error: "No OTP was requested for this email address. Please send OTP first. (इस ईमेल के लिए कोई ओटीपी अनुरोध नहीं मिला।)" });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ error: "OTP expired. Please try requesting a new OTP. (ओटीपी की समय सीमा समाप्त हो गई है। कृपया पुनः प्रयास करें।)" });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ error: "Invalid OTP code. Please try again. (गलत ओटीपी। कृपया सही ओटीपी दर्ज करें।)" });
    }

    // OTP verified successfully! Clear it from memory to prevent reuse.
    otpStore.delete(cleanEmail);

    return res.json({
      success: true,
      message: "OTP verified successfully. (ओटीपी सत्यापित हो गया है।)"
    });
  });

  // =========================================================================
  // UNIFIED SECURE BACKEND CONNECTED FIREBASE SERVICES (FOR MULTI-PLATFORM)
  // =========================================================================

  const FALLBACK_SETTINGS = {
    whatsappNumber: "919024885265",
    qrCodeUrl: "https://cdn.imageurlgenerator.com/uploads/b078839e-9a1c-45ee-9438-b4e5da61c61a.jpg",
    upiId: "lr4239469@okaxis",
    bannerText: "🎉 Special Discount: Share your payment screenshot on WhatsApp for instant 5-minute activation!",
    showBanner: true,
  };

  // GET Settings configuration
  app.get("/api/settings", async (req, res) => {
    if (!isDbReady) {
      return res.json(FALLBACK_SETTINGS);
    }
    try {
      const docRef = doc(serverDb, "settings", "config");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return res.json({
          whatsappNumber: data.whatsappNumber || FALLBACK_SETTINGS.whatsappNumber,
          qrCodeUrl: data.qrCodeUrl || FALLBACK_SETTINGS.qrCodeUrl,
          upiId: data.upiId || FALLBACK_SETTINGS.upiId,
          bannerText: data.bannerText || FALLBACK_SETTINGS.bannerText,
          showBanner: data.showBanner !== undefined ? data.showBanner : FALLBACK_SETTINGS.showBanner,
        });
      } else {
        // Bootstrap base settings doc in background if missing
        try {
          await setDoc(docRef, { ...FALLBACK_SETTINGS, createdAt: new Date() });
        } catch (dbErr) {
          console.warn("[Backend Settings] Could not bootstrap default, bypassing:", dbErr);
        }
        return res.json(FALLBACK_SETTINGS);
      }
    } catch (err: any) {
      console.warn("[Backend Settings] Firestore fetch error, returning local fallbacks:", err.message);
      return res.json(FALLBACK_SETTINGS);
    }
  });

  // POST Settings configuration
  app.post("/api/settings", async (req, res) => {
    if (!isDbReady) {
      return res.status(500).json({ error: "Backend Firebase database service is not available." });
    }
    try {
      const settingsObj = req.body;
      const docRef = doc(serverDb, "settings", "config");
      await setDoc(docRef, {
        ...settingsObj,
        updatedAt: new Date()
      }, { merge: true });
      return res.json({ success: true, message: "Global configurations saved successfully in Firebase" });
    } catch (err: any) {
      console.error("[Backend Settings] Error writing settings to Firestore:", err);
      return res.status(500).json({ error: err.message || "Failed to update configurations" });
    }
  });

  // GET Catalog subscription services list
  app.get("/api/services", async (req, res) => {
    if (!isDbReady) {
      return res.status(503).json({ error: "Database not connected" });
    }
    try {
      const colRef = collection(serverDb, "services");
      const snap = await getDocs(colRef);
      const list: any[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data
        });
      });
      return res.json(list);
    } catch (err: any) {
      console.error("[Backend Services] Fetching subscription catalog collapsed:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch catalog subscription list" });
    }
  });

  // POST Create/Save Catalog subscription service
  app.post("/api/services", async (req, res) => {
    if (!isDbReady) {
      return res.status(503).json({ error: "Database not connected" });
    }
    try {
      const serviceObj = req.body;
      if (!serviceObj.id) {
        return res.status(400).json({ error: "Missing subscription item profile ID" });
      }
      const docRef = doc(serverDb, "services", serviceObj.id);
      await setDoc(docRef, {
        ...serviceObj,
        updatedAt: new Date()
      }, { merge: true });
      return res.json({ success: true, message: `Sub-service ${serviceObj.id} saved in backup catalogs` });
    } catch (err: any) {
      console.error("[Backend Services] Error creating catalogs catalog item:", err);
      return res.status(500).json({ error: err.message || "Failed to create subscription services" });
    }
  });

  // DELETE Catalog subscription service
  app.delete("/api/services/:id", async (req, res) => {
    if (!isDbReady) {
      return res.status(503).json({ error: "Database not connected" });
    }
    try {
      const serviceId = req.params.id;
      const docRef = doc(serverDb, "services", serviceId);
      await deleteDoc(docRef);
      return res.json({ success: true, message: `Service ${serviceId} deleted successfully` });
    } catch (err: any) {
      console.error("[Backend Services] Deletion of subscription catalog item collapsed:", err);
      return res.status(500).json({ error: err.message || "Failed to delete subscription card" });
    }
  });

  // GET User-specific or All Active Orders
  app.get("/api/orders", async (req, res) => {
    if (!isDbReady) {
      return res.json([]);
    }
    const { userId } = req.query;
    try {
      const colRef = collection(serverDb, "orders");
      let q = colRef;
      if (userId) {
        q = query(colRef, where("userId", "==", userId)) as any;
      }
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data
        });
      });
      return res.json(list);
    } catch (err: any) {
      console.error("[Backend Orders] Fetching transactions collapsed:", err);
      return res.json([]);
    }
  });

  // POST Create Order Transaction
  app.post("/api/orders", async (req, res) => {
    if (!isDbReady) {
      return res.status(503).json({ error: "Database not connected" });
    }
    try {
      const orderPayload = req.body;
      const colRef = collection(serverDb, "orders");
      const docRef = doc(colRef);
      const orderId = docRef.id;

      const fullRecord = {
        id: orderId,
        ...orderPayload,
        status: orderPayload.status || "pending",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(docRef, fullRecord);
      return res.json({ success: true, orderId });
    } catch (err: any) {
      console.error("[Backend Orders] Trigger order creation failed:", err);
      return res.status(500).json({ error: err.message || "Failed to post order requests" });
    }
  });

  // POST Edit / Update Order status
  app.post("/api/orders/:id/status", async (req, res) => {
    if (!isDbReady) {
      return res.status(503).json({ error: "Database not connected" });
    }
    try {
      const orderId = req.params.id;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status code parameter is required" });
      }
      const docRef = doc(serverDb, "orders", orderId);
      await setDoc(docRef, {
        status,
        updatedAt: new Date()
      }, { merge: true });
      return res.json({ success: true, message: "Order state updated successfully" });
    } catch (err: any) {
      console.error("[Backend Orders] Status update failed:", err);
      return res.status(500).json({ error: err.message || "Failed to alter status of order" });
    }
  });

  // Serve static files and route SPA fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Stream Hub container started on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[Server] Boot exception:", err);
});
