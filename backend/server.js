const mongoose = require('mongoose');
const { createConfig } = require('./config');
const { createApp } = require('./app');
const { purgeRetention } = require('./services');

async function start() {
  require('dotenv').config({ quiet: true });
  const config = createConfig();
  if (!config.publicLaunchEnabled && !['127.0.0.1', 'localhost', '::1'].includes(config.host)) throw new Error('Local mode only binds to loopback. Public hosting requires the reviewed public-launch configuration.');
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000, autoIndex: true });
  await Promise.all(Object.values(require('./models')).map(model => model.init()));
  await purgeRetention(config);
  const timer = setInterval(() => purgeRetention(config).catch(() => process.stderr.write('Scheduled retention purge failed; operator attention required.\n')), 3600000);
  timer.unref();
  const server = createApp({ config }).listen(config.port, config.host, () => process.stdout.write(`Campus marketplace API ready on ${config.host}:${config.port} (${config.publicLaunchEnabled ? 'reviewed public configuration' : 'local development'}).\n`));
  const shutdown = () => { clearInterval(timer); server.close(() => mongoose.disconnect().finally(() => process.exit(0))); setTimeout(() => process.exit(1), 10000).unref(); };
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
  return server;
}
if (require.main === module) start().catch(error => { process.stderr.write(`API startup refused: ${/^(Mongo|Mongoose)/.test(error.name) ? 'Database unavailable; verify the configured MongoDB replica set.' : error.message}\n`); process.exitCode = 1; });
module.exports = { start };
