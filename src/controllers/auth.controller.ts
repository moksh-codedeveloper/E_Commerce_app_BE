import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import UserModel from "../models/user.model.js";
import { OTPService } from "./otp.controlles.js";
import emailOTPService from "./email_otp.controller.js";

const phoneOTPService = new OTPService();

// ------------------------
// ADMIN CREDENTIALS CHECK
// ------------------------
const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_EMAIL || "admin@ecommerce.com",
  password: process.env.ADMIN_PASSWORD || "Admin@123",
  username: "Admin"
};

// ------------------------
// JWT Helper Functions
// ------------------------
const generateAccessToken = (userId: string, role: string) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: "15m" }
  );
};

const generateRefreshToken = (userId: string) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "7d" }
  );
};

// ------------------------
// AUTH CONTROLLER
// ------------------------
export class AuthController {
  
  // 📌 REGISTER USER
  public async register(req: Request, res: Response) {
    try {
      const { username, email, password, phonenumber } = req.body;

      // Validation
      if (!username || !email || !password || !phonenumber) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      // Prevent registration with admin email
      if (email === ADMIN_CREDENTIALS.email) {
        return res.status(403).json({
          success: false,
          message: "Cannot register with admin credentials",
        });
      }

      // Check if user exists
      const existingUser = await UserModel.model.findOne({
        $or: [{ email }, { phonenumber }],
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User with this email or phone already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await UserModel.model.create({
        username,
        email,
        password: hashedPassword,
        phonenumber,
        role: "user",
      });

      // Generate OTPs for both phone and email
      const phoneOTP = phoneOTPService.generateOTP(newUser._id.toString());
      const emailOTP = emailOTPService.generateOTP(email);

      // Send OTPs
      try {
        await phoneOTPService.sendOTP(`+${phonenumber}`, newUser._id.toString());
        await emailOTPService.sendOTP(email, emailOTP);
      } catch (error: any) {
        console.error("❌ OTP Send Error:", error);
        // Continue even if OTP fails to send
      }

      res.status(201).json({
        success: true,
        message: "User registered successfully. OTP sent to phone and email.",
        data: {
          userId: newUser._id,
          username: newUser.username,
          email: newUser.email,
          phonenumber: newUser.phonenumber,
        },
      });
    } catch (error: any) {
      console.error("❌ Register Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Registration failed",
      });
    }
  }

  // 📌 VERIFY PHONE OTP
  public async verifyPhoneOTP(req: Request, res: Response) {
    try {
      const { userId, otp } = req.body;

      if (!userId || !otp) {
        return res.status(400).json({
          success: false,
          message: "User ID and OTP are required",
        });
      }

      const isValid = phoneOTPService.verifyOTP(userId, otp);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP",
        });
      }

      res.status(200).json({
        success: true,
        message: "Phone verified successfully",
      });
    } catch (error: any) {
      console.error("❌ Phone OTP Verification Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "OTP verification failed",
      });
    }
  }

  // 📌 VERIFY EMAIL OTP
  public async verifyEmailOTP(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: "Email and OTP are required",
        });
      }

      const isValid = emailOTPService.verifyOTP(email, otp);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP",
        });
      }

      res.status(200).json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error: any) {
      console.error("❌ Email OTP Verification Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "OTP verification failed",
      });
    }
  }

  // 📌 RESEND PHONE OTP
  public async resendPhoneOTP(req: Request, res: Response) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const user = await UserModel.model.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const otp = phoneOTPService.generateOTP(userId);
      await phoneOTPService.sendOTP(`+${user.phonenumber}`, userId);

      res.status(200).json({
        success: true,
        message: "OTP resent successfully to phone",
      });
    } catch (error: any) {
      console.error("❌ Resend Phone OTP Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to resend OTP",
      });
    }
  }

  // 📌 RESEND EMAIL OTP
  public async resendEmailOTP(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const user = await UserModel.model.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const otp = emailOTPService.generateOTP(email);
      await emailOTPService.sendOTP(email, otp);

      res.status(200).json({
        success: true,
        message: "OTP resent successfully to email",
      });
    } catch (error: any) {
      console.error("❌ Resend Email OTP Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to resend OTP",
      });
    }
  }

  // 📌 LOGIN (Checks for Admin Credentials First)
  public async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // ✅ CHECK IF ADMIN LOGIN
      if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        // Generate tokens for admin
        const adminId = "admin_" + Date.now();
        const accessToken = generateAccessToken(adminId, "admin");
        const refreshToken = generateRefreshToken(adminId);

        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
          success: true,
          message: "Admin login successful",
          data: {
            accessToken,
            user: {
              id: adminId,
              username: ADMIN_CREDENTIALS.username,
              email: ADMIN_CREDENTIALS.email,
              role: "admin",
            },
          },
        });
      }

      // ✅ REGULAR USER LOGIN
      const user = await UserModel.model.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user._id.toString(), user.role);
      const refreshToken = generateRefreshToken(user._id.toString());

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          accessToken,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error: any) {
      console.error("❌ Login Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Login failed",
      });
    }
  }

  // 📌 REFRESH TOKEN
  public async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.cookies;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: "Refresh token not found",
        });
      }

      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!
      ) as { userId: string };

      // Check if it's admin
      if (decoded.userId.startsWith("admin_")) {
        const newAccessToken = generateAccessToken(decoded.userId, "admin");
        return res.status(200).json({
          success: true,
          data: {
            accessToken: newAccessToken,
          },
        });
      }

      // Get user
      const user = await UserModel.model.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Generate new access token
      const newAccessToken = generateAccessToken(
        user._id.toString(),
        user.role
      );

      res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (error: any) {
      console.error("❌ Refresh Token Error:", error);
      res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }
  }

  // 📌 LOGOUT
  public async logout(req: Request, res: Response) {
    try {
      res.clearCookie("refreshToken");
      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      console.error("❌ Logout Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Logout failed",
      });
    }
  }

  // 📌 FORGOT PASSWORD (Send OTP to both phone and email)
  public async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      // Admin cannot reset password via this method
      if (email === ADMIN_CREDENTIALS.email) {
        return res.status(403).json({
          success: false,
          message: "Admin password reset not allowed via this method",
        });
      }

      const user = await UserModel.model.findOne({ email });
      if (!user) {
        return res.status(200).json({
          success: true,
          message: "If the email exists, OTP has been sent",
        });
      }

      // Generate and send OTPs to both phone and email
      const phoneOTP = phoneOTPService.generateOTP(user._id.toString());
      const emailOTP = emailOTPService.generateOTP(email);

      try {
        await phoneOTPService.sendOTP(`+${user.phonenumber}`, user._id.toString());
        await emailOTPService.sendOTP(email, emailOTP);
      } catch (error) {
        console.error("❌ OTP Send Error:", error);
      }

      res.status(200).json({
        success: true,
        message: "OTP sent to phone and email",
        data: {
          userId: user._id,
          email: email,
        },
      });
    } catch (error: any) {
      console.error("❌ Forgot Password Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to process request",
      });
    }
  }

  // 📌 RESET PASSWORD (with either phone or email OTP)
  public async resetPassword(req: Request, res: Response) {
    try {
      const { userId, email, otp, newPassword, verificationType } = req.body;

      if (!otp || !newPassword || !verificationType) {
        return res.status(400).json({
          success: false,
          message: "OTP, new password, and verification type are required",
        });
      }

      let isValid = false;

      // Verify OTP based on type
      if (verificationType === "phone" && userId) {
        isValid = phoneOTPService.verifyOTP(userId, otp);
      } else if (verificationType === "email" && email) {
        isValid = emailOTPService.verifyOTP(email, otp);
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid verification type or missing identifier",
        });
      }

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      if (userId) {
        await UserModel.model.findByIdAndUpdate(userId, {
          password: hashedPassword,
        });
      } else if (email) {
        await UserModel.model.findOneAndUpdate(
          { email },
          { password: hashedPassword }
        );
      }

      res.status(200).json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error: any) {
      console.error("❌ Reset Password Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to reset password",
      });
    }
  }

  // 📌 GET CURRENT USER (Protected Route)
  public async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;

      // Check if admin
      if (userId.startsWith("admin_")) {
        return res.status(200).json({
          success: true,
          data: {
            id: userId,
            username: ADMIN_CREDENTIALS.username,
            email: ADMIN_CREDENTIALS.email,
            role: "admin",
          },
        });
      }

      const user = await UserModel.model
        .findById(userId)
        .select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      console.error("❌ Get Current User Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get user",
      });
    }
  }
}

export default new AuthController();