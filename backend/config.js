const POLICY_VERSION = '2026-10-22';
function createConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const origins = (env.APP_ORIGIN || (production ? '' : 'http://localhost:3000,http://127.0.0.1:3000')).split(',').map(value => value.trim()).filter(Boolean);
  for (const origin of origins) {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol)) throw new Error('APP_ORIGIN must contain exact HTTP(S) origins without paths.');
    if (production && parsed.protocol !== 'https:') throw new Error('Production APP_ORIGIN requires HTTPS.');
    if (!production && parsed.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) throw new Error('Nonlocal development origins require HTTPS.');
  }
  if (production && !origins.length) throw new Error('Production APP_ORIGIN is required.');
  const publicLaunchEnabled = env.PUBLIC_LAUNCH_ENABLED === 'true';
  const qcuAuthorized = env.QCU_AUTHORIZED === 'true';
  const operator = { name: env.OPERATOR_NAME?.trim() || 'Chandler Noguera', email: env.OPERATOR_EMAIL?.trim() || 'noguera.chandler.espenilla@gmail.com', address: env.OPERATOR_ADDRESS?.trim() || '' };
  if (publicLaunchEnabled && (!production || Object.values(operator).some(value => !value) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(operator.email))) throw new Error('Public launch requires production HTTPS, operator identity/contact/address, and a configured operator address.');
  if (env.QCU_BRANDING_ENABLED === 'true' && !qcuAuthorized) throw new Error('University branding requires documented authorization.');
  if (production && !env.MONGO_URI) throw new Error('Production MONGO_URI is required.');
  const backendProxyKey = env.BACKEND_PROXY_KEY || '';
  if (publicLaunchEnabled && backendProxyKey.length < 32) throw new Error('Public launch requires a private BACKEND_PROXY_KEY of at least 32 characters.');
  if (publicLaunchEnabled && (!env.SMTP_HOST || !env.SMTP_FROM)) throw new Error('Public launch requires configured password-recovery email delivery.');
  return { backendProxyKey, production, origins, publicLaunchEnabled, qcuAuthorized, operator, policyVersion: POLICY_VERSION,
    mongoUri: env.MONGO_URI || 'mongodb://127.0.0.1:27017/qcu_marketplace', port: Number(env.PORT) || 5000,
    host: env.HOST || '127.0.0.1', sessionHours: 8, authLimit: Number(env.AUTH_RATE_LIMIT) || 12,
    emailDomain: env.REQUIRED_EMAIL_DOMAIN?.toLowerCase() || '',
    smtp: env.SMTP_HOST && env.SMTP_FROM ? { host: env.SMTP_HOST, port: Number(env.SMTP_PORT) || 587, secure: Number(env.SMTP_PORT) === 465, auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined, from: env.SMTP_FROM } : null,
    retention: { messagesDays: 365, notificationsDays: 90, reportsDays: 365, logsDays: 365, privacyRequestsDays: 365, analyticsDays: 90, transactionsDays: 365, disputesDays: 365 },
  };
}
module.exports = { createConfig, POLICY_VERSION };
