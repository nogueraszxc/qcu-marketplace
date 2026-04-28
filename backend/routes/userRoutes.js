const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification'); // <-- Siguraduhing naka-import ito
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/authMiddleware');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// 1. REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashedPassword });
    if (user) {
      res.status(201).json({
        _id: user.id, name: user.name, email: user.email, 
        role: user.role, 
        token: generateToken(user._id)
      });
    } else res.status(400).json({ message: 'Invalid user data' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 2. LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user.id, name: user.name, email: user.email, 
        role: user.role, 
        token: generateToken(user._id)
      });
    } else res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 3. GOOGLE LOGIN
router.post('/google-login', async (req, res) => {
  try {
    const { name, email } = req.body;
    let user = await User.findOne({ email });

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(email + process.env.JWT_SECRET, salt);
      user = await User.create({ name, email, password: hashedPassword });
    }

    res.json({
      _id: user.id, name: user.name, email: user.email, 
      role: user.role, 
      token: generateToken(user._id)
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 4. GET USER NOTIFICATIONS (Ito yung idinagdag natin)
router.get('/notifications', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications" });
  }
});

module.exports = router;