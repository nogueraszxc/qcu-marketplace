const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const Report = require('../models/Report');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// Get all users
router.get('/users', auth, adminAuth, async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

// Ban user
router.put('/users/:id/ban', auth, adminAuth, async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBanned: true },
    { new: true }
  ).select('-password');
  res.json(user);
});

// Approve product
router.put('/products/:id/approve', auth, adminAuth, async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { status: 'approved' },
    { new: true }
  ).populate('seller', 'name');
  res.json(product);
});

// Delete product
router.delete('/products/:id', auth, adminAuth, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: 'Product deleted' });
});

// Get reports
router.get('/reports', auth, adminAuth, async (req, res) => {
  const reports = await Report.find()
    .populate('reporter reportedUser product', 'name email title')
    .sort({ createdAt: -1 });
  res.json(reports);
});

module.exports = router;