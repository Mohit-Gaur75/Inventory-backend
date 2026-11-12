const nodemailer = require("nodemailer");

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const secure = port === 465;

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });
  }
  return transporter;
};

/**
 * Core send helper. Safe and non-throwing.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`⚠️  [Mailer] SMTP credentials not set. Simulated email to: ${to}`);
    console.warn(`   Subject: ${subject}`);
    return false;
  }

  try {
    let fromAddress = process.env.EMAIL_FROM ? process.env.EMAIL_FROM.trim() : `"LocalMart" <${process.env.SMTP_USER}>`;
    while (
      (fromAddress.startsWith("'") && fromAddress.endsWith("'")) ||
      (fromAddress.startsWith('"') && fromAddress.endsWith('"'))
    ) {
      fromAddress = fromAddress.slice(1, -1).trim();
    }
    const plainText = text || (html ? html.replace(/<[^>]*>?/gm, "").trim() : "");

    const info = await getTransporter().sendMail({
      from: fromAddress,
      to,
      subject,
      text: plainText,
      html,
    });

    console.log(`✉️  [Mailer] Email sent successfully to ${to} (MessageId: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`❌ [Mailer] Delivery failed to ${to}:`, error.message);
    return false;
  }
};

/**
 * 1. Password Reset OTP Email
 */
const sendPasswordResetOTP = async (email, otp) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - LocalMart</title>
      </head>
      <body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0d9488 0%, #059669 100%); padding: 32px 24px; text-align: center;">
            <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; font-size: 22px; color: #ffffff; margin-bottom: 8px;">
              🛍️
            </div>
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">LocalMart</h1>
            <p style="color: #ccfbf1; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Password Reset Verification</p>
          </div>

          <!-- Body -->
          <div style="padding: 32px 24px; color: #1e293b;">
            <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px 0; font-weight: 600;">Hello,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
              We received a request to reset the password for your LocalMart account. Please enter the verification code below on the password reset screen:
            </p>

            <!-- OTP Box -->
            <div style="background: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f766e; display: inline-block;">${otp}</span>
              <p style="font-size: 12px; color: #0d9488; margin: 8px 0 0 0; font-weight: 600;">Valid for 15 minutes</p>
            </div>

            <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 0 0 16px 0;">
              If you did not request this password reset, please ignore this email or change your password if you suspect unauthorized access.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0;">© ${new Date().getFullYear()} LocalMart. Hyperlocal commerce platform.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Your LocalMart Password Reset Code: ${otp}`,
    html,
  });
};

/**
 * 2. Welcome Email (Account Created Confirmation)
 */
const sendWelcomeEmail = async (email, name, role) => {
  const isShopkeeper = role === "shopkeeper";
  const appUrl = process.env.CLIENT_URL || "http://localhost:3000";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Created Successfully - LocalMart</title>
      </head>
      <body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0d9488 0%, #059669 100%); padding: 36px 28px; text-align: center;">
            <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background: rgba(255, 255, 255, 0.22); border-radius: 14px; font-size: 24px; color: #ffffff; margin-bottom: 10px;">
              🎉
            </div>
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Welcome to LocalMart!</h1>
            <p style="color: #ccfbf1; margin: 6px 0 0 0; font-size: 14px; font-weight: 500;">Your Account Has Been Created Successfully</p>
          </div>

          <!-- Body -->
          <div style="padding: 32px 28px; color: #1e293b;">
            <p style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Hello ${name},</p>
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
              Thank you for registering with LocalMart. Your account is now active and ready to use!
            </p>

            <!-- Account Summary Card -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
              <div style="font-size: 12px; font-weight: 700; color: #0d9488; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                📋 Account Information
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 5px 0; color: #64748b; font-weight: 500;">Full Name:</td>
                  <td style="padding: 5px 0; color: #1e293b; font-weight: 600; text-align: right;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #64748b; font-weight: 500;">Email Address:</td>
                  <td style="padding: 5px 0; color: #1e293b; font-weight: 600; text-align: right;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #64748b; font-weight: 500;">Account Type:</td>
                  <td style="padding: 5px 0; color: #0d9488; font-weight: 700; text-align: right;">${isShopkeeper ? "Shopkeeper / Merchant 🏪" : "Customer / Shopper 🛍️"}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #64748b; font-weight: 500;">Status:</td>
                  <td style="padding: 5px 0; color: #10b981; font-weight: 700; text-align: right;">Active ✅</td>
                </tr>
              </table>
            </div>

            <!-- What's Next Box -->
            <div style="background: #f0fdfa; border-left: 4px solid #0d9488; padding: 14px 18px; border-radius: 0 10px 10px 0; margin-bottom: 28px;">
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #134e4a;">
                ${
                  isShopkeeper
                    ? "<strong>Next Steps:</strong> Launch your digital storefront, upload inventory, configure your business hours, and connect with nearby shoppers."
                    : "<strong>Next Steps:</strong> Search local inventory in real-time, compare nearby prices, find open shops, and enjoy contactless discovery!"
                }
              </p>
            </div>

            <!-- CTA Buttons -->
            <div style="text-align: center; margin: 28px 0 16px 0;">
              <a href="${isShopkeeper ? `${appUrl}/create-shop` : `${appUrl}/search`}"
                 style="background: #0d9488; color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 12px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.25);">
                ${isShopkeeper ? "Open Your Digital Shop 🏪" : "Start Exploring Products 🔍"}
              </a>
            </div>

            <div style="text-align: center;">
              <a href="${appUrl}/login" style="font-size: 13px; color: #0d9488; text-decoration: underline; font-weight: 500;">
                Sign in to your account
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 22px; text-align: center; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0 0 6px 0;">© ${new Date().getFullYear()} LocalMart. Hyperlocal commerce platform.</p>
            <p style="margin: 0; font-size: 11px; color: #cbd5e1;">If you did not register for this account, please ignore this email or contact support.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "🎉 Account Created Successfully - Welcome to LocalMart!",
    html,
  });
};

/**
 * 3. Low Stock Alert Email (for Shopkeepers)
 */
const sendLowStockAlert = async (email, shopkeeperName, productName, currentStock) => {
  const appUrl = process.env.CLIENT_URL || "http://localhost";
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background: #f59e0b; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px;">⚠️ Low Stock Alert</h1>
          </div>
          <div style="padding: 28px 24px; color: #1e293b;">
            <p>Hi ${shopkeeperName},</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              Your product <strong>"${productName}"</strong> has reached low stock:
            </p>
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
              <span style="font-size: 28px; font-weight: 700; color: #b45309;">${currentStock} units left</span>
            </div>
            <div style="text-align: center; margin-top: 24px;">
              <a href="${appUrl}/dashboard" style="background: #0d9488; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: 600; font-size: 13px; display: inline-block;">
                Update Stock on Dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Low Stock Warning: "${productName}" has only ${currentStock} left`,
    html,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetOTP,
  sendWelcomeEmail,
  sendLowStockAlert,
};
