const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // Halimbawa: 'DELETED_USER', 'RESOLVED_REPORT'
  details: { type: String }, 
}, { timestamps: { createdAt: 'timestamp', updatedAt: false } }); 

module.exports = mongoose.model('Log', logSchema);