const mongoose = require('mongoose');
const { Schema } = mongoose;
const id = { type: Schema.Types.ObjectId, default: null };
const ref = name => ({ ...id, ref: name });
const consentSchema = new Schema({ kind: String, version: String, acceptedAt: Date, imageRights: Boolean }, { _id: false });
const model = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);
const User = model('User', new Schema({
  name: { type: String, required: true, maxlength: 80 }, email: { type: String, required: true, lowercase: true, unique: true },
  password: { type: String, select: false }, role: { type: String, default: 'student', set: value => String(value).toLowerCase() === 'admin' ? 'admin' : 'student' },
  emailVerified: { type: Boolean, default: false }, firebaseUid: { type: String, select: false, unique: true, sparse: true },
  bio: { type: String, default: '', maxlength: 500 }, contactPreference: { type: String, enum: ['inbox', 'campus-meetup'], default: 'inbox' },
  isBanned: { type: Boolean, default: false }, deletedAt: Date, consents: [consentSchema],
  guardVersion: { type: Number, default: 0, select: false },
}, { timestamps: true }));
const Session = model('Session', new Schema({ userId: { ...ref('User'), required: true, index: true }, tokenHash: { type: String, unique: true, required: true }, expiresAt: { type: Date, required: true, index: { expires: 0 } } }, { timestamps: true }));
const PasswordReset = model('PasswordReset', new Schema({ userId: { ...ref('User'), required: true }, tokenHash: { type: String, unique: true, required: true }, expiresAt: { type: Date, required: true, index: { expires: 0 } } }, { timestamps: true }));
const MediaAsset = model('MediaAsset', new Schema({ ownerId: { ...ref('User'), required: true, index: true }, data: { type: Buffer, required: true, select: false }, mime: String, width: Number, height: Number }, { timestamps: true }));
const Product = model('Product', new Schema({
  title: { type: String, required: true, maxlength: 120 }, description: { type: String, default: '', maxlength: 3000 },
  price: { type: Number, required: true, min: 0, max: 1000000 }, category: { type: String, enum: ['Books', 'Electronics', 'Clothing', 'Food', 'Services', 'Others'], required: true },
  condition: { type: String, enum: ['New', 'Like New', 'Good', 'Fair'], default: 'Good' }, location: { type: String, maxlength: 120, default: '' },
  warrantyTerms: { type: String, required: true, maxlength: 2000 }, image: String, imageAssetId: ref('MediaAsset'),
  sellerId: { ...ref('User'), required: true, index: true }, sellerName: String,
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Reserved', 'Sold', 'Removed'], default: 'Pending', index: true },
  rejectionReason: String, consent: consentSchema, reservedTransactionId: id, deletedAt: Date,
}, { timestamps: true }));
const Transaction = model('Transaction', new Schema({
  productId: ref('Product'), productTitle: String, price: Number, warrantyTerms: String,
  buyerId: { ...ref('User'), index: true }, buyerName: String, sellerId: { ...ref('User'), index: true }, sellerName: String,
  meetupLocation: String, meetupTime: String, paymentMethod: String, message: String,
  status: { type: String, enum: ['Pending', 'Accepted', 'Completed', 'Cancelled'], default: 'Pending' },
  active: { type: Boolean, default: true }, completedAt: Date,
}, { timestamps: true }));
Transaction.schema.index({ productId: 1, buyerId: 1, active: 1 }, { unique: true, partialFilterExpression: { active: true } });
const Message = model('Message', new Schema({ productId: ref('Product'), senderId: { ...ref('User'), required: true, index: true }, receiverId: { ...ref('User'), required: true, index: true }, text: { type: String, required: true, maxlength: 3000 }, support: Boolean }, { timestamps: true }));
const Notification = model('Notification', new Schema({ userId: { ...ref('User'), required: true, index: true }, message: String, type: { type: String, default: 'System' }, isRead: { type: Boolean, default: false }, resourceId: String }, { timestamps: true }));
const Report = model('Report', new Schema({ reporter: ref('User'), reportedUser: ref('User'), product: ref('Product'), message: String, status: { type: String, enum: ['pending', 'resolved'], default: 'pending' }, resolution: String, resolvedAt: Date }, { timestamps: true }));
const Log = model('Log', new Schema({ adminId: ref('User'), action: String, details: String, resourceId: String }, { timestamps: { createdAt: 'timestamp', updatedAt: false } }));
const PrivacyRequest = model('PrivacyRequest', new Schema({ userId: ref('User'), type: { type: String, enum: ['access', 'correction', 'deletion', 'objection'] }, message: String, status: { type: String, enum: ['open', 'resolved'], default: 'open' }, response: String, resolvedAt: Date }, { timestamps: true }));
const Dispute = model('Dispute', new Schema({ transactionId: { ...ref('Transaction'), index: true }, requesterId: ref('User'), buyerId: ref('User'), sellerId: ref('User'), type: { type: String, enum: ['refund', 'dispute'] }, reason: String, amount: Number, status: { type: String, enum: ['open', 'accepted', 'rejected', 'refunded'], default: 'open' }, active: { type: Boolean, default: true }, response: String, reviewStatus: { type: String, enum: ['unreviewed', 'reviewing', 'closed'], default: 'unreviewed' }, adminNote: String, respondedAt: Date }, { timestamps: true }));
Dispute.schema.index({ transactionId: 1, active: 1 }, { unique: true, partialFilterExpression: { active: true } });
const analyticsSchema = new Schema({ day: String, event: String, page: String, count: { type: Number, default: 0 } }, { versionKey: false });
analyticsSchema.index({ day: 1, event: 1, page: 1 }, { unique: true });
const AnalyticsDaily = model('AnalyticsDaily', analyticsSchema);
module.exports = { User, Session, PasswordReset, MediaAsset, Product, Transaction, Message, Notification, Report, Log, PrivacyRequest, Dispute, AnalyticsDaily };
