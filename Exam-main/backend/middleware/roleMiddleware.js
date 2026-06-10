const allowRoles = (...roles) => (req, res, next) => {
  const userRole = String(req.user?.role || "");

  if (!roles.map(String).includes(userRole)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

module.exports = allowRoles;
