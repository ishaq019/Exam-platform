const router = require("express").Router();
const c = require("../controllers/examController");
const qc = require("../controllers/questionController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const validate = require("../middleware/validateRequest");
const { examValidator } = require("../validators/examValidator");

router.use(protect, allowRoles("admin"));
router
  .route("/")
  .post(examValidator, validate, c.createExam)
  .get(c.getExams);

router.put("/:examId/questions/reorder", qc.reorderQuestions);

router
  .route("/:id")
  .get(c.getExam)
  .put(examValidator, validate, c.updateExam)
  .delete(c.deleteExam);

module.exports = router;
