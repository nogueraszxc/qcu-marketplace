const crypto = require('node:crypto');
const sharp = require('sharp');
const { POLICY_VERSION } = require('../config');
class ApiError extends Error { constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; } }
const fail = (status, message, fields) => { throw new ApiError(status, message, fields); };
function text(value, name, { min = 0, max = 1000, optional = false } = {}) {
  if (optional && value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max || /\u0000/.test(value)) fail(400, `Check ${name}.`, { [name]: `Use ${min}–${max} characters.` });
  return value.trim();
}
function email(value) { const result = text(value, 'email', { min: 3, max: 254 }).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail(400, 'Enter a valid email address.'); return result; }
function password(value) { if (typeof value !== 'string' || value.length < 12 || Buffer.byteLength(value, 'utf8') > 72) fail(400, 'Use a password with at least 12 characters and at most 72 UTF-8 bytes.', { password: 'Use 12+ characters; maximum 72 UTF-8 bytes.' }); return value; }
function objectId(value, name = 'ID') { if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) fail(400, `Invalid ${name}.`); return value; }
function amount(value, name = 'price', max = 1000000) { if ((typeof value !== 'number' && typeof value !== 'string') || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > max || Math.abs(Number(value) * 100 - Math.round(Number(value) * 100)) > 0.00001) fail(400, `Enter a valid ${name} with no more than two decimals.`); return Number(value); }
function consent(body, kind) {
  const policy = body.policyConsent;
  const old = body.consent;
  const accepted = policy ? policy.kind === kind && policy.accepted === true && policy.version === POLICY_VERSION && (kind !== 'listing' || policy.imageRights === true) : old?.version === POLICY_VERSION && old.terms === true && (kind === 'registration' ? old.privacy === true : old.imageRights === true);
  if (!accepted) fail(400, 'Please review and accept the current terms and privacy/image-rights notice.', { consent: 'Current explicit consent is required.' });
  return { kind, version: POLICY_VERSION, acceptedAt: new Date(), imageRights: kind === 'listing' };
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const token = () => crypto.randomBytes(32).toString('hex');
const sameId = (a, b) => !!a && !!b && String(a) === String(b);
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
async function raster(value) {
  if (typeof value !== 'string') fail(400, 'Upload a JPEG, PNG, or WebP image.');
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z\d+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0 || match[2].length > 7 * 1024 * 1024) fail(400, 'Use a valid JPEG, PNG, or WebP image up to 5 MiB. SVG and remote image URLs are not accepted.');
  const data = Buffer.from(match[2], 'base64');
  if (data.length > 5 * 1024 * 1024) fail(400, 'The image must be no larger than 5 MiB.');
  const magic = match[1] === 'png' ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : match[1] === 'jpeg' ? data[0] === 255 && data[1] === 216 && data[2] === 255 : data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
  if (!magic) fail(400, 'The image file does not match its declared raster format.');
  try {
    const pipeline = sharp(data, { limitInputPixels: 4096 * 4096, failOn: 'error', animated: false });
    const metadata = await pipeline.metadata();
    if (metadata.format !== match[1] || !metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096 || (metadata.pages || 1) > 1) fail(400, 'Use a still raster image no larger than 4096 × 4096 pixels.');
    const output = await pipeline.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    return { data: output.data, mime: 'image/webp', width: output.info.width, height: output.info.height };
  } catch (error) { if (error instanceof ApiError) throw error; fail(400, 'This image could not be decoded. Please choose a different JPEG, PNG, or WebP.'); }
}
module.exports = { ApiError, fail, text, email, password, objectId, amount, consent, hash, token, sameId, wrap, raster };
