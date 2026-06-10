const router = require("express").Router();
const c = require("../controllers/questionController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const validate = require("../middleware/validateRequest");
const { questionValidator } = require("../validators/questionValidator");

router.post("/exams/:examId/questions", protect, allowRoles("admin"), questionValidator, validate, c.addQuestion);
router.get("/exams/:examId/questions", protect, allowRoles("admin"), c.getQuestions);
router.put("/questions/:id", protect, allowRoles("admin"), questionValidator, validate, c.updateQuestion);
router.delete("/questions/:id", protect, allowRoles("admin"), c.deleteQuestion);

module.exports = router;
