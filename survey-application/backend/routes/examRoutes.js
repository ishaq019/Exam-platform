const express = require('express');
const Exam = require('../models/Exam');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const exams = await Exam.find({})
      .select('_id title name description status startTime endTime surveyConfig createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: exams.length,
      data: exams,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;