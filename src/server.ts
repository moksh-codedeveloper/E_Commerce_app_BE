// server.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
const app = express();

// DON'T call connectDB here
// connectDB(); ← Remove this

// Middlewares
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({ message: "API Working 🚀" });
});

app.use((err: any, req: any, res: any, next: any) => {
  console.error("🔥 Error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;