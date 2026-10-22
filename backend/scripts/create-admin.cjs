const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { email, password, text } = require('../lib/security');
const { POLICY_VERSION } = require('../config');
const readline = require('node:readline/promises');
async function secretPrompt(prompt) {
  if (!process.stdin.isTTY) throw new Error('Set CREATE_ADMIN_PASSWORD explicitly when using a noninteractive terminal.');
  process.stdout.write(prompt); process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const handler = chunk => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') { cleanup(); reject(new Error('Cancelled.')); return; }
        if (char === '\r' || char === '\n') { cleanup(); resolve(value); return; }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1); else if (char >= ' ') value += char;
      }
    };
    const cleanup = () => { process.stdin.off('data', handler); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); };
    process.stdin.on('data', handler);
  });
}
(async () => {
  let uri = process.env.MONGO_URI;
  if (!uri) {
    const file = path.join(__dirname, '..', '.local', 'runtime.json');
    if (!fs.existsSync(file)) throw new Error('Start npm run dev:local first, or explicitly set MONGO_URI. This CLI never loads .env.');
    const runtime = JSON.parse(fs.readFileSync(file, 'utf8')); uri = runtime.mongoUri;
  }
  if (!uri || (!/^mongodb:\/\/(127\.0\.0\.1|localhost|\[::1\])(?=[:/])/.test(uri) && !process.argv.includes('--allow-remote'))) throw new Error('Remote database administration requires an explicit MONGO_URI and --allow-remote.');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const address = email(process.env.CREATE_ADMIN_EMAIL || await rl.question('Administrator email: '));
  const name = text(process.env.CREATE_ADMIN_NAME || await rl.question('Administrator name: '), 'name', { min: 2, max: 80 });
  rl.close();
  const secret = password(process.env.CREATE_ADMIN_PASSWORD || await secretPrompt('Administrator password (hidden; 12+ characters): '));
  await mongoose.connect(uri);
  const existing = await User.findOne({ email: address }).select('+password');
  if (existing) {
    if (!process.argv.includes('--promote-existing') || !existing.password || !await bcrypt.compare(secret, existing.password)) throw new Error('An existing account is not changed without --promote-existing and its current password.');
    if (existing.isBanned || existing.deletedAt) throw new Error('Suspended or deleted accounts cannot be promoted by this CLI.');
    existing.role = 'admin'; await existing.save();
  } else await User.create({ name, email: address, password: await bcrypt.hash(secret, 12), role: 'admin', consents: [{ kind: 'operator', version: POLICY_VERSION, acceptedAt: new Date() }] });
  process.stdout.write('Administrator account created or explicitly promoted. No default password was generated.\n');
})().catch(error => { process.stderr.write(`Administrator setup failed: ${error.message}\n`); process.exitCode = 1; }).finally(() => mongoose.disconnect());
