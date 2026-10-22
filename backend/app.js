const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');
const mongoose = require('mongoose');
const { validProxyKey, clientRateKey } = require('./lib/proxy');
const { createConfig } = require('./config');
const S = require('./services');
const { ApiError, fail, text, email, objectId, amount, hash, token, sameId, wrap, raster } = require('./lib/security');

function createApp(options = {}) {
  const config = options.config || createConfig();
  const app = express();
  app.locals.config = config;
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  // The hosted API accepts application traffic only through the trusted frontend proxy.
  app.get('/api/health', (_req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'starting' }));
  app.use('/api', (req, res, next) => {
    if (config.backendProxyKey) {
      if (!validProxyKey(req.get('X-Backend-Proxy-Key'), config.backendProxyKey)) return res.status(403).json({ message: 'Use the website to access this service.' });
      req.clientRateKey = clientRateKey(req.get('X-Marketplace-Client-IP'));
      if (!req.clientRateKey) return res.status(400).json({ message: 'The client address could not be verified.' });
    }
    next();
  });
  const rateKey = req => req.clientRateKey || clientRateKey(req.ip) || 'unknown';
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' } }));
  app.use(cors({ origin(origin, callback) { callback(null, !origin || config.origins.includes(origin)); }, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-Requested-With'] }));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(rateLimit({ keyGenerator: rateKey, windowMs: 60000, limit: 240, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many requests. Please wait a minute.' } }));
  app.use((req, _res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (!config.origins.includes(req.get('Origin')) || req.get('X-Requested-With') !== 'XMLHttpRequest') return next(new ApiError(403, 'This request could not be verified. Reload the page and try again.'));
      if (Number(req.get('Content-Length') || 0) > 0 && !req.is('application/json')) return next(new ApiError(415, 'Use application/json for this request.'));
    }
    next();
  });
  app.use(express.json({ limit: '8mb', strict: true }));
  app.use((req, _res, next) => { if (!req.body) req.body = {}; if (Array.isArray(req.body) || typeof req.body !== 'object') return next(new ApiError(400, 'Submit a JSON object.')); next(); });
  app.use(cookieParser());
  app.use(S.optionalAuth);
  const authLimit = rateLimit({ keyGenerator: rateKey, windowMs: 15 * 60000, limit: config.authLimit, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many sign-in requests. Please try again later.' } });
  const writeLimit = rateLimit({ keyGenerator: rateKey, windowMs: 60000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Please wait before posting again.' } });
  const userJson = req => S.publicUser(req.user, req.cookies.qcu_analytics === `yes:${config.policyVersion}`);
  const requireDomain = value => { if (config.emailDomain && !value.endsWith(`@${config.emailDomain}`)) fail(400, 'Use your permitted campus email address.'); };
  const sendUser = (req, res, user) => { req.user = user; res.json({ user: userJson(req) }); };

  app.get('/api/public/config', (_req, res) => res.json({ policyVersion: config.policyVersion, projectStatus: config.publicLaunchEnabled ? 'live' : 'local', publicLaunchEnabled: config.publicLaunchEnabled, qcuAuthorized: config.qcuAuthorized, operator: config.operator, authProviders: { password: true, google: false }, passwordResetAvailable: !!(config.smtp || options.mailer), analytics: { enabled: true, retentionDays: config.retention.analyticsDays }, retention: config.retention }));
  app.get('/api/privacy/consent', (req, res) => res.json({ analytics: req.cookies.qcu_analytics === `yes:${config.policyVersion}`, version: config.policyVersion }));
  app.post('/api/privacy/consent', (req, res) => {
    if (typeof req.body.analytics !== 'boolean' || req.body.version !== config.policyVersion) fail(400, 'Choose an analytics preference for the current policy version.');
    res.cookie('qcu_analytics', `${req.body.analytics ? 'yes' : 'no'}:${config.policyVersion}`, { ...S.cookieOptions(config), maxAge: 180 * 86400000 });
    res.json({ analytics: req.body.analytics, version: config.policyVersion });
  });
  app.post('/api/analytics/events', writeLimit, wrap(async (req, res) => {
    if (req.body.event !== 'page_view' || !['home', 'browse', 'product', 'sell', 'dashboard', 'listings', 'inbox', 'profile', 'safety', 'legal'].includes(req.body.page) || req.body.consent?.analytics !== true || req.body.consent?.version !== config.policyVersion) fail(400, 'A permitted event and explicit current analytics consent are required.');
    if (Object.keys(req.body).some(key => !['event', 'page', 'consent'].includes(key))) fail(400, 'Analytics accepts only an event, a permitted page, and consent.');
    await S.AnalyticsDaily.updateOne({ day: new Date().toISOString().slice(0, 10), event: 'page_view', page: req.body.page }, { $inc: { count: 1 } }, { upsert: true });
    res.status(202).json({ accepted: true });
  }));

  app.post('/api/users/register', authLimit, wrap(async (req, res) => {
    const accepted = S.consent(req.body, 'registration');
    const name = text(req.body.name, 'name', { min: 2, max: 80 }), address = email(req.body.email), secret = S.password(req.body.password);
    requireDomain(address);
    if (await S.User.exists({ email: address })) fail(409, 'An account already exists for that email. Sign in or request a password reset.');
    const user = await S.User.create({ name, email: address, password: await S.bcrypt.hash(secret, 12), role: 'student', consents: [accepted] });
    await S.issueSession(user, req, res); req.user = user;
    res.status(201).json({ user: userJson(req) });
  }));
  app.post('/api/users/login', authLimit, wrap(async (req, res) => {
    const address = email(req.body.email), secret = req.body.password;
    if (typeof secret !== 'string' || !secret.length || Buffer.byteLength(secret, 'utf8') > 72) fail(401, 'Invalid email or password.');
    const user = await S.User.findOne({ email: address }).select('+password');
    const dummy = '$2b$12$wKBTzk5PGw5w2.zggp0weuTs2tHL3OS4vwLJ6s9y1No7cBEK3GnHu';
    const valid = await S.bcrypt.compare(secret, user?.password || dummy);
    if (!user || !valid || user.deletedAt || user.isBanned) fail(401, 'Invalid email or password.');
    await S.issueSession(user, req, res); sendUser(req, res, user);
  }));
  app.get('/api/users/me', S.protect, (req, res) => res.json({ user: userJson(req) }));
  app.post('/api/users/logout', wrap(async (req, res) => {
    if (req.cookies.qcu_session) await S.Session.deleteOne({ tokenHash: hash(req.cookies.qcu_session) });
    res.clearCookie('qcu_session', S.cookieOptions(config)); res.status(204).end();
  }));
  app.post('/api/users/google-login', authLimit, (_req, res) => res.status(410).json({ message: 'Google sign-in has been removed. Use email and password.' }));
  app.post('/api/users/forgot-password', authLimit, wrap(async (req, res) => {
    const address = email(req.body.email);
    const user = await S.User.findOne({ email: address, deletedAt: null, isBanned: { $ne: true } }).select('+password');
    const generic = { message: 'If this email has an eligible account and email delivery is configured, password-reset instructions will be sent.' };
    if (user?.password && (options.mailer || config.smtp)) {
      const raw = token();
      await S.PasswordReset.deleteMany({ userId: user._id });
      const entry = await S.PasswordReset.create({ userId: user._id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 30 * 60000) });
      const link = `${config.origins[0]}/reset-password#token=${raw}`;
      const mail = { from: config.smtp?.from || 'test-only@example.invalid', to: user.email, subject: 'Reset your campus marketplace password', text: `Use this one-time link within 30 minutes to reset your password:\n${link}\n\nIf you did not request this, ignore this email.` };
      try {
        const sender = options.mailer || require('nodemailer').createTransport({ ...config.smtp, from: undefined, requireTLS: !config.smtp.secure, tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true } });
        await sender.sendMail(mail);
      } catch { await S.PasswordReset.deleteOne({ _id: entry._id }); }
    }
    res.status(202).json(generic);
  }));
  app.post('/api/users/reset-password', authLimit, wrap(async (req, res) => {
    const raw = text(req.body.token, 'reset token', { min: 64, max: 64 }), secret = S.password(req.body.password);
    if (!/^[a-f\d]{64}$/.test(raw)) fail(400, 'This reset link is invalid or expired.');
    const hashed = await S.bcrypt.hash(secret, 12);
    await mongoose.connection.transaction(async session => {
      const entry = await S.PasswordReset.findOneAndDelete({ tokenHash: hash(raw), expiresAt: { $gt: new Date() } }, { session });
      if (!entry) fail(400, 'This reset link is invalid or expired. Request a new one.');
      const changed = await S.User.updateOne({ _id: entry.userId, deletedAt: null, isBanned: { $ne: true } }, { password: hashed, emailVerified: true }, { session });
      if (!changed.matchedCount) fail(400, 'This reset link is invalid or expired.');
      await S.Session.deleteMany({ userId: entry.userId }, { session });
    });
    res.clearCookie('qcu_session', S.cookieOptions(config)); res.json({ message: 'Password changed. Sign in with your new password.' });
  }));
  app.patch('/api/users/me', S.protect, wrap(async (req, res) => {
    const allowed = ['name', 'bio', 'contactPreference'];
    if (Object.keys(req.body).some(key => !allowed.includes(key))) fail(400, 'Only name, bio, and contact preference can be changed here.');
    if (req.body.name !== undefined) req.user.name = text(req.body.name, 'name', { min: 2, max: 80 });
    if (req.body.bio !== undefined) req.user.bio = text(req.body.bio, 'bio', { max: 500 });
    if (req.body.contactPreference !== undefined) { if (!['inbox', 'campus-meetup'].includes(req.body.contactPreference)) fail(400, 'Choose a valid contact preference.'); req.user.contactPreference = req.body.contactPreference; }
    await req.user.save();
    await S.Product.updateMany({ sellerId: req.user._id }, { sellerName: req.user.name });
    sendUser(req, res, req.user);
  }));
  app.get('/api/users/notifications', S.protect, wrap(async (req, res) => res.json(await S.Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100).lean())));
  app.patch('/api/users/notifications/read-all', S.protect, wrap(async (req, res) => { await S.Notification.updateMany({ userId: req.user._id }, { isRead: true }); res.json({ message: 'Notifications marked as read.' }); }));
  app.patch('/api/users/notifications/:id/read', S.protect, wrap(async (req, res) => { objectId(req.params.id); const item = await S.Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true }, { new: true }); if (!item) fail(404, 'Notification not found.'); res.json(item); }));
  app.get('/api/users/me/export', S.protect, wrap(async (req, res) => {
    const uid = req.user._id;
    const [listings, transactions, messages, notifications, reports, privacyRequests, disputes, media] = await Promise.all([
      S.Product.find({ sellerId: uid }).lean(), S.Transaction.find({ $or: [{ buyerId: uid }, { sellerId: uid }] }).lean(), S.Message.find({ $or: [{ senderId: uid }, { receiverId: uid }] }).lean(), S.Notification.find({ userId: uid }).lean(), S.Report.find({ reporter: uid }).lean(), S.PrivacyRequest.find({ userId: uid }).lean(), S.Dispute.find({ $or: [{ buyerId: uid }, { sellerId: uid }] }).lean(), S.MediaAsset.find({ ownerId: uid }).select('+data').lean(),
    ]);
    res.attachment('campus-marketplace-data.json');
    res.json({ exportedAt: new Date(), account: userJson(req), listings, transactions, messages, notifications, reports, privacyRequests, disputes, media: media.map(item => ({ _id: item._id, mime: item.mime, width: item.width, height: item.height, data: `data:${item.mime};base64,${item.data.toString('base64')}` })) });
  }));
  app.delete('/api/users/me', S.protect, authLimit, wrap(async (req, res) => {
    if (req.body.confirmation !== 'DELETE') fail(400, 'Type DELETE to confirm account removal.');
    const account = await S.User.findById(req.user._id).select('+password');
    if (!account.password || typeof req.body.password !== 'string' || !await S.bcrypt.compare(req.body.password, account.password)) fail(403, 'Confirm your account password before deleting. Google-only accounts can submit an in-app deletion request.');
    await S.removeAccount(account._id, req.user); res.clearCookie('qcu_session', S.cookieOptions(config)); res.json({ message: 'Your account and associated personal content have been removed.' });
  }));
  app.post('/api/users/me/privacy-requests', S.protect, writeLimit, wrap(async (req, res) => {
    if (!['access', 'correction', 'deletion', 'objection'].includes(req.body.type)) fail(400, 'Choose a valid privacy-request type.');
    const request = await S.PrivacyRequest.create({ userId: req.user._id, type: req.body.type, message: text(req.body.message, 'message', { min: 5, max: 2000 }) });
    res.status(201).json({ request });
  }));
  app.get('/api/users/me/privacy-requests', S.protect, wrap(async (req, res) => res.json({ requests: await S.PrivacyRequest.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(200).lean() })));

  app.get('/api/products', wrap(async (req, res) => {
    const query = { status: 'Approved', deletedAt: null };
    if (req.query.category && req.query.category !== 'All') query.category = text(req.query.category, 'category', { max: 30 });
    if (req.query.search) query.title = { $regex: text(req.query.search, 'search', { max: 120 }).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    res.json((await S.Product.find(query).sort({ createdAt: -1 }).limit(200)).map(S.publicProduct));
  }));
  app.get('/api/products/my-listings', S.protect, wrap(async (req, res) => res.json((await S.Product.find({ sellerId: req.user._id, deletedAt: null }).sort({ createdAt: -1 }).limit(200)).map(S.publicProduct))));
  app.get('/api/products/:id', wrap(async (req, res) => {
    objectId(req.params.id); const item = await S.Product.findById(req.params.id);
    if (!item || item.deletedAt || (!['Approved', 'Reserved', 'Sold'].includes(item.status) && !sameId(item.sellerId, req.user?._id) && !S.isAdmin(req.user))) fail(404, 'Listing not found.');
    res.json(S.publicProduct(item));
  }));
  app.post('/api/products', S.protect, writeLimit, wrap(async (req, res) => {
    if (await S.Product.countDocuments({ sellerId: req.user._id, deletedAt: null }) >= 100) fail(409, 'Manage your existing listings before adding more.');
    const fields = S.productFields(req.body, true), accepted = S.consent(req.body, 'listing');
    const prepared = await raster(req.body.image);
    let item;
    await mongoose.connection.transaction(async session => {
      await S.touchParticipants([req.user._id], session);
      const [image] = await S.MediaAsset.create([{ ownerId: req.user._id, ...prepared }], { session });
      [item] = await S.Product.create([{ ...fields, image: `/api/media/${image._id}`, imageAssetId: image._id, sellerId: req.user._id, sellerName: req.user.name, status: 'Pending', consent: accepted }], { session });
    });
    res.status(201).json(S.publicProduct(item));
  }));
  app.put('/api/products/:id', S.protect, writeLimit, wrap(async (req, res) => {
    objectId(req.params.id); const current = await S.Product.findOne({ _id: req.params.id, sellerId: req.user._id, deletedAt: null });
    if (!current) fail(404, 'Listing not found.');
    const fields = S.productFields(req.body);
    const replacing = req.body.image !== undefined && req.body.image !== current.image;
    const accepted = replacing ? S.consent(req.body, 'listing') : null;
    const prepared = replacing ? await raster(req.body.image) : null;
    let item;
    await mongoose.connection.transaction(async session => {
      await S.touchParticipants([req.user._id], session);
      item = await S.Product.findOne({ _id: req.params.id, sellerId: req.user._id, deletedAt: null }).session(session);
      if (!item) fail(404, 'Listing not found.');
      if (['Reserved', 'Sold'].includes(item.status)) fail(409, 'Cancel an active handover before editing; completed listings cannot be edited.');
      const updates = { ...fields };
      if (prepared) {
        const [image] = await S.MediaAsset.create([{ ownerId: req.user._id, ...prepared }], { session });
        updates.consent = accepted; updates.image = `/api/media/${image._id}`; updates.imageAssetId = image._id;
        if (item.imageAssetId) await S.MediaAsset.deleteOne({ _id: item.imageAssetId }, { session });
      }
      Object.assign(item, updates, { status: 'Pending', rejectionReason: '' }); await item.save({ session });
    });
    res.json(S.publicProduct(item));
  }));
  app.delete('/api/products/:id', S.protect, wrap(async (req, res) => {
    objectId(req.params.id);
    await mongoose.connection.transaction(async session => {
      await S.touchParticipants([req.user._id], session);
      const item = await S.Product.findOne({ _id: req.params.id, sellerId: req.user._id, deletedAt: null }).session(session);
      if (!item) fail(404, 'Listing not found.');
      if (item.status === 'Reserved') fail(409, 'Cancel the accepted meetup before removing this listing.');
      item.status = 'Removed'; item.deletedAt = new Date(); await item.save({ session });
      if (item.imageAssetId) await S.MediaAsset.deleteOne({ _id: item.imageAssetId }, { session });
      await S.Transaction.updateMany({ productId: item._id, status: 'Pending' }, { status: 'Cancelled', active: false }, { session });
    });
    res.json({ message: 'Listing removed.' });
  }));
  app.get('/api/media/:id', wrap(async (req, res) => {
    objectId(req.params.id); const listing = await S.Product.findOne({ imageAssetId: req.params.id, deletedAt: null });
    if (!listing || (!['Approved', 'Reserved', 'Sold'].includes(listing.status) && !sameId(listing.sellerId, req.user?._id) && !S.isAdmin(req.user))) fail(404, 'Image not found.');
    const image = await S.MediaAsset.findById(req.params.id).select('+data'); if (!image) fail(404, 'Image not found.');
    res.set('Content-Type', 'image/webp'); res.set('Content-Disposition', 'inline'); res.send(image.data);
  }));

  require('./routes/secureTransactions')(app, { config, writeLimit });
  require('./routes/secureAdmin')(app, { config });
  app.use((_req, _res, next) => next(new ApiError(404, 'API route not found.')));
  app.use((error, _req, res, _next) => {
    if (error.code === 11000) return res.status(409).json({ message: 'This record already exists. Refresh and try again.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ message: 'This upload is too large. Use an image up to 5 MiB.' });
    if (error instanceof SyntaxError || error.name === 'CastError' || error.name === 'ValidationError') return res.status(400).json({ message: 'Check the submitted fields and try again.' });
    const status = error.status || 500;
    res.status(status).json({ message: status < 500 ? error.message : 'The service could not complete this request. Please try again.', ...(error.fields && status < 500 ? { fields: error.fields } : {}) });
  });
  return app;
}
module.exports = { createApp };
