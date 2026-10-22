# Publishing Campus Exchange

Prepared for Chandler Noguera · noguera.chandler.espenilla@gmail.com

## Hosting layout

- Vercel hosts the Next.js frontend. A generated `PROJECT.vercel.app` URL is sufficient; buying a domain is optional.
- A single Render Node web service runs the Express API, image processing, in-memory rate limits, and the hourly retention job.
- MongoDB Atlas stores accounts, moderated listings, sanitized images, conversations, and transactions. Use a dedicated database user, least-privilege database access, a replica-set connection, and the Render service’s documented outbound IP ranges in the Atlas network allowlist.
- A configured SMTP provider delivers password-reset email. The public contact address alone does not configure email delivery.

The Vercel configuration sets skipMiddlewareRequestBody=true: routing middleware reads headers only, while the external rewrite target receives the image/upload JSON body. Verify a near-limit 5MiB upload on the deployed origin; local tests cannot verify provider transport limits.

Browser calls stay at `/api` on the Vercel website. A server-side rewrite forwards them to Render, preserving same-origin session cookies. A private shared `BACKEND_PROXY_KEY` authenticates the proxy. Vercel’s platform client-IP header is forwarded only by the server and is used for rate limits; IPv6 /56 addresses share a bucket. Direct API calls require the private key; `/api/health` is public and only reports readiness.

## Current blockers

No hosting accounts, domain alias, production Atlas database, SMTP delivery, or public operator address has been configured here. No deployment has been performed. Do not copy the existing development `.env` or local MongoDB files into production. The user has not supplied permission to use the university seal; the photo’s license is unverified. Both supplied assets are disabled and return 404 in the default production build. Copyright credits are present at `/copyright` and do not assert permission or endorsement.

## Prepare the repository

The current folder is not a Git repository. Create a private repository containing the root README/DEPLOYMENT files and `frontend`/`backend`. Exclude `.env`, `.local`, `.next*`, node_modules, database files, runtime logs, and credentials. The `.env.example` and `.env.production.example` templates contain placeholders only and may be included. The original supplied images live outside `public/` and are served through a gated Next API route, not an unconditional static path.

## Configure Render

Create a Node web service with root directory `backend`, Node24, build `npm ci --omit=dev`, start `npm start`, and health path `/api/health`. Use one instance; shared rate-limit storage and a single retention-job owner are required before scaling. Choose the service/region/plan deliberately; no plan has been purchased. Configure the values from `backend/.env.production.example` in the provider dashboard:

1. Set the actual Atlas URI, operator address, and SMTP credentials. Never paste credentials into chat, source code, or frontend public variables.
2. Generate a random shared key locally with `node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"`. Store it only as the private `BACKEND_PROXY_KEY` in both hosts.
3. Set `APP_ORIGIN` to the exact stable Vercel production origin, with HTTPS and no trailing slash/path. No wildcards or arbitrary preview URLs. The backend refuses incomplete public configuration.
4. Keep `QCU_AUTHORIZED=false` and `QCU_BRANDING_ENABLED=false`.
5. Run `npm run check:production` in the configured backend environment, then start the service and confirm the health check.

## Configure Vercel

Import the same repository with root directory `frontend` and Next.js framework. `vercel.json` supplies `npm ci`/`npm run build`; select Node24. Configure the Production values from `frontend/.env.production.example`: the actual HTTPS Render origin and matching private key. Leave both university asset flags false. Deploying without the backend origin/key fails the build intentionally. Reserve/read the stable project alias in Vercel settings and place that exact origin in Render before testing account writes. A purchased custom domain is not required.

Keep preview deployments protected and use a separate staging API/database/key if needed. Do not point arbitrary preview branches at the live writable database. The application does not automatically allow generated preview origins.

## Verify before opening registration

Verify through the final Vercel origin: health, real registration/sign-in/logout, HttpOnly Secure cookies, invalid Origin rejection, seller upload/moderation, buyer request and seller handover, agreed warranty/manual refund, privacy tools, and password reset delivered to a mailbox controlled by the operator. Reset links use a URL fragment and are cleared by the frontend. Verify cookie opt-out produces no analytics events. Confirm Google/preview controls are absent and old demo URLs return404. Confirm `/api/brand-assets?asset=seal` and `?asset=campus` return404 publicly. Check mobile keyboard access, support contact, production error logs, database backups/restore, access-log retention, and monitoring. Run the backend integration tests and frontend lint/build before deployment. Live provider behavior and SMTP cannot be certified by local tests.

Create the first administrator explicitly using the existing `create-admin` CLI with the production URI in a private process environment and `--allow-remote`; no default administrator/password exists. Review the policies against the actual host/region/backups before opening public registration. Set `NEXT_PUBLIC_SEARCH_INDEXING=true` and redeploy only after the public verification is complete; private account/admin pages remain noindex.

## Enabling institutional assets later

Obtain/document the applicable rights for both the seal and photograph first. The public frontend requires `NEXT_PUBLIC_QCU_ASSETS_AUTHORIZED=true` and `QCU_AUTHORIZED=true`, followed by a rebuild. The server-side asset endpoint checks authorization again at runtime. A successful local layout preview, credit, copyright notice, or disclaimer is not a record of permission.

## Sources

- [Vercel generated domains](https://vercel.com/docs/domains/working-with-domains)
- [Vercel external rewrites](https://vercel.com/docs/routing/rewrites)
- [Vercel request headers](https://vercel.com/docs/headers/request-headers)
- [Render Express deployment](https://render.com/docs/deploy-node-express-app)
- [Render port binding](https://render.com/docs/web-services)
- [MongoDB Atlas](https://www.mongodb.com/docs/atlas/)

Dependency review: Next.js16.4.2 and current locked runtime packages pass npm audit --omit=dev with zero reported advisories. Five high audit entries remain in the development-only eslint-config-next → fast-glob → micromatch → braces chain; no patched braces release is reported. Do not run audit fix --force, which proposes downgrading the framework lint configuration. Treat build/lint inputs as trusted, monitor for an upstream fix, and recheck before each release.
