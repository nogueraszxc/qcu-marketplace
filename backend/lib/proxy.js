const { timingSafeEqual } = require('node:crypto');
const ipaddr = require('ipaddr.js');
function validProxyKey(provided, expected) {
  if (typeof provided !== 'string' || !expected) return false;
  const first = Buffer.from(provided), second = Buffer.from(expected);
  return first.length === second.length && timingSafeEqual(first, second);
}
function clientRateKey(value) {
  if (typeof value !== 'string' || !ipaddr.isValid(value)) return null;
  let address = ipaddr.parse(value);
  if (address.kind() === 'ipv6' && address.isIPv4MappedAddress()) address = address.toIPv4Address();
  if (address.kind() === 'ipv4') return address.toString();
  // Share a bucket across an IPv6 /56, rather than allowing address rotation to bypass limits.
  return `${address.toByteArray().slice(0, 7).map(byte => byte.toString(16).padStart(2, '0')).join('')}/56`;
}
module.exports = { validProxyKey, clientRateKey };
