const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const sharp = require('sharp');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { createApp } = require('../app');
const { createConfig, POLICY_VERSION } = require('../config');
const S = require('../services');
const { hash } = require('../lib/security');
const origin = 'http://127.0.0.1:3000';
const headers = { Origin: origin, 'X-Requested-With': 'XMLHttpRequest' };
const password = 'a sufficiently long password';
const registration = { terms: true, privacy: true, version: POLICY_VERSION };
const listingConsent = { terms: true, imageRights: true, version: POLICY_VERSION };
let replica, app, config, image, seller, buyer, buyer2, stranger, admin, sellerUser, buyerUser, buyer2User, strangerUser, adminUser, product, accepted;
const mail = [];
async function signup(name, email, role) {
  const agent = request.agent(app);
  const response = await agent.post('/api/users/register').set(headers).send({ name, email, password, consent: registration, role });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.user.role, 'student'); assert.equal(response.body.token, undefined); assert.equal(response.body.user.password, undefined);
  return [agent, response.body.user];
}
const listing = extra => ({ title: 'Engineering calculator', description: 'Working calculator for campus use.', price: 500, category: 'Electronics', condition: 'Good', location: 'QCU campus', warrantyTerms: 'No additional seller warranty', image, consent: listingConsent, ...extra });
before(async () => {
  // This test never loads .env and never uses process.env.MONGO_URI.
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' }, instanceOpts: [{ args: ['--wiredTigerCacheSizeGB', '0.25'] }] });
  await mongoose.connect(replica.getUri('qcu_isolated_integration'));
  await Promise.all(Object.values(require('../models')).map(model => model.init()));
  config = createConfig({ APP_ORIGIN: origin, AUTH_RATE_LIMIT: '1000' });
  app = createApp({ config, mailer: { sendMail: async message => { mail.push(message); } } });
  image = `data:image/png;base64,${(await sharp({ create: { width: 32, height: 24, channels: 3, background: { r: 120, g: 30, b: 50 } } }).png().withMetadata({ exif: { IFD0: { Artist: 'Private camera owner' } } }).toBuffer()).toString('base64')}`;
  [seller, sellerUser] = await signup('Seller Student', 'seller@example.test', 'admin');
  [buyer, buyerUser] = await signup('Buyer Student', 'buyer@example.test');
  [buyer2, buyer2User] = await signup('Second Buyer', 'buyer2@example.test');
  [stranger, strangerUser] = await signup('Other Student', 'other@example.test');
  [admin, adminUser] = await signup('Test Administrator', 'admin@example.test');
  await S.User.updateOne({ _id: adminUser._id }, { role: 'admin' });
});
after(async () => { await mongoose.disconnect(); if (replica) await replica.stop(); });

test('cookie sessions, strict CSRF, normalized roles, password hashing and field minimization', async () => {
  const login = await request(app).post('/api/users/login').set(headers).send({ email: 'SELLER@example.test', password });
  assert.equal(login.status, 200);
  assert.match(login.headers['set-cookie'][0], /HttpOnly/); assert.match(login.headers['set-cookie'][0], /SameSite=Lax/);
  assert.equal(login.body.user.role, 'student'); assert.equal(login.body.user.token, undefined);
  const saved = await S.User.findById(sellerUser._id).select('+password');
  assert.match(saved.password, /^\$2[aby]\$12\$/); assert.notEqual(saved.password, password);
  assert.equal((await request(app).get('/api/users/me')).status, 401);
  assert.equal((await request(app).get('/api/users/me').set('Authorization', 'Bearer forged')).status, 401);
  assert.equal((await seller.post('/api/users/logout').send({})).status, 403);
  assert.equal((await seller.post('/api/users/logout').set({ ...headers, Origin: 'https://attacker.test' }).send({})).status, 403);
  assert.equal((await seller.post('/api/users/logout').set('Origin', origin).send({})).status, 403);
  assert.equal((await seller.get('/api/admin/users')).status, 403);
  assert.equal((await seller.patch('/api/users/me').set(headers).send({ role: 'admin', password: 'changed' })).status, 400);
  const changed = await seller.patch('/api/users/me').set(headers).send({ name: 'Updated Seller', bio: 'Engineering student', contactPreference: 'inbox' });
  assert.equal(changed.status, 200); assert.equal(changed.body.user.name, 'Updated Seller');
  assert.equal((await seller.delete('/api/users/me').set(headers).send({ password: 'wrong password', confirmation: 'DELETE' })).status, 403);
  assert.equal((await seller.get('/api/users/me')).status, 200);
  assert.equal((await request(app).post('/api/users/register').set(headers).send({ name: 'No Consent', email: 'noconsent@example.test', password })).status, 400);
  const disabled = await request(app).post('/api/users/google-login').set(headers).send({ email: 'admin@example.test', name: 'Forged administrator' });
  assert.equal(disabled.status, 410);
});

test('listing validation, image sanitation, ownership, moderation and private pending media', async () => {
  const created = await seller.post('/api/products').set(headers).send(listing({ status: 'Approved', sellerId: strangerUser._id, sellerName: 'Forged owner' }));
  assert.equal(created.status, 201, JSON.stringify(created.body)); product = created.body;
  assert.equal(product.sellerId, sellerUser._id); assert.equal(product.status, 'Pending'); assert.equal(product.sellerName, 'Updated Seller');
  assert.equal((await request(app).get(`/api/products/${product._id}`)).status, 404);
  assert.equal((await request(app).get(product.image)).status, 404);
  const asset = await seller.get(product.image); assert.equal(asset.status, 200); assert.match(asset.headers['content-type'], /image\/webp/);
  const metadata = await sharp(asset.body).metadata(); assert.equal(metadata.format, 'webp'); assert.equal(metadata.exif, undefined);
  const ownerExport = await seller.get('/api/users/me/export'); assert.equal(ownerExport.status, 200); assert.match(ownerExport.body.media[0].data, /^data:image\/webp;base64,/);
  assert.equal((await buyer.put(`/api/products/${product._id}`).set(headers).send({ title: 'Stolen listing' })).status, 404);
  assert.equal((await buyer.delete(`/api/products/${product._id}`).set(headers).send({})).status, 404);
  assert.equal((await seller.post('/api/products').set(headers).send(listing({ image: 'https://attacker.test/image.png' }))).status, 400);
  assert.equal((await seller.post('/api/products').set(headers).send(listing({ image: 'data:image/svg+xml;base64,PHN2Zy8+' }))).status, 400);
  assert.equal((await seller.post('/api/products').set(headers).send(listing({ image: 'data:image/png;base64,PHN2Zy8+' }))).status, 400);
  const huge = await sharp({ create: { width: 4097, height: 2, channels: 3, background: 'white' } }).png().toBuffer();
  assert.equal((await seller.post('/api/products').set(headers).send(listing({ image: `data:image/png;base64,${huge.toString('base64')}` }))).status, 400);
  assert.equal((await seller.post('/api/products').set(headers).send(listing({ price: { $gt: 0 } }))).status, 400);
  assert.equal((await seller.post('/api/products').set(headers).send(listing({ warrantyTerms: '' }))).status, 400);
  assert.equal((await buyer.put(`/api/admin/products/${product._id}/approve`).set(headers).send({})).status, 403);
  assert.equal((await admin.put(`/api/admin/products/${product._id}/reject`).set(headers).send({ reason: 'Needs a clearer description.' })).status, 200);
  assert.equal((await admin.put(`/api/admin/products/${product._id}/approve`).set(headers).send({})).status, 200);
  const publicListing = await request(app).get(`/api/products/${product._id}`); assert.equal(publicListing.status, 200); assert.equal(publicListing.body.consent, undefined);
  assert.equal((await request(app).get('/api/products?search=%5B')).status, 200);
  assert.equal((await request(app).get('/api/products/not-an-id')).status, 400);
});

test('participant-scoped chat, inquiry threads, support and notification ownership', async () => {
  const message = await buyer.post('/api/transactions/messages').set(headers).send({ receiverId: sellerUser._id, productId: product._id, text: 'Is this calculator available?', senderId: adminUser._id });
  assert.equal(message.status, 201); assert.equal(message.body.senderId, buyerUser._id);
  const list = await buyer.get('/api/transactions/my-transactions'); assert.equal(list.status, 200); assert.equal(list.body.purchases[0].isInquiry, true);
  const history = await seller.get(`/api/transactions/messages/${buyerUser._id}/${product._id}`); assert.equal(history.body.length, 1);
  assert.equal((await stranger.get(`/api/transactions/messages/${buyerUser._id}/${product._id}`)).status, 404);
  assert.equal((await buyer.post('/api/transactions/messages').set(headers).send({ receiverId: strangerUser._id, productId: null, text: 'A forged direct message.' })).status, 403);
  assert.equal((await buyer.post('/api/transactions/messages').set(headers).send({ receiverId: 'admin', productId: null, text: 'I need help with the project.' })).status, 201);
  assert.equal((await admin.get(`/api/transactions/messages/${buyerUser._id}/null`)).body.length, 1);
  const notifications = await seller.get('/api/users/notifications'); assert.ok(notifications.body.length > 0);
  const id = notifications.body[0]._id;
  assert.equal((await buyer.patch(`/api/users/notifications/${id}/read`).set(headers).send({})).status, 404);
  assert.equal((await seller.patch(`/api/users/notifications/${id}/read`).set(headers).send({})).status, 200);
});

test('meetup price/warranty snapshots, concurrent reservation and valid state transitions', async () => {
  const body = { productId: product._id, meetupLocation: 'Campus main entrance', meetupTime: new Date(Date.now() + 86400000).toISOString(), paymentMethod: 'GCash at meet-up', message: 'Please bring the slide cover.', price: 1, sellerId: strangerUser._id, warrantyTerms: 'Forged terms' };
  assert.equal((await seller.post('/api/transactions/buy-request').set(headers).send(body)).status, 400);
  const one = await buyer.post('/api/transactions/buy-request').set(headers).send(body);
  const two = await buyer2.post('/api/transactions/buy-request').set(headers).send(body);
  assert.equal(one.status, 201); assert.equal(two.status, 201);
  assert.equal(one.body.price, 500); assert.equal(one.body.warrantyTerms, 'No additional seller warranty'); assert.equal(one.body.sellerId, sellerUser._id);
  assert.equal((await buyer.patch(`/api/transactions/${one.body._id}/status`).set(headers).send({ status: 'Accepted' })).status, 403);
  const attempts = await Promise.all([one.body._id, two.body._id].map(id => seller.patch(`/api/transactions/${id}/status`).set(headers).send({ status: 'Accepted' })));
  assert.deepEqual(attempts.map(item => item.status).sort(), [200, 409]); accepted = attempts.find(item => item.status === 200).body;
  assert.equal(await S.Transaction.countDocuments({ productId: product._id, status: 'Accepted' }), 1);
  assert.equal((await S.Product.findById(product._id)).status, 'Reserved');
  const activeBuyer = accepted.buyerId === buyerUser._id ? buyer : buyer2;
  assert.equal((await activeBuyer.delete('/api/users/me').set(headers).send({ password, confirmation: 'DELETE' })).status, 409);
  assert.equal((await seller.delete('/api/users/me').set(headers).send({ password, confirmation: 'DELETE' })).status, 409);
  assert.equal((await S.Product.findById(product._id)).status, 'Reserved');
  assert.equal((await stranger.get(`/api/transactions/${accepted._id}/disputes`)).status, 404);
  assert.equal((await seller.patch(`/api/transactions/${accepted._id}/status`).set(headers).send({ status: 'Completed' })).status, 200);
  assert.equal((await S.Product.findById(product._id)).status, 'Sold');
  assert.equal((await seller.patch(`/api/transactions/${accepted._id}/status`).set(headers).send({ status: 'Cancelled' })).status, 409);
});

test('manual refund/dispute authorization and transition rules never process funds', async () => {
  const participant = accepted.buyerId === buyerUser._id ? buyer : buyer2;
  const opened = await participant.post(`/api/transactions/${accepted._id}/disputes`).set(headers).send({ type: 'refund', reason: 'The display stops working during normal use.', amount: 500 });
  assert.equal(opened.status, 201); assert.equal(opened.body.status, 'open');
  const id = opened.body._id;
  assert.equal((await participant.delete('/api/users/me').set(headers).send({ password, confirmation: 'DELETE' })).status, 409);
  assert.equal((await admin.delete(`/api/admin/users/${sellerUser._id}`).set(headers).send({})).status, 409);
  assert.equal((await participant.post('/api/reports').set(headers).send({ product: product._id, message: 'The sold calculator needs a safety review.' })).status, 201);
  assert.equal((await admin.patch(`/api/admin/disputes/${id}`).set(headers).send({ status: 'refunded', reviewStatus: 'closed', adminNote: 'Cannot move money.' })).status, 400);
  assert.equal((await participant.patch(`/api/transactions/${accepted._id}/disputes/${id}`).set(headers).send({ status: 'accepted', response: 'Buyer cannot self-approve.' })).status, 403);
  assert.equal((await seller.patch(`/api/transactions/${accepted._id}/disputes/${id}`).set(headers).send({ status: 'refunded', response: 'Skipping accepted status.' })).status, 409);
  assert.equal((await seller.patch(`/api/transactions/${accepted._id}/disputes/${id}`).set(headers).send({ status: 'accepted', response: 'I will inspect the issue and arrange a return.' })).status, 200);
  const refund = await seller.patch(`/api/transactions/${accepted._id}/disputes/${id}`).set(headers).send({ status: 'refunded', response: 'Manual refund handed directly to the buyer.' });
  assert.equal(refund.status, 200); assert.equal(refund.body.paymentId, undefined); assert.equal(refund.body.status, 'refunded');
  assert.equal((await seller.delete('/api/users/me').set(headers).send({ password, confirmation: 'DELETE' })).status, 409, 'A final seller status does not bypass an unreviewed case hold');
  assert.equal((await admin.patch(`/api/admin/disputes/${id}`).set(headers).send({ reviewStatus: 'closed', adminNote: 'Reviewed the participants’ manual record.' })).status, 200);
});

test('privacy history/export, consent-gated aggregate analytics and deletion boundaries', async () => {
  const privacy = await buyer.post('/api/users/me/privacy-requests').set(headers).send({ type: 'correction', message: 'Please review the name on my old transaction.' }); assert.equal(privacy.status, 201);
  const mine = await buyer.get('/api/users/me/privacy-requests'); assert.equal(mine.body.requests.length, 1);
  assert.equal((await stranger.get('/api/users/me/privacy-requests')).body.requests.length, 0);
  const listed = await admin.get('/api/admin/privacy-requests'); assert.equal(listed.body[0].userId.email, buyerUser.email);
  assert.equal((await admin.patch(`/api/admin/privacy-requests/${privacy.body.request._id}`).set(headers).send({ status: 'resolved', response: 'Reviewed and explained the current correction options.' })).status, 200);
  const exported = await buyer.get('/api/users/me/export'); assert.equal(exported.status, 200); assert.match(exported.headers['content-disposition'], /attachment/);
  assert.equal(exported.body.account.email, buyerUser.email); assert.equal(exported.body.account.password, undefined); assert.equal(exported.body.sessions, undefined);
  const event = { event: 'page_view', page: 'browse', consent: { analytics: true, version: POLICY_VERSION } };
  assert.equal((await request(app).post('/api/analytics/events').set(headers).send({ ...event, consent: { analytics: false, version: POLICY_VERSION } })).status, 400);
  assert.equal((await request(app).post('/api/analytics/events').set(headers).send({ ...event, url: '?email=private' })).status, 400);
  assert.equal((await request(app).post('/api/analytics/events').set(headers).send(event)).status, 202);
  const aggregates = await S.AnalyticsDaily.find().lean(); assert.equal(aggregates[0].count, 1); assert.deepEqual(Object.keys(aggregates[0]).sort(), ['_id', 'count', 'day', 'event', 'page']);
  assert.equal((await request(app).get('/api/admin/analytics')).status, 401);
  const deleted = await stranger.delete('/api/users/me').set(headers).send({ password, confirmation: 'DELETE' }); assert.equal(deleted.status, 200);
  assert.equal((await stranger.get('/api/users/me')).status, 401); assert.equal(await S.User.exists({ _id: strangerUser._id }), null);
});

test('SMTP reset tokens are hashed, expiring, one-time, and revoke sessions', async () => {
  const unknown = await request(app).post('/api/users/forgot-password').set(headers).send({ email: 'missing@example.test' });
  const known = await request(app).post('/api/users/forgot-password').set(headers).send({ email: sellerUser.email });
  assert.equal(known.status, 202); assert.deepEqual(known.body, unknown.body); assert.equal(mail.length, 1);
  const raw = mail[0].text.match(/#token=([a-f\d]{64})/)[1]; const reset = await S.PasswordReset.findOne({ userId: sellerUser._id });
  assert.equal(reset.tokenHash, hash(raw)); assert.notEqual(reset.tokenHash, raw); assert.equal(known.body.token, undefined);
  assert.equal((await request(app).post('/api/users/reset-password').set(headers).send({ token: raw, password: 'short' })).status, 400);
  assert.equal((await request(app).post('/api/users/reset-password').set(headers).send({ token: raw, password: 'a new sufficiently long password' })).status, 200);
  assert.equal((await seller.get('/api/users/me')).status, 401);
  assert.equal((await request(app).post('/api/users/reset-password').set(headers).send({ token: raw, password })).status, 400);
  assert.equal((await request(app).post('/api/users/login').set(headers).send({ email: sellerUser.email, password: 'a new sufficiently long password' })).status, 200);
});

test('database persistence across connection restart and scheduled retention semantics', async () => {
  const uri = replica.getUri('qcu_isolated_integration');
  await mongoose.disconnect(); await mongoose.connect(uri);
  assert.equal((await admin.get('/api/users/me')).status, 200);
  const old = new Date(Date.now() - 400 * 86400000);
  const stale = await S.Message.create({ senderId: adminUser._id, receiverId: buyerUser._id, text: 'Expired test-only support message.', support: true });
  await S.Message.collection.updateOne({ _id: stale._id }, { $set: { createdAt: old } });
  const pending = await S.Report.create({ reporter: buyerUser._id, reportedUser: sellerUser._id, message: 'Unresolved safety matter.', status: 'pending', createdAt: old });
  const resolved = await S.Report.create({ reporter: buyerUser._id, reportedUser: sellerUser._id, message: 'Old resolved report.', status: 'resolved', resolvedAt: old });
  await S.purgeRetention(config);
  assert.equal(await S.Message.exists({ _id: stale._id }), null); assert.ok(await S.Report.exists({ _id: pending._id })); assert.equal(await S.Report.exists({ _id: resolved._id }), null);
  assert.throws(() => createConfig({ NODE_ENV: 'production', APP_ORIGIN: 'http://example.test' }), /HTTPS/);
  assert.throws(() => createConfig({ NODE_ENV: 'production', APP_ORIGIN: 'https://example.test', PUBLIC_LAUNCH_ENABLED: 'true' }), /operator/);
});

test('cancelled meetup deletion releases availability; completed warranty evidence survives pseudonymization', async () => {
  assert.equal((await seller.post('/api/users/login').set(headers).send({ email: sellerUser.email, password: 'a new sufficiently long password' })).status, 200);
  const [temporaryBuyer, temporaryUser] = await signup('Temporary Buyer', 'temporary@example.test');
  const created = await seller.post('/api/products').set(headers).send(listing({ title: 'Second calculator for deletion test' }));
  assert.equal(created.status, 201); const id = created.body._id;
  await admin.put(`/api/admin/products/${id}/approve`).set(headers).send({});
  const started = await temporaryBuyer.post('/api/transactions/buy-request').set(headers).send({ productId: id, meetupLocation: 'Main campus gate', meetupTime: new Date(Date.now() + 86400000).toISOString(), paymentMethod: 'Cash' });
  assert.equal(started.status, 201);
  await seller.patch(`/api/transactions/${started.body._id}/status`).set(headers).send({ status: 'Accepted' });
  assert.equal((await temporaryBuyer.delete('/api/users/me').set(headers).send({ password, confirmation: 'DELETE' })).status, 409);
  assert.equal((await temporaryBuyer.patch(`/api/transactions/${started.body._id}/status`).set(headers).send({ status: 'Cancelled' })).status, 200);
  assert.equal((await temporaryBuyer.delete('/api/users/me').set(headers).send({ password, confirmation: 'DELETE' })).status, 200);
  const available = await S.Product.findById(id); assert.equal(available.status, 'Approved'); assert.equal(available.reservedTransactionId, null);
  assert.equal(await S.User.exists({ _id: temporaryUser._id }), null);
  assert.equal((await seller.delete('/api/users/me').set(headers).send({ password: 'a new sufficiently long password', confirmation: 'DELETE' })).status, 200);
  const historical = await S.Transaction.findById(accepted._id);
  assert.equal(historical.status, 'Completed'); assert.equal(historical.sellerId, null); assert.equal(historical.sellerName, 'Deleted account'); assert.equal(historical.warrantyTerms, 'No additional seller warranty');
});

test('password whitespace remains exact; expired reset tokens and auth throttling are enforced', async () => {
  const spaced = '  a spaced password  ';
  const created = await request(app).post('/api/users/register').set(headers).send({ name: 'Whitespace Test', email: 'spaces@example.test', password: spaced, consent: registration }); assert.equal(created.status, 201);
  assert.equal((await request(app).post('/api/users/login').set(headers).send({ email: 'spaces@example.test', password: spaced })).status, 200);
  assert.equal((await request(app).post('/api/users/login').set(headers).send({ email: 'spaces@example.test', password: spaced.trim() })).status, 401);
  const raw = 'f'.repeat(64); await S.PasswordReset.create({ userId: created.body.user._id, tokenHash: hash(raw), expiresAt: new Date(Date.now() - 1000) });
  assert.equal((await request(app).post('/api/users/reset-password').set(headers).send({ token: raw, password })).status, 400);
  const limited = createApp({ config: { ...config, authLimit: 2 } });
  for (let i = 0; i < 2; i++) assert.equal((await request(limited).post('/api/users/login').set(headers).send({ email: 'missing@example.test', password })).status, 401);
  assert.equal((await request(limited).post('/api/users/login').set(headers).send({ email: 'missing@example.test', password })).status, 429);
});

test('removed Google sign-in cannot create accounts even with leftover provider configuration', async () => {
  const removed = createApp({ config: { ...config, firebaseProjectId: 'old-configuration' }, firebaseVerifier: async () => { throw new Error('Must never run'); } });
  const count = await S.User.countDocuments();
  const response = await request(removed).post('/api/users/google-login').set(headers).send({ idToken: 'old-provider-token', consent: registration, role: 'admin' });
  assert.equal(response.status, 410); assert.equal(await S.User.countDocuments(), count);
  const publicConfig = await request(removed).get('/api/public/config');
  assert.equal(publicConfig.body.authProviders.google, false); assert.equal(publicConfig.body.projectTeam, undefined);
  assert.equal(publicConfig.body.operator.name, 'Chandler Noguera');
  assert.equal(publicConfig.body.operator.email, 'noguera.chandler.espenilla@gmail.com');
});

test('hosted proxy rejects direct requests and applies separate client and IPv6-subnet auth limits', async () => {
  const key = 'isolated-test-proxy-key-with-more-than-32-characters';
  const hosted = createApp({ config: { ...config, backendProxyKey: key, authLimit: 2 } });
  assert.equal((await request(hosted).get('/api/health')).status, 200);
  assert.equal((await request(hosted).get('/api/public/config')).status, 403);
  assert.equal((await request(hosted).get('/api/public/config').set('X-Backend-Proxy-Key', 'wrong')).status, 403);
  assert.equal((await request(hosted).get('/api/public/config').set('X-Backend-Proxy-Key', key).set('X-Marketplace-Client-IP', 'not-an-ip')).status, 400);
  const asClient = ip => ({ ...headers, 'X-Backend-Proxy-Key': key, 'X-Marketplace-Client-IP': ip });
  for (let i = 0; i < 2; i++) assert.equal((await request(hosted).post('/api/users/login').set(asClient('192.0.2.1')).send({ email: 'missing@example.test', password })).status, 401);
  assert.equal((await request(hosted).post('/api/users/login').set(asClient('192.0.2.1')).send({ email: 'missing@example.test', password })).status, 429);
  assert.equal((await request(hosted).post('/api/users/login').set(asClient('192.0.2.2')).send({ email: 'missing@example.test', password })).status, 401);
  const { clientRateKey } = require('../lib/proxy');
  assert.equal(clientRateKey('2001:db8:1234:5600::1'), clientRateKey('2001:db8:1234:56ff::2'));
  assert.notEqual(clientRateKey('2001:db8:1234:5600::1'), clientRateKey('2001:db8:1234:5700::1'));
});
