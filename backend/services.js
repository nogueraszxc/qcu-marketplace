const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const M = require('./models');
const { fail, text, password, objectId, amount, consent, hash, token, sameId, raster } = require('./lib/security');
const DAY = 86400000;
const publicUser = (user, analytics = false) => ({ _id: String(user._id), name: user.name, email: user.email, role: String(user.role).toLowerCase() === 'admin' ? 'admin' : 'student', emailVerified: !!user.emailVerified, bio: user.bio || '', contactPreference: user.contactPreference || 'inbox', createdAt: user.createdAt, consent: user.consents?.findLast(item => item.kind === 'registration') || null, preferences: { analytics } });
const publicProduct = product => ({ _id: String(product._id), title: product.title, description: product.description || '', price: product.price, category: product.category, condition: product.condition, location: product.location || '', warrantyTerms: product.warrantyTerms || 'Seller warranty terms have not been supplied for this legacy listing.', sellerId: product.sellerId ? String(product.sellerId) : null, sellerName: product.sellerName, status: product.status, rejectionReason: product.rejectionReason || '', image: /^\/api\/media\/[a-f\d]{24}$/i.test(product.image || '') ? product.image : '', createdAt: product.createdAt, updatedAt: product.updatedAt });
const isAdmin = user => user && String(user.role).toLowerCase() === 'admin';
const cookieOptions = config => ({ httpOnly: true, secure: config.production, sameSite: 'lax', path: '/api' });
async function issueSession(user, req, res) {
  const config = req.app.locals.config;
  if (req.cookies.qcu_session) await M.Session.deleteOne({ tokenHash: hash(req.cookies.qcu_session) });
  const secret = token();
  await M.Session.create({ userId: user._id, tokenHash: hash(secret), expiresAt: new Date(Date.now() + config.sessionHours * 3600000) });
  const extras = await M.Session.find({ userId: user._id }).sort({ createdAt: -1 }).skip(5).select('_id');
  if (extras.length) await M.Session.deleteMany({ _id: { $in: extras.map(item => item._id) } });
  res.cookie('qcu_session', secret, { ...cookieOptions(config), maxAge: config.sessionHours * 3600000 });
}
async function optionalAuth(req, _res, next) {
  try {
    const raw = req.cookies.qcu_session;
    if (typeof raw === 'string' && /^[a-f\d]{64}$/.test(raw)) {
      const session = await M.Session.findOne({ tokenHash: hash(raw), expiresAt: { $gt: new Date() } });
      if (session) {
        const user = await M.User.findById(session.userId);
        if (user && !user.isBanned && !user.deletedAt) { req.user = user; req.session = session; }
      }
    }
    next();
  } catch (error) { next(error); }
}
function protect(req, _res, next) { if (!req.user) return next(Object.assign(new Error('Sign in to continue.'), { status: 401 })); next(); }
function admin(req, _res, next) { if (!isAdmin(req.user)) return next(Object.assign(new Error('Administrator access is required.'), { status: 403 })); next(); }
async function notify(userId, message, resourceId, session) { if (userId) await M.Notification.create([{ userId, message, resourceId }], session ? { session } : {}); }
async function audit(user, action, resourceId, details = '') { await M.Log.create({ adminId: user?._id || null, action, resourceId: String(resourceId || ''), details }); }
function productFields(body, creating = false) {
  const output = {};
  const fields = { title: { min: 3, max: 120 }, description: { max: 3000 }, location: { max: 120 }, warrantyTerms: { min: 3, max: 2000 } };
  for (const [key, rules] of Object.entries(fields)) if (creating || body[key] !== undefined) output[key] = text(body[key] ?? (['description', 'location'].includes(key) ? '' : undefined), key, rules);
  if (creating || body.price !== undefined) output.price = amount(body.price);
  if (creating || body.category !== undefined) { if (!['Books', 'Electronics', 'Clothing', 'Food', 'Services', 'Others'].includes(body.category)) fail(400, 'Choose a valid category.'); output.category = body.category; }
  if (creating || body.condition !== undefined) {
    const value = ({ 'Used - Good': 'Good', 'Used - Fair': 'Fair', 'LikeNew': 'Like New' })[body.condition] || body.condition;
    if (!['New', 'Like New', 'Good', 'Fair'].includes(value)) fail(400, 'Choose a valid condition.'); output.condition = value;
  }
  return output;
}
async function saveImage(ownerId, source) { return M.MediaAsset.create({ ownerId, ...await raster(source) }); }
async function participant(transactionId, user) {
  objectId(transactionId, 'transaction ID');
  const transaction = await M.Transaction.findById(transactionId);
  if (!transaction || (!isAdmin(user) && !sameId(transaction.buyerId, user._id) && !sameId(transaction.sellerId, user._id))) fail(404, 'Transaction not found.');
  return transaction;
}
async function touchParticipants(ids, session) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  const result = await M.User.updateMany({ _id: { $in: unique }, deletedAt: null, isBanned: { $ne: true } }, { $inc: { guardVersion: 1 } }, { session });
  if (result.matchedCount !== unique.length) fail(409, 'A participant account is unavailable. Contact project support.');
}
async function messageContext(req, other, product) {
  const support = !product || product === 'null';
  let receiver;
  if (other === 'admin') receiver = await M.User.findOne({ role: { $in: ['admin', 'Admin'] }, deletedAt: null, isBanned: { $ne: true } }).sort({ createdAt: 1 });
  else { objectId(other, 'recipient ID'); receiver = await M.User.findOne({ _id: other, deletedAt: null, isBanned: { $ne: true } }); }
  if (!receiver || sameId(receiver._id, req.user._id)) fail(404, 'This conversation is unavailable.');
  if (support) { if (!isAdmin(receiver) && !isAdmin(req.user)) fail(403, 'Direct support messages require an administrator.'); return { receiver, productId: null, support: true }; }
  objectId(product, 'product ID');
  const listing = await M.Product.findById(product);
  const transaction = await M.Transaction.findOne({ productId: product, $or: [{ buyerId: req.user._id, sellerId: receiver._id }, { buyerId: receiver._id, sellerId: req.user._id }] });
  if (!listing || (!transaction && (listing.status !== 'Approved' || (!sameId(listing.sellerId, receiver._id) && !sameId(listing.sellerId, req.user._id))))) fail(404, 'This listing conversation is unavailable.');
  if (!sameId(listing.sellerId, receiver._id) && !sameId(listing.sellerId, req.user._id)) fail(403, 'Only the buyer and seller can use this conversation.');
  return { receiver, productId: listing._id, support: false };
}
async function removeAccount(userId, actor) {
  const user = await M.User.findById(userId);
  if (!user) fail(404, 'Account not found.');
  if (isAdmin(user) && await M.User.countDocuments({ role: { $in: ['admin', 'Admin'] }, deletedAt: null }) <= 1) fail(409, 'Create another administrator before removing the last administrator.');
  await mongoose.connection.transaction(async session => {
    const parties = { $or: [{ buyerId: userId }, { sellerId: userId }] };
    const activeHandover = await M.Transaction.exists({ ...parties, status: 'Accepted' }).session(session);
    const activeDispute = await M.Dispute.exists({ $and: [parties, { $or: [{ status: { $in: ['open', 'accepted'] } }, { reviewStatus: { $in: ['unreviewed', 'reviewing'] } }] }] }).session(session);
    if (activeHandover || activeDispute) fail(409, 'An accepted meetup or open refund/dispute needs review before automatic deletion. Cancel the meetup or submit a privacy deletion request for human review.');
    const staleReservations = await M.Transaction.find({ buyerId: userId, status: { $ne: 'Completed' } }).session(session).select('_id');
    await M.Product.updateMany({ reservedTransactionId: { $in: staleReservations.map(item => item._id) }, sellerId: { $ne: userId }, status: 'Reserved' }, { status: 'Approved', reservedTransactionId: null }, { session });
    await M.MediaAsset.deleteMany({ ownerId: userId }, { session });
    await M.Product.deleteMany({ sellerId: userId }, { session });
    await M.Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }, { session });
    await M.Session.deleteMany({ userId }, { session });
    await M.PasswordReset.deleteMany({ userId }, { session });
    await M.Notification.deleteMany({ userId }, { session });
    await M.PrivacyRequest.deleteMany({ userId }, { session });
    await M.Report.updateMany({ reporter: userId }, { $set: { reporter: null, message: '[Removed at account deletion]' } }, { session });
    await M.Report.updateMany({ reportedUser: userId }, { $set: { reportedUser: null, resolution: '[Account removed]' } }, { session });
    await M.Transaction.updateMany({ sellerId: userId, status: 'Pending' }, { $set: { status: 'Cancelled', active: false } }, { session });
    await M.Transaction.updateMany({ buyerId: userId, status: 'Pending' }, { $set: { status: 'Cancelled', active: false } }, { session });
    await M.Transaction.updateMany({ sellerId: userId }, { $set: { sellerId: null, sellerName: 'Deleted account', productId: null, productTitle: 'Removed listing', active: false, message: '', meetupLocation: '', meetupTime: '' } }, { session });
    await M.Transaction.updateMany({ buyerId: userId }, { $set: { buyerId: null, buyerName: 'Deleted account', active: false, message: '', meetupLocation: '', meetupTime: '' } }, { session });
    await M.Dispute.updateMany({ requesterId: userId }, { $set: { requesterId: null, reason: '[Removed at account deletion]', adminNote: '' } }, { session });
    await M.Dispute.updateMany({ buyerId: userId }, { $set: { buyerId: null } }, { session });
    await M.Dispute.updateMany({ sellerId: userId }, { $set: { sellerId: null, response: '', adminNote: '' } }, { session });
    await M.Log.updateMany({ adminId: userId }, { $set: { adminId: null, details: '' } }, { session });
    await M.User.deleteOne({ _id: userId }, { session });
  });
  await audit(sameId(actor?._id, userId) ? null : actor, 'ACCOUNT_REMOVED', '', 'Account and associated personal content removed.');
}
async function purgeRetention(config, now = new Date()) {
  const ago = days => new Date(now.getTime() - days * DAY);
  const heldTransactions = await M.Dispute.distinct('transactionId', { $or: [{ status: { $in: ['open', 'accepted'] } }, { reviewStatus: { $in: ['unreviewed', 'reviewing'] } }] });
  const results = await Promise.all([
    M.Session.deleteMany({ expiresAt: { $lte: now } }), M.PasswordReset.deleteMany({ expiresAt: { $lte: now } }),
    M.Message.deleteMany({ createdAt: { $lt: ago(config.retention.messagesDays) } }),
    M.Notification.deleteMany({ createdAt: { $lt: ago(config.retention.notificationsDays) } }),
    M.Report.deleteMany({ status: 'resolved', resolvedAt: { $lt: ago(config.retention.reportsDays) } }),
    M.Log.deleteMany({ timestamp: { $lt: ago(config.retention.logsDays) } }),
    M.PrivacyRequest.deleteMany({ status: 'resolved', resolvedAt: { $lt: ago(config.retention.privacyRequestsDays) } }),
    M.AnalyticsDaily.deleteMany({ day: { $lt: ago(config.retention.analyticsDays).toISOString().slice(0, 10) } }),
    M.Transaction.deleteMany({ status: { $in: ['Completed', 'Cancelled'] }, updatedAt: { $lt: ago(config.retention.transactionsDays) }, _id: { $nin: heldTransactions } }),
    M.Dispute.deleteMany({ status: { $in: ['rejected', 'refunded'] }, reviewStatus: 'closed', updatedAt: { $lt: ago(config.retention.disputesDays) } }),
  ]);
  return results.reduce((total, result) => total + result.deletedCount, 0);
}
module.exports = { ...M, publicUser, publicProduct, isAdmin, cookieOptions, issueSession, optionalAuth, protect, admin, notify, audit, productFields, saveImage, participant, touchParticipants, messageContext, removeAccount, purgeRetention, bcrypt, password, consent };
