import type { NextConfig } from 'next';

if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_QCU_ASSETS_AUTHORIZED === 'true' && process.env.QCU_AUTHORIZED !== 'true') {
  throw new Error('Public university assets require documented authorization. Keep both flags false until reviewed.');
}
if (process.env.VERCEL === '1' && (!process.env.API_INTERNAL_ORIGIN?.startsWith('https://') || !process.env.BACKEND_PROXY_KEY || process.env.BACKEND_PROXY_KEY.length < 32)) {
  throw new Error('Vercel requires the HTTPS backend origin and a private BACKEND_PROXY_KEY of at least 32 characters.');
}
const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  outputFileTracingIncludes: { "/api/brand-assets": ["./assets/brand/*.png"] },
  async rewrites() {
    const backend = process.env.API_INTERNAL_ORIGIN || 'http://127.0.0.1:5000';
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    ] }];
  },
};

export default nextConfig;
