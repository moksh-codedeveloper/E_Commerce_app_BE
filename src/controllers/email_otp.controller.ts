import nodemailer from "nodemailer";
import crypto from "crypto";

export interface IOTPEntry {
  otp: string;
  expiresAt: number; // timestamp in ms
}

// ------------------------
// OTP STORE (RAM MEMORY)
// ------------------------
class OTPStore {
  private static instance: OTPStore;
  private store: Map<string, IOTPEntry> = new Map();

  private constructor() {}

  public static getInstance() {
    if (!OTPStore.instance) OTPStore.instance = new OTPStore();
    return OTPStore.instance;
  }

  public setOTP(identifier: string, otp: string, ttlMs: number = 5 * 60 * 1000) {
    this.store.set(identifier, {
      otp,
      expiresAt: Date.now() + ttlMs,
    });
  }

  public getOTP(identifier: string): IOTPEntry | undefined {
    return this.store.get(identifier);
  }

  public deleteOTP(identifier: string) {
    this.store.delete(identifier);
  }
}

const otpStore = OTPStore.getInstance();

// ------------------------
// EMAIL OTP SERVICE
// ------------------------
export class EmailOTPService {
  private transporter;

  constructor() {
    // Create email transporter
    this.transporter = nodemailer.createTransport({
      service: "gmail", // or 'smtp.gmail.com'
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // App password, not regular password
      },
    });
  }

  // Generate 6-digit numeric OTP
  public generateOTP(identifier: string): string {
    const otp = crypto.randomInt(100000, 999999).toString();
    otpStore.setOTP(identifier, otp);
    return otp;
  }

  // Send OTP email
  public async sendOTP(email: string, otp: string): Promise<void> {
    const mailOptions = {
      from: `"E-Commerce App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Verification Code",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; color: #333; margin-bottom: 30px; }
            .otp-box { background: #f8f9fa; border: 2px dashed #007bff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; }
            .message { color: #666; line-height: 1.6; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Verification Code</h1>
            </div>
            <div class="message">
              <p>Hello,</p>
              <p>Your verification code is:</p>
            </div>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <div class="message">
              <p><strong>⏰ This code will expire in 5 minutes.</strong></p>
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} E-Commerce App. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent to ${email}`);
    } catch (error: any) {
      console.error("❌ Failed to send OTP email:", error);
      throw new Error("Failed to send verification email");
    }
  }

  // Verify OTP
  public verifyOTP(identifier: string, otp: string): boolean {
    const entry = otpStore.getOTP(identifier);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      otpStore.deleteOTP(identifier);
      return false; // expired
    }

    if (entry.otp !== otp) return false;

    otpStore.deleteOTP(identifier);
    return true;
  }
}

export default new EmailOTPService();