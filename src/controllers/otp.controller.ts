import twilio from "twilio";
import crypto from "crypto";

// ------------------------
// Twilio Client
// ------------------------
const client = twilio(
  process.env.TWILIO_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

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

  public setOTP(userId: string, otp: string, ttlMs: number = 5 * 60 * 1000) {
    this.store.set(userId, {
      otp,
      expiresAt: Date.now() + ttlMs,
    });
  }

  public getOTP(userId: string): IOTPEntry | undefined {
    return this.store.get(userId);
  }

  public deleteOTP(userId: string) {
    this.store.delete(userId);
  }
}

const otpStore = OTPStore.getInstance();

// ------------------------
// OTP SERVICE
// ------------------------
export class OTPService {
  
  // Generate 6-digit numeric OTP
  public generateOTP(userId: string): string {
    const otp = crypto.randomInt(100000, 999999).toString();
    otpStore.setOTP(userId, otp);
    return otp;
  }

  // Send OTP SMS to user
  public async sendOTP(phone: string, userId: string): Promise<void> {
    const entry = otpStore.getOTP(userId);
    if (!entry) throw new Error("OTP not generated yet.");

    await client.messages.create({
      body: `Your verification code is ${entry.otp}`,
      from: process.env.TWILIO_PHONE!, // your Twilio number
      to: phone,
    });
  }

  // Verify user OTP
  public verifyOTP(userId: string, otp: string): boolean {
    const entry = otpStore.getOTP(userId);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      otpStore.deleteOTP(userId);
      return false; // expired
    }

    if (entry.otp !== otp) return false;

    otpStore.deleteOTP(userId);
    return true;
  }
}
