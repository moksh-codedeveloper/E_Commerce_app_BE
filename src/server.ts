import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
// import { connectDB } from "./db/connection.js";

// ✅ IMPORT ROUTES
import authRoutes from "./routes/auth.routes.js";

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

// Test route
app.get("/", (req, res) => {
  res.json({ message: "🚀 API Working" });
});

// ✅ USE ROUTES
app.use("/api/auth", authRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("🔥 Error:", err);
  res.status(err.status || 500).json({ success: false, message: err.message || "Internal Server Error" });
});

export default app;