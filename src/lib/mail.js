import nodemailer from "nodemailer";
import { config } from "@/lib/config";

const APP_NAME = "Lone Worker Safety";

function otpEmailHtml(otpCode, expiryMinutes) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:100%;">
        <tr><td align="center" style="padding-bottom:12px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#1a1a1a;">Password Reset Code</p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:28px;">
          <p style="margin:0;font-size:14px;color:#666666;line-height:1.6;">
            Use this code to verify your email and continue resetting your ${APP_NAME} password.
          </p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr><td align="center" style="background-color:#f5f5f5;border-radius:6px;padding:24px 20px;">
              <p style="margin:0;font-size:40px;font-weight:700;letter-spacing:12px;color:#1a1a1a;font-family:'Courier New',monospace;">${otpCode}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding-bottom:32px;">
          <p style="margin:0;font-size:12px;color:#888888;line-height:1.6;">
            This code is valid for ${expiryMinutes} minutes. Never share it with anyone. If you did not request it, you can ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function transport() {
  if (!globalThis.__mailTransport) {
    const { host, port, user, password } = config.mail;
    globalThis.__mailTransport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass: password } : undefined,
    });
  }
  return globalThis.__mailTransport;
}

export async function sendPasswordResetOtp(to, otpCode, expiryMinutes) {
  if (config.mail.driver !== "smtp") {
    console.info(`[mail:log] Password reset OTP for ${to}: ${otpCode} (valid ${expiryMinutes} min)`);
    return;
  }

  await transport().sendMail({
    from: config.mail.from,
    to,
    subject: `Your ${APP_NAME} password reset code`,
    text: `Your password reset code is ${otpCode}. It is valid for ${expiryMinutes} minutes. Never share it with anyone.`,
    html: otpEmailHtml(otpCode, expiryMinutes),
  });
}
