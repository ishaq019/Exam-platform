const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const examRoutes = require("./routes/examRoutes");
const questionRoutes = require("./routes/questionRoutes");
const attemptRoutes = require("./routes/attemptRoutes");
const reportRoutes = require("./routes/reportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");
const logger = require("./utils/logger");

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.QUIZ_CLIENT_URL,
  process.env.SURVEY_CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "https://syedishaq.me",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: false,
  })
);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    service: "quiz-application-backend",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);
app.use("/api", questionRoutes);
app.use("/api/student", attemptRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
const dbReady = connectDB();

if (require.main === module) {
  dbReady
    .then(() => {
      app.listen(PORT, () => {
        logger.info(`Quiz server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      logger.error("Failed to start quiz server:", error.message);
      process.exit(1);
    });
}

module.exports = { app, dbReady };
