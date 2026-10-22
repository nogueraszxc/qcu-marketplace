import { policyVersion } from './policies';
export const consentStorageKey = 'qcu-privacy-choice';
export const consentLifetimeDays = 180;
let memoryChoice = null;
export function parseConsent(raw) {
  try {
    const value = JSON.parse(raw);
    return value?.version === policyVersion && typeof value.analytics === 'boolean' && Number(value.expiresAt) > Date.now() ? value : null;
  } catch { return null; }
}
export function consentSnapshot() {
  if (typeof window === 'undefined') return null;
  let raw = memoryChoice;
  try { raw = localStorage.getItem(consentStorageKey) || memoryChoice; } catch { /* This visit can still have a choice. */ }
  return parseConsent(raw) ? raw : null;
}
export function subscribeConsent(callback) {
  window.addEventListener('storage', callback);
  window.addEventListener('qcu:privacy-choice', callback);
  return () => { window.removeEventListener('storage', callback); window.removeEventListener('qcu:privacy-choice', callback); };
}
export function writeConsent(analytics) {
  const value = { version: policyVersion, analytics: analytics === true, updatedAt: new Date().toISOString(), expiresAt: Date.now() + consentLifetimeDays * 86400000 };
  memoryChoice = JSON.stringify(value);
  try { localStorage.setItem(consentStorageKey, memoryChoice); } catch { /* Retain the choice for this visit only. */ }
  window.dispatchEvent(new Event('qcu:privacy-choice'));
  return value;
}
const pageNames = { '/': 'home', '/browse': 'browse', '/product/[id]': 'product', '/sell': 'sell', '/dashboard': 'dashboard', '/my-listings': 'listings', '/transactions': 'inbox', '/profile': 'profile', '/safety': 'safety', '/privacy': 'legal', '/terms': 'legal', '/cookies': 'legal', '/refunds': 'legal', '/about': 'legal', '/accessibility': 'legal' };
export function analyticsPage(pathname) { return pageNames[pathname] || null; }
