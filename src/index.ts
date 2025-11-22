import dotenv from "dotenv";
dotenv.config();

import app from "./server.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Basic check
    if (!process.env.PORT) {
      console.warn("⚠️ PORT not found in .env, using default 5000");
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });

  } catch (error: any) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
