const router = require("express").Router();
const c = require("../controllers/attemptController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const validate = require("../middleware/validateRequest");
const { attemptValidator } = require("../validators/attemptValidator");

router.use(protect, allowRoles("student"));

router.get("/exams", c.assignedExams);
router.get("/exams/:examId/start", c.startExam);
router.post("/exams/:examId/submit", attemptValidator, validate, c.submitExam);

module.exports = router;
