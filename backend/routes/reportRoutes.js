const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { protect } = require('../middleware/authMiddleware');

// SUBMIT A REPORT
router.post('/', protect, async (req, res) => {
  try {
    const { product, reportedUser, message } = req.body;
    
    const newReport = await Report.create({
      reporter: req.user._id,
      reportedUser,
      product,
      message,
      status: 'pending'
    });

    res.status(201).json(newReport);
  } catch (error) {
    res.status(500).json({ message: "Error submitting report" });
  }
});

module.exports = router;