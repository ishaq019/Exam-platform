const router = require("express").Router();
const c = require("../controllers/reportController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

router.use(protect, allowRoles("admin"));

router.get("/exams/:examId", c.examReport);
router.get("/exams/:examId/export", c.exportReport);

module.exports = router;
