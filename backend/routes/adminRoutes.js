const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Report = require('../models/Report');
const Log = require('../models/Log'); 
const Message = require('../models/Message'); // <-- Gagamitin na natin ang Message model
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/stats', protect, admin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({}); 
    const totalProducts = await Product.countDocuments({ status: 'Approved' });
    const totalReports = await Report.countDocuments({ status: 'pending' });
    res.json({ totalUsers, totalProducts, totalReports });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.get('/users', protect, admin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.get('/products', protect, admin, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) query = { title: { $regex: search, $options: 'i' } };
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.get('/reports', protect, admin, async (req, res) => {
  try {
    const reports = await Report.find().populate('reporter', 'name').populate('reportedUser', 'name').sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.get('/logs', protect, admin, async (req, res) => {
  try {
    const logs = await Log.find().populate('adminId', 'name email').sort({ timestamp: -1 }).limit(50); 
    res.json(logs);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

// Admin Actions
router.put('/products/:id/approve', protect, admin, async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.id, { status: 'Approved' }, { new: true });
    await Log.create({ adminId: req.user._id, action: 'APPROVED', details: `Approved: ${product.title}` });
    res.json(product);
});

router.delete('/products/:id', protect, admin, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
});

router.delete('/users/:id', protect, admin, async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    await Product.deleteMany({ sellerId: req.params.id });
    res.json({ message: "User deleted" });
});

// RESOLVE REPORT - DIRETASONG MESSAGE NA SA CHAT
router.put('/reports/:id/resolve', protect, admin, async (req, res) => {
    try {
        const { warningMessage } = req.body;
        const report = await Report.findByIdAndUpdate(req.params.id, { status: 'resolved' }, { new: true });
        
        // Kapag may tinype na warning, isesend as direct Admin Chat
        if (warningMessage && report.reportedUser) {
            await Message.create({
                senderId: req.user._id, // ID ng Admin
                receiverId: report.reportedUser, // ID ng nireport
                productId: null, // Null para pumasok sa Admin Support Hub
                text: `[REPORT WARNING]: ${warningMessage}`
            });
        }
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: "Error resolving report" });
    }
});

module.exports = router;