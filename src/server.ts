import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./db/connection.js";
const app = express();
connectDB();
// Middlewares
app.use(helmet());
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json({ limit: "10mb" }));

// Test route
app.get("/", (req, res) => {
  res.json({ message: "API Working 🚀" });
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("🔥 Error:", err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;
