const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer")
    ? req.headers.authorization.split(" ")[1]
    : null;

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password").lean();
    if (!req.user) return res.status(401).json({ message: "User not found" });
    next();
  } catch (err) {
    logger.warn("Auth token error:", err.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = protect;
