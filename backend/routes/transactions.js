const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productTitle: String,
  price: Number,
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerName: String,
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerName: String,
  meetupLocation: String,
  meetupTime: String,
  paymentMethod: String,
  message: String,
  // Eto ang kailangan para gumana ang Clear All permanently
  isDismissed: { type: Boolean, default: false }, 
  status: { type: String, default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);