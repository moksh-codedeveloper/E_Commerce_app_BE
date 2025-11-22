// index.ts
import dotenv from "dotenv";
dotenv.config();

import app from "./server.js";
import { connectDB } from "./db/connection.js"; // Import here

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.PORT) {
      console.warn("⚠️ PORT not found in .env, using default 5000");
    }
    
    await connectDB(); // Call it here AFTER dotenv.config()
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (error: any) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();