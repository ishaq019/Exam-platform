const router = require("express").Router();
const c = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const validate = require("../middleware/validateRequest");
const { registerValidator, loginValidator } = require("../validators/authValidator");

router.post("/register", registerValidator, validate, c.register);
router.post("/login", loginValidator, validate, c.login);
router.get("/me", protect, c.me);

module.exports = router;
