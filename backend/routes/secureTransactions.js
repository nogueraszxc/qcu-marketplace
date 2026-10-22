const mongoose = require('mongoose');
const S = require('../services');
const { fail, text, objectId, amount, sameId, wrap } = require('../lib/security');

module.exports = function mountTransactions(app, { writeLimit }) {
  app.get('/api/transactions/my-transactions', S.protect, wrap(async (req, res) => {
    const uid = req.user._id;
    const purchases = await S.Transaction.find({ buyerId: uid }).sort({ createdAt: -1 }).limit(200).lean();
    const sales = await S.Transaction.find({ sellerId: uid }).sort({ createdAt: -1 }).limit(200).lean();
    const disputes = await S.Dispute.find({ $or: [{ buyerId: uid }, { sellerId: uid }] }).lean();
    for (const transaction of [...purchases, ...sales]) transaction.disputes = disputes.filter(item => sameId(item.transactionId, transaction._id));
    const seen = new Set([...purchases, ...sales].map(item => `${item.productId}:${sameId(item.buyerId, uid) ? item.sellerId : item.buyerId}`));
    const messages = await S.Message.find({ support: { $ne: true }, $or: [{ senderId: uid }, { receiverId: uid }] }).sort({ createdAt: -1 }).limit(300).lean();
    for (const message of messages) {
      const otherId = sameId(message.senderId, uid) ? message.receiverId : message.senderId;
      const key = `${message.productId}:${otherId}`;
      if (seen.has(key) || !message.productId) continue;
      seen.add(key);
      const listing = await S.Product.findById(message.productId);
      const other = await S.User.findById(otherId);
      if (!listing || !other || listing.deletedAt) continue;
      const selling = sameId(listing.sellerId, uid);
      const inquiry = { _id: `chat-${listing._id}-${otherId}`, isInquiry: true, productId: listing._id, productTitle: listing.title, price: listing.price, warrantyTerms: listing.warrantyTerms, sellerId: listing.sellerId, sellerName: listing.sellerName, buyerId: selling ? other._id : uid, buyerName: selling ? other.name : req.user.name, status: 'Inquiry', createdAt: message.createdAt, disputes: [] };
      (selling ? sales : purchases).push(inquiry);
    }
    const availableAdmin = await S.User.exists({ role: { $in: ['admin', 'Admin'] }, deletedAt: null, isBanned: { $ne: true } });
    const adminThread = availableAdmin && !S.isAdmin(req.user) ? { _id: 'admin-support-thread', productTitle: 'Marketplace support', sellerName: 'Project administration', sellerId: 'admin', status: 'Official', isAdminThread: true, productId: null } : null;
    res.json({ purchases, sales, adminThread });
  }));
  app.post('/api/transactions/buy-request', S.protect, writeLimit, wrap(async (req, res) => {
    const productId = objectId(req.body.productId, 'product ID');
    const location = text(req.body.meetupLocation, 'meetup location', { min: 3, max: 160 });
    const time = text(req.body.meetupTime, 'meetup time', { min: 10, max: 60 });
    const date = new Date(time);
    if (!Number.isFinite(date.getTime()) || date <= new Date() || date > new Date(Date.now() + 90 * 86400000)) fail(400, 'Choose a meetup in the next 90 days.');
    const paymentMethod = ({ Cash: 'Cash', GCash: 'GCash at meet-up', Maya: 'Maya at meet-up', 'GCash at meet-up': 'GCash at meet-up', 'Maya at meet-up': 'Maya at meet-up' })[req.body.paymentMethod];
    if (!paymentMethod) fail(400, 'Choose cash, GCash, or Maya paid directly at the meetup.');
    const message = text(req.body.message || '', 'message', { max: 1000 });
    let transaction;
    await mongoose.connection.transaction(async session => {
      const product = await S.Product.findOne({ _id: productId, status: 'Approved', deletedAt: null }).session(session);
      if (!product) fail(409, 'This item is no longer available.');
      if (!product.warrantyTerms || !product.imageAssetId) fail(409, 'This legacy listing needs updated seller terms and a safe image before a meetup can be requested.');
      if (sameId(product.sellerId, req.user._id)) fail(400, 'You cannot request your own listing.');
      await S.touchParticipants([req.user._id, product.sellerId], session);
      [transaction] = await S.Transaction.create([{ productId: product._id, productTitle: product.title, price: product.price, warrantyTerms: product.warrantyTerms, buyerId: req.user._id, buyerName: req.user.name, sellerId: product.sellerId, sellerName: product.sellerName, meetupLocation: location, meetupTime: date.toISOString(), paymentMethod, message }], { session });
      await S.notify(product.sellerId, 'A buyer sent a meetup request for your listing.', String(transaction._id), session);
    });
    res.status(201).json(transaction);
  }));
  const changeStatus = wrap(async (req, res) => {
    objectId(req.params.id, 'transaction ID');
    const nextStatus = req.body.status;
    if (!['Accepted', 'Completed', 'Cancelled'].includes(nextStatus)) fail(400, 'Choose a valid handover status.');
    let updated;
    await mongoose.connection.transaction(async session => {
      const transaction = await S.Transaction.findById(req.params.id).session(session);
      if (!transaction || (!sameId(transaction.buyerId, req.user._id) && !sameId(transaction.sellerId, req.user._id))) fail(404, 'Transaction not found.');
      const seller = sameId(transaction.sellerId, req.user._id);
      if (nextStatus !== 'Cancelled' && !seller) fail(403, 'Only the seller can accept or record a completed handover.');
      if (nextStatus === 'Accepted') {
        if (transaction.status !== 'Pending') fail(409, 'Only a pending request can be accepted.');
        const product = await S.Product.findOneAndUpdate({ _id: transaction.productId, status: 'Approved', deletedAt: null, reservedTransactionId: null }, { status: 'Reserved', reservedTransactionId: transaction._id }, { session, new: true });
        if (!product) fail(409, 'Another meetup already reserved this item.');
        await S.Transaction.updateMany({ productId: transaction.productId, _id: { $ne: transaction._id }, status: 'Pending' }, { status: 'Cancelled', active: false }, { session });
      } else if (nextStatus === 'Completed') {
        if (transaction.status !== 'Accepted') fail(409, 'Accept the request before recording a handover.');
        const product = await S.Product.findOneAndUpdate({ _id: transaction.productId, status: 'Reserved', reservedTransactionId: transaction._id }, { status: 'Sold', reservedTransactionId: null }, { session, new: true });
        if (!product) fail(409, 'This reservation is no longer active.');
        transaction.active = false; transaction.completedAt = new Date();
      } else {
        if (!['Pending', 'Accepted'].includes(transaction.status)) fail(409, 'Completed or cancelled transactions cannot be cancelled again.');
        if (transaction.status === 'Accepted') await S.Product.updateOne({ _id: transaction.productId, status: 'Reserved', reservedTransactionId: transaction._id }, { status: 'Approved', reservedTransactionId: null }, { session });
        transaction.active = false;
      }
      transaction.status = nextStatus; await transaction.save({ session }); updated = transaction;
      await S.notify(seller ? transaction.buyerId : transaction.sellerId, `Your meetup request is now ${nextStatus.toLowerCase()}. This is a manual handover record, not processed payment.`, String(transaction._id), session);
    });
    res.json(updated);
  });
  app.patch('/api/transactions/:id/status', S.protect, changeStatus);
  app.put('/api/transactions/:id/status', S.protect, changeStatus);
  app.get('/api/transactions/messages/:otherUserId/:productId', S.protect, wrap(async (req, res) => {
    const context = await S.messageContext(req, req.params.otherUserId, req.params.productId);
    let query;
    if (context.support && !S.isAdmin(req.user)) query = { support: true, $or: [{ senderId: req.user._id }, { receiverId: req.user._id }] };
    else query = { productId: context.productId, $or: [{ senderId: req.user._id, receiverId: context.receiver._id }, { senderId: context.receiver._id, receiverId: req.user._id }] };
    const messages = await S.Message.find(query).sort({ createdAt: -1, _id: -1 }).limit(200).lean();
    res.json(messages.reverse());
  }));
  app.post('/api/transactions/messages', S.protect, writeLimit, wrap(async (req, res) => {
    const context = await S.messageContext(req, req.body.receiverId, req.body.productId);
    const content = text(req.body.text, 'message', { min: 1, max: 3000 });
    let message;
    await mongoose.connection.transaction(async session => {
      await S.touchParticipants([req.user._id, context.receiver._id], session);
      [message] = await S.Message.create([{ senderId: req.user._id, receiverId: context.receiver._id, productId: context.productId, support: context.support, text: content }], { session });
      await S.notify(context.receiver._id, context.support ? 'You received a project-support message.' : 'You received a message about a listing.', String(context.productId || 'support'), session);
    });
    res.status(201).json(message);
  }));
  app.get('/api/transactions/:id/disputes', S.protect, wrap(async (req, res) => { await S.participant(req.params.id, req.user); res.json(await S.Dispute.find({ transactionId: req.params.id }).sort({ createdAt: -1 }).lean()); }));
  app.post('/api/transactions/:id/disputes', S.protect, writeLimit, wrap(async (req, res) => {
    const transaction = await S.participant(req.params.id, req.user);
    if (!sameId(transaction.buyerId, req.user._id) && !sameId(transaction.sellerId, req.user._id)) fail(403, 'Only participants can open a request.');
    if (!['refund', 'dispute'].includes(req.body.type)) fail(400, 'Choose refund or dispute.');
    if (req.body.type === 'refund' && (!sameId(transaction.buyerId, req.user._id) || transaction.status !== 'Completed')) fail(409, 'Only the buyer can request a refund after a recorded handover.');
    if (await S.Dispute.exists({ transactionId: transaction._id, status: { $in: ['open', 'accepted'] } })) fail(409, 'This handover already has an open request.');
    const fields = { transactionId: transaction._id, requesterId: req.user._id, buyerId: transaction.buyerId, sellerId: transaction.sellerId, type: req.body.type, reason: text(req.body.reason, 'reason', { min: 10, max: 2000 }), amount: amount(req.body.amount ?? 0, 'requested amount', transaction.price) };
    let dispute;
    await mongoose.connection.transaction(async session => { await S.touchParticipants([req.user._id, transaction.buyerId, transaction.sellerId], session); [dispute] = await S.Dispute.create([fields], { session }); });
    await S.notify(sameId(req.user._id, transaction.buyerId) ? transaction.sellerId : transaction.buyerId, 'A participant opened a manual refund/dispute request. No funds were moved.', String(transaction._id));
    res.status(201).json(dispute);
  }));
  app.patch('/api/transactions/:id/disputes/:disputeId', S.protect, wrap(async (req, res) => {
    const transaction = await S.participant(req.params.id, req.user); objectId(req.params.disputeId);
    if (!sameId(transaction.sellerId, req.user._id)) fail(403, 'The seller must respond to this request.');
    const dispute = await S.Dispute.findOne({ _id: req.params.disputeId, transactionId: transaction._id });
    if (!dispute) fail(404, 'Request not found.');
    const allowed = dispute.status === 'open' ? ['accepted', 'rejected'] : dispute.status === 'accepted' ? ['refunded'] : [];
    if (!allowed.includes(req.body.status)) fail(409, 'This request cannot move to that status.');
    const updated = await S.Dispute.findOneAndUpdate({ _id: dispute._id, status: dispute.status }, { status: req.body.status, active: req.body.status === 'accepted', response: text(req.body.response, 'seller response', { min: 5, max: 2000 }), respondedAt: new Date() }, { new: true });
    if (!updated) fail(409, 'The request changed. Refresh before responding.');
    await S.notify(transaction.buyerId, 'The seller updated your manual refund/dispute request. Check the response; the platform does not process refunds.', String(transaction._id));
    res.json(updated);
  }));
  app.post('/api/reports', S.protect, writeLimit, wrap(async (req, res) => {
    const productId = objectId(req.body.product, 'product ID'); const product = await S.Product.findOne({ _id: productId, deletedAt: null });
    const completedParticipant = product && ['Reserved', 'Sold'].includes(product.status) && await S.Transaction.exists({ productId, $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }] });
    if (!product || (product.status !== 'Approved' && !completedParticipant) || sameId(product.sellerId, req.user._id)) fail(404, 'This listing cannot be reported here.');
    const report = await S.Report.create({ reporter: req.user._id, reportedUser: product.sellerId, product: product._id, message: text(req.body.message, 'report details', { min: 10, max: 2000 }), status: 'pending' });
    res.status(201).json(report);
  }));
};
