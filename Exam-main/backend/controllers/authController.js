const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const asyncHandler = require("../utils/asyncHandler");
const { generateOtp, sendRegistrationOtpEmail } = require("../utils/mailService");

const sanitizeUser = (user) => {
  const userObject = user.toObject ? user.toObject() : user;
  delete userObject.password;
  return userObject;
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const safeName = String(name).trim();
  const normalizedEmail = String(email).trim().toLowerCase();

  if (!safeName || !normalizedEmail || !password) {
    return res.status(400).json({
      message: "Name, email, and password are required",
    });
  }

  const allowedRoles = ["admin", "student"];
  const safeRole = allowedRoles.includes(role) ? role : "student";

  const exists = await User.findOne({ email: normalizedEmail }).select("_id").lean();

  if (exists) {
    return res.status(400).json({
      message: "Email already exists",
    });
  }

  const user = await User.create({
    name: safeName,
    email: normalizedEmail,
    password,
    role: safeRole,
  });

  const otp = generateOtp();
  void sendRegistrationOtpEmail({
    name: safeName,
    email: normalizedEmail,
    otp,
  });

  const cleanUser = sanitizeUser(user);

  res.status(201).json({
    user: cleanUser,
    token: generateToken(user),
    message: "Registration successful. OTP has been sent to your email.",
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email).trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({
      message: "Invalid credentials",
    });
  }

  const cleanUser = sanitizeUser(user);

  res.json({
    user: cleanUser,
    token: generateToken(user),
  });
});

exports.me = asyncHandler(async (req, res) => {
  res.json(req.user);
});
