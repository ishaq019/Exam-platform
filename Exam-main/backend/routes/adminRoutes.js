const express = require("express");

const assignmentController = require("../controllers/assignmentController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const validate = require("../middleware/validateRequest");
const { assignmentValidator } = require("../validators/assignmentValidator");

const router = express.Router();

router.get(
  "/students",
  protect,
  allowRoles("admin"),
  assignmentController.getStudents
);

router.post(
  "/exams/:examId/assign",
  protect,
  allowRoles("admin"),
  assignmentValidator,
  validate,
  assignmentController.assignStudents
);

router.get(
  "/exams/:examId/assigned-students",
  protect,
  allowRoles("admin"),
  assignmentController.getAssignedStudents
);

module.exports = router;