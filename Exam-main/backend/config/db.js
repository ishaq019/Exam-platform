const mongoose = require("mongoose");
const logger = require("../utils/logger");

let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/quizdb";
  const isAtlas = uri.includes("mongodb+srv");
  const maxRetries = Number(process.env.DB_MAX_RETRIES || 3);

  connectionPromise = (async () => {
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
      } catch (error) {
        logger.error(`MongoDB connection attempt ${attempt}/${maxRetries} failed:`, error.message);

        if (attempt === maxRetries) {
          connectionPromise = null;
          throw error;
        }

        const delay = 2 ** attempt * 1000;
        logger.warn(`Retrying MongoDB connection in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return null;
  })();

  return connectionPromise;
};

module.exports = connectDB;
