const mongoose = require('mongoose');
const S = require('../services');
const { fail, text, objectId, sameId, wrap } = require('../lib/security');
module.exports = function mountAdmin(app, { config }) {
  const guards = [S.protect, S.admin];
  app.get('/api/admin/stats', ...guards, wrap(async (_req, res) => {
    const [totalUsers, totalProducts, totalReports] = await Promise.all([S.User.countDocuments({ deletedAt: null }), S.Product.countDocuments({ status: 'Approved', deletedAt: null }), S.Report.countDocuments({ status: 'pending' })]);
    res.json({ totalUsers, totalProducts, totalReports });
  }));
  app.get('/api/admin/users', ...guards, wrap(async (_req, res) => res.json((await S.User.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(200)).map(user => ({ ...S.publicUser(user), isBanned: !!user.isBanned })))));
  app.get('/api/admin/products', ...guards, wrap(async (req, res) => {
    const query = { deletedAt: null };
    if (req.query.search) query.title = { $regex: text(req.query.search, 'search', { max: 120 }).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    res.json((await S.Product.find(query).sort({ createdAt: -1 }).limit(200)).map(S.publicProduct));
  }));
  app.get('/api/admin/reports', ...guards, wrap(async (_req, res) => res.json(await S.Report.find().populate('reporter', 'name').populate('reportedUser', 'name').sort({ createdAt: -1 }).limit(200).lean())));
  app.get('/api/admin/logs', ...guards, wrap(async (_req, res) => res.json(await S.Log.find().populate('adminId', 'name email').sort({ timestamp: -1 }).limit(200).lean())));
  app.put('/api/admin/products/:id/approve', ...guards, wrap(async (req, res) => {
    objectId(req.params.id);
    const candidate = await S.Product.findById(req.params.id);
    if (!candidate?.warrantyTerms || !candidate.imageAssetId || !await S.MediaAsset.exists({ _id: candidate.imageAssetId, ownerId: candidate.sellerId })) fail(409, 'The seller must provide warranty terms and re-upload a safe raster image before this legacy listing can be approved.');
    const item = await S.Product.findOneAndUpdate({ _id: req.params.id, deletedAt: null, status: { $in: ['Pending', 'Rejected'] } }, { status: 'Approved', rejectionReason: '' }, { new: true });
    if (!item) fail(409, 'Only a pending or rejected listing can be approved.');
    await S.audit(req.user, 'LISTING_APPROVED', item._id, 'Listing reviewed and approved.');
    await S.notify(item.sellerId, 'Your listing was approved and is now visible in the marketplace.', String(item._id));
    res.json(S.publicProduct(item));
  }));
  app.put('/api/admin/products/:id/reject', ...guards, wrap(async (req, res) => {
    objectId(req.params.id); const reason = text(req.body.reason, 'rejection reason', { min: 5, max: 1000 });
    const item = await S.Product.findOneAndUpdate({ _id: req.params.id, deletedAt: null, status: { $in: ['Pending', 'Approved', 'Rejected'] } }, { status: 'Rejected', rejectionReason: reason }, { new: true });
    if (!item) fail(409, 'This listing cannot be rejected in its current state.');
    await S.audit(req.user, 'LISTING_REJECTED', item._id, 'Listing rejected with a reason visible to its seller.');
    await S.notify(item.sellerId, 'A listing needs changes. Check the rejection reason in My listings.', String(item._id));
    res.json(S.publicProduct(item));
  }));
  app.delete('/api/admin/products/:id', ...guards, wrap(async (req, res) => {
    objectId(req.params.id);
    await mongoose.connection.transaction(async session => {
      const item = await S.Product.findOne({ _id: req.params.id, deletedAt: null }).session(session);
      if (!item) fail(404, 'Listing not found.');
      item.status = 'Removed'; item.deletedAt = new Date(); item.reservedTransactionId = null; await item.save({ session });
      if (item.imageAssetId) await S.MediaAsset.deleteOne({ _id: item.imageAssetId }, { session });
      await S.Transaction.updateMany({ productId: item._id, status: { $in: ['Pending', 'Accepted'] } }, { status: 'Cancelled', active: false }, { session });
      await S.notify(item.sellerId, 'A listing was removed by project administration.', String(item._id), session);
    });
    await S.audit(req.user, 'LISTING_REMOVED', req.params.id, 'Listing and uploaded image removed from availability.');
    res.json({ message: 'Listing removed.' });
  }));
  app.delete('/api/admin/users/:id', ...guards, wrap(async (req, res) => {
    objectId(req.params.id); if (sameId(req.params.id, req.user._id)) fail(409, 'Use your profile to remove your own account.');
    await S.removeAccount(req.params.id, req.user); res.json({ message: 'Account and associated personal content removed.' });
  }));
  app.patch('/api/admin/users/:id', ...guards, wrap(async (req, res) => {
    objectId(req.params.id); if (sameId(req.params.id, req.user._id) || typeof req.body.isBanned !== 'boolean') fail(400, 'Choose a valid account moderation action.');
    const user = await S.User.findById(req.params.id); if (!user || S.isAdmin(user)) fail(404, 'Student account not found.');
    user.isBanned = req.body.isBanned; await user.save(); if (user.isBanned) await S.Session.deleteMany({ userId: user._id });
    await S.audit(req.user, user.isBanned ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_RESTORED', user._id);
    res.json({ ...S.publicUser(user), isBanned: user.isBanned });
  }));
  app.put('/api/admin/reports/:id/resolve', ...guards, wrap(async (req, res) => {
    objectId(req.params.id); const warning = text(req.body.warningMessage || req.body.resolution || '', 'response', { max: 2000 });
    const report = await S.Report.findById(req.params.id); if (!report) fail(404, 'Report not found.');
    report.status = 'resolved'; report.resolvedAt = new Date(); report.resolution = warning || 'Reviewed by project administration.'; await report.save();
    if (warning && report.reportedUser) { await S.Message.create({ senderId: req.user._id, receiverId: report.reportedUser, productId: null, support: true, text: `[Project administration]: ${warning}` }); await S.notify(report.reportedUser, 'Project administration sent a message about a report.', 'support'); }
    await S.audit(req.user, 'REPORT_RESOLVED', report._id, 'Report reviewed and resolved.'); res.json(report);
  }));
  app.get('/api/admin/privacy-requests', ...guards, wrap(async (_req, res) => res.json(await S.PrivacyRequest.find().populate('userId', 'name email').sort({ createdAt: -1 }).limit(200).lean())));
  app.patch('/api/admin/privacy-requests/:id', ...guards, wrap(async (req, res) => {
    objectId(req.params.id); if (req.body.status !== 'resolved') fail(400, 'Choose resolved after reviewing and acting on the request.');
    const response = text(req.body.response, 'response', { min: 5, max: 2000 });
    const request = await S.PrivacyRequest.findById(req.params.id); if (!request) fail(404, 'Privacy request not found.');
    request.status = 'resolved'; request.response = response; request.resolvedAt = new Date(); await request.save();
    await S.notify(request.userId, 'Your privacy request has a project-administration response.', String(request._id));
    await S.audit(req.user, 'PRIVACY_REQUEST_RESOLVED', request._id, 'Response recorded; this status does not itself delete account data.'); res.json(request);
  }));
  app.get('/api/admin/analytics', ...guards, wrap(async (_req, res) => res.json(await S.AnalyticsDaily.find().select('-__v').sort({ day: -1 }).limit(1000).lean())));
  app.get('/api/admin/disputes', ...guards, wrap(async (_req, res) => res.json(await S.Dispute.find().populate('transactionId', 'productTitle buyerName sellerName price warrantyTerms').sort({ createdAt: -1 }).limit(200).lean())));
  app.patch('/api/admin/disputes/:id', ...guards, wrap(async (req, res) => {
    objectId(req.params.id); if (!['reviewing', 'closed'].includes(req.body.reviewStatus) || req.body.status !== undefined) fail(400, 'Administration can record a review, not process or mark a refund.');
    const dispute = await S.Dispute.findById(req.params.id); if (!dispute) fail(404, 'Dispute not found.');
    dispute.reviewStatus = req.body.reviewStatus; dispute.adminNote = text(req.body.adminNote, 'review note', { min: 5, max: 2000 }); await dispute.save();
    await S.audit(req.user, 'DISPUTE_REVIEWED', dispute._id, 'Manual dispute review recorded; no money moved.'); res.json(dispute);
  }));
  app.post('/api/admin/retention/purge', ...guards, wrap(async (req, res) => { const deleted = await S.purgeRetention(config); await S.audit(req.user, 'RETENTION_PURGE', '', `${deleted} expired records removed.`); res.json({ deleted }); }));
};
