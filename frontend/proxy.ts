import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

// _app.getInitialProps keeps pages dynamic so every document uses its own nonce.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const headers = new Headers(request.headers);
    // Never forward client-supplied internal authentication or client-IP headers.
    headers.delete('x-backend-proxy-key'); headers.delete('x-marketplace-client-ip');
    if (process.env.BACKEND_PROXY_KEY) {
      headers.set('x-backend-proxy-key', process.env.BACKEND_PROXY_KEY);
      const platformIP = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for') : null;
      headers.set('x-marketplace-client-ip', platformIP?.split(',')[0]?.trim() || '127.0.0.1');
    }
    return NextResponse.next({ request: { headers } });
  }
  const nonce = randomBytes(24).toString('base64');
  const development = process.env.NODE_ENV !== 'production';
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${development ? ' ws://127.0.0.1:3000 ws://localhost:3000' : ''}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: ['/((?!uploads/|_next/static|_next/image|products/|favicon.ico).*)'] };
