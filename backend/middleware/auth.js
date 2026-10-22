const { protect, admin } = require('../services');
module.exports = { auth: protect, adminAuth: admin };
