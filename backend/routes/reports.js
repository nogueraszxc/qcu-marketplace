const express = require('express');
const Report = require('../models/Report');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { reportedUser, product, message } = req.body;
    
    const report = new Report({
      reporter: req.user._id,
      reportedUser,
      product,
      message
    });

    await report.save();
    res.status(201).json({ message: 'Report submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;