# Campus marketplace backend

Express + MongoDB/Mongoose API for an independently operated C2C marketplace. Payments happen directly at a campus meetup. Warranty terms and refund/dispute records do not process money or waive legal rights. This implementation is implemented and locally verified; public deployment still requires operator contact details, branding/permission review, HTTPS, reviewed policies, operational monitoring/backups, and real provider setup.

## Local run

Use Node.js22+ (tested24), `npm ci`, then `npm run dev:local`. The managed local launcher starts a one-member MongoDB replica set on loopback27018 and API on loopback5000. It defaults to `.local/mongodb`, or an explicit `LOCAL_DB_PATH`, and remembers the chosen persistent directory in `.local/runtime.json` for subsequent runs. It overrides existing MONGO_URI. No remote database is used. MongoDB's official binary may download on first use. SMTP are disabled by default in this local launcher; opt in only through `LOCAL_ENABLE_EXTERNAL_SERVICES=true` with deliberately configured credentials.

Start the frontend separately on localhost3000. Its `/api` rewrite must target `http://127.0.0.1:5000/api`; requests need credentials and `X-Requested-With: XMLHttpRequest`. Exact Origin localhost3000/127.0.0.1:3000 is allowed locally. Do not add wildcard origins.

`npm start` is the configured server path. It loads `.env` without printing values, connects to its explicitly configured MongoDB, initializes indexes, purges expired records, and starts the API. Multi-document actions require a replica set (local launcher provides one); standalone MongoDB is unsupported. Server startup never creates demo users or administrator passwords. Existing legacy JWT cookies/headers are ignored.

## Create an administrator explicitly

Run `npm run create-admin` after the local database is running. Supply email/name interactively and password through its hidden prompt, or explicitly set `CREATE_ADMIN_EMAIL`, `CREATE_ADMIN_NAME`, and `CREATE_ADMIN_PASSWORD` in the process environment. Never commit these values or paste them into logs. The CLI reads only its explicitly supplied MONGO_URI or the local runtime file; it never silently reads the old `.env`. Remote administration requires an explicit URI plus `--allow-remote`. Existing accounts require `--promote-existing` and proof of their current password. There are no default administrator credentials and no auto-promotion by email address.

## Verification

`npm test` runs meaningful HTTP integration tests against an isolated ephemeral MongoDB replica set. Tests never load `.env` or use process.env.MONGO_URI, and never send real email requests to external authentication providers. Cases cover role forgery, bcrypt/session cookies, CSRF/IDOR, ownership and moderation, hostile uploads/metadata removal, seller price/warranty snapshots, concurrent reservation, manual refund transitions, deletion case-holds and reservation release, privacy export/history, aggregate consent analytics, one-time reset/revocation, persistence across reconnect, and retention behavior. Test credentials exist only in that isolated database and are destroyed afterward.

`npm audit` must be checked when installing/updating dependencies. Current install was audited with zero reported vulnerabilities during implementation; this does not replace future dependency monitoring or a deployment penetration test.

## Security/operation notes

- Opaque HttpOnly8h sessions stored hashed; no frontend JWT. Exact Origin plus custom-header CSRF protection on every mutation, strict credentialed CORS, bounded JSON, Helmet headers, in-memory request/auth/write rate limits, explicit field picking and scalar validation.
- Passwords bcrypt cost12, at least12 characters, at most72 UTF-8bytes; no forced character classes. Password reset requires SMTP, hashed30min one-time tokens, generic responses, and session revocation. Google sign-in has been removed; the former endpoint returns 410.
- Uploaded raster images are bounded, decoded and re-encoded with metadata removed. No SVG, arbitrary URL fetching, uploaded executable files, or public pending images. MongoDB stores safe WebP bytes.
- MongoDB transactions protect inventory reservations, handover state, and account removal. Database indexes enforce one active buyer request and one active dispute. Active-case deletion needs human review. Completed warranty snapshots can remain pseudonymized evidence until retention; deletion does not erase a counterpart's rights.
- Hourly/startup purge is real, described in API_CONTRACT.md. In-memory rate-limit counters and hourly job assume one API process. A scaled deployment needs a shared rate-limit store and single scheduled-job owner.
- Local mode refuses nonloopback binding. Public launch requires NODE_ENV=production, HTTPS APP_ORIGIN, PUBLIC_LAUNCH_ENABLED=true, OPERATOR_NAME/EMAIL (OPERATOR_ADDRESS is optional and must never be fabricated), and a private BACKEND_PROXY_KEY. University assets default to disabled in public builds; authorization is required before enabling them. It does not claim the university operates the service.
- No secrets, emails, reset links, message bodies, or raw incoming requests are printed by application logging. Add carefully redacted security/uptime monitoring before deployment. Terminate TLS at a properly configured HTTPS proxy; no broad trust-proxy setting is enabled.
- Old unsafe duplicate routers were removed. Model compatibility files re-export the single schema source. Legacy listings lacking safe image/warranty terms require seller update and moderation; run data migration against an audited backup before using an old production database.
- User-provided names/messages/warranty text are plain text; the frontend must retain escaped rendering and its CSP. Do not insert these strings with innerHTML. Data export is private, same-origin, and authenticated.

API details: [API_CONTRACT.md](API_CONTRACT.md). These safeguards are technical behaviors, not a claim of legal certification or completed public-launch review.

Hosted proxy configuration and publishing sequence: see [DEPLOYMENT.md](../DEPLOYMENT.md). Public startup requires SMTP recovery delivery and a private shared proxy key. Per-client limits use only the authenticated proxy header; direct forwarded headers are not trusted.
