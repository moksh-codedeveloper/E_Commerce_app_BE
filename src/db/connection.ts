import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URL;

  if (!uri) {
    throw new Error("❌ MONGO_URL missing in .env file");
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB Connected Successfully");
  } catch (error: any) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
}
