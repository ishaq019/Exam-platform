const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/quiz_exam_management";
  const isAtlas = uri.includes("mongodb+srv");
  const maxRetries = Number(process.env.DB_MAX_RETRIES || 3);

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: isAtlas ? 30000 : 5000,
        socketTimeoutMS: isAtlas ? 60000 : 45000,
        maxPoolSize: isAtlas ? 20 : 10,
        minPoolSize: isAtlas ? 4 : 2,
        retryWrites: true,
        w: "majority",
        bufferCommands: false,
        connectTimeoutMS: isAtlas ? 30000 : 10000,
      });

      logger.info("MongoDB connected successfully");
      return mongoose.connection;
    } catch (err) {
      logger.error(`MongoDB connection attempt ${attempt}/${maxRetries} failed:`, err.message);

      if (attempt === maxRetries) {
        logger.error(
          "MongoDB connection failed after all retries. Check MONGO_URI and network access."
        );
        throw err;
      }

      const delay = 2 ** attempt * 1000;
      logger.warn(`Retrying MongoDB connection in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return null;
};

module.exports = connectDB;
