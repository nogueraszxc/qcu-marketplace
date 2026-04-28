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
  status: { type: String, default: 'Pending' } // Pending, Accepted, Completed, Cancelled
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);