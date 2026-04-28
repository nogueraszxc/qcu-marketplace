const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Message = require('../models/Message');
const User = require('../models/User'); // Import User para mahanap ang Admin
const { protect } = require('../middleware/authMiddleware');

// GET ALL MY TRANSACTIONS + ADMIN THREAD
router.get('/my-transactions', protect, async (req, res) => {
  try {
    const purchases = await Transaction.find({ buyerId: req.user._id }).sort({ createdAt: -1 });
    const sales = await Transaction.find({ sellerId: req.user._id }).sort({ createdAt: -1 });

    const adminThread = {
      _id: 'admin-support-thread',
      productTitle: "ADMIN SUPPORT HUB",
      sellerName: "SYSTEM ADMIN",
      sellerId: 'admin', // Static keyword para madali ipadala sa backend
      status: "Official",
      isAdminThread: true,
      productId: null,
      createdAt: new Date().toISOString()
    };

    res.json({ purchases, sales, adminThread });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET MESSAGES BETWEEN TWO USERS
router.get('/messages/:otherUserId/:productId', protect, async (req, res) => {
  try {
    let { otherUserId, productId } = req.params;
    
    // KUNG ANG KAUSAP AY SI ADMIN, HANAPIN ANG TUNAY NA ID NI CHANDLER
    if (otherUserId === 'admin') {
        const adminUser = await User.findOne({ email: 'chandlerszxc@gmail.com' });
        if (adminUser) otherUserId = adminUser._id.toString();
    }

    let query = {
      $or: [
        { senderId: req.user._id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: req.user._id }
      ]
    };

    if (productId === 'null') {
      query.productId = null;
    } else {
      query.productId = productId;
    }

    const messages = await Message.find(query).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST A MESSAGE
router.post('/messages', protect, async (req, res) => {
  try {
    let { receiverId, productId, text } = req.body;

    // KUNG ANG PADADALHAN AY SI ADMIN, HANAPIN ANG TUNAY NA ID NI CHANDLER
    if (receiverId === 'admin') {
        const adminUser = await User.findOne({ email: 'chandlerszxc@gmail.com' });
        if (adminUser) receiverId = adminUser._id.toString();
    }

    const message = await Message.create({
      senderId: req.user._id,
      receiverId,
      productId: productId || null,
      text
    });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;