import { Router } from "express";
import authController from "../controllers/auth.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// ------------------------
// PUBLIC ROUTES
// ------------------------

// 📌 Registration (Sends OTP to both phone and email)
router.post("/register", authController.register.bind(authController));

// 📌 OTP Verification
router.post("/verify-phone-otp", authController.verifyPhoneOTP.bind(authController));
router.post("/verify-email-otp", authController.verifyEmailOTP.bind(authController));

// 📌 Resend OTP
router.post("/resend-phone-otp", authController.resendPhoneOTP.bind(authController));
router.post("/resend-email-otp", authController.resendEmailOTP.bind(authController));

// 📌 Login & Logout
router.post("/login", authController.login.bind(authController));
router.post("/logout", authController.logout.bind(authController));

// 📌 Password Reset (Sends OTP to both phone and email)
router.post("/forgot-password", authController.forgotPassword.bind(authController));
router.post("/reset-password", authController.resetPassword.bind(authController));

// 📌 Refresh Token
router.post("/refresh", authController.refreshToken.bind(authController));

// ------------------------
// PROTECTED ROUTES
// ------------------------

// 📌 Get Current User
router.get("/me", authenticate, authController.getCurrentUser.bind(authController));

// 📌 Admin Routes
router.get("/admin/dashboard", authenticate, authorize("admin"), (req, res) => {
  res.json({
    success: true,
    message: "Admin Dashboard",
    data: { stats: { totalUsers: 100, totalOrders: 250, revenue: 50000 } }
  });
});

router.get("/admin/users", authenticate, authorize("admin"), async (req, res) => {
  try {
    const UserModel = (await import("../models/user.model.js")).default;
    const users = await UserModel.model.find().select("-password");
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;