// Reads an explicitly configured production environment without contacting any service.
require('dotenv').config({ quiet: true });
const { createConfig } = require('../config');
try {
  if (process.env.NODE_ENV !== 'production' || process.env.PUBLIC_LAUNCH_ENABLED !== 'true') throw new Error('Set NODE_ENV=production and PUBLIC_LAUNCH_ENABLED=true for this check.');
  const config = createConfig();
  if (!/^mongodb(?:\+srv)?:\/\//.test(config.mongoUri)) throw new Error('MONGO_URI must be a MongoDB connection string.');
  if (!config.smtp) throw new Error('Password recovery requires SMTP configuration.');
  console.log('Production configuration is complete. Database connectivity, mail delivery, account flows, backups and asset permissions still need live verification.');
} catch (error) { console.error(`Production configuration incomplete: ${error.message}`); process.exitCode = 1; }
