# Campus Exchange production deployment

## Live services

- Website: https://qcu-marketplace.vercel.app — existing Vercel Hobby project, Next.js, root directory `frontend`, Node 24.
- Backend: https://qcu-marketplace-b08m.onrender.com — existing Render Free web service, root directory `backend`, one Node 24 instance, `npm ci --omit=dev`, start `node server.js`, readiness path `/api/health`.
- Database: existing MongoDB Atlas Free Cluster0, resumed and connected. The existing database and member accounts were retained; the local development database and demo accounts were not imported.
- Source: https://github.com/nogueraszxc/qcu-marketplace, production branch `main`. The local source directory is separate from the Git deployment checkout.

Chandler Noguera operates the independent website. Public support contact: noguera.chandler.espenilla@gmail.com. No public mailing address was supplied, and none has been invented. These deployment notes do not certify legal compliance.

## Private configuration

Browser requests use same-origin `/api` paths. Vercel rewrites to the Render API. A matching private `BACKEND_PROXY_KEY` in both dashboards authenticates the proxy; direct application API requests are rejected. `/api/health` is public and exposes readiness only. `APP_ORIGIN` is exactly `https://qcu-marketplace.vercel.app`.

The Vercel production environment includes the backend origin and private proxy key. Preview environments do not inherit the production key; their build intentionally requires separate configuration before they can connect to a writable backend. Never add arbitrary preview origins to the production allowlist.

`skipMiddlewareRequestBody=true` lets the external rewrite receive upload JSON without proxy-body consumption. A live authenticated request carrying a 5 MiB image payload (6,990,553-byte JSON request) reached backend validation. The intentionally invalid title prevented any listing from being created.

Database URI, proxy key, SMTP credentials, passwords and reset URLs belong only in private configuration. `.env`, `.local`, node_modules, build outputs and logs are excluded from Git and deployment uploads. Do not put real values in the example environment files.

## Email and administrator

Brevo SMTP is configured on port 2525 with STARTTLS and a verified Chandler Noguera sender based on nogueraszxc@gmail.com. Brevo may rewrite the delivery address to its authenticated sending domain. The public support email remains noguera.chandler.espenilla@gmail.com. A real application password-reset email to the owner was confirmed **Delivered** in Brevo logs.

At the authenticated operator's explicit request, the existing account noguera.chandler.espenilla@gmail.com was promoted to administrator and its password was reset to the operator's supplied value. Previous sessions and reset links were revoked. No password is included in these notes or source code. Production administrator sign-in and protected admin access were verified.

For future account creation use `backend/scripts/create-admin.cjs` with an explicit remote URI and `--allow-remote`. Its normal existing-account promotion workflow requires the current password. Do not add automatic admin promotion or a public bootstrap endpoint.

## University imagery and credits

The operator explicitly requested public display of the supplied seal and entrance photograph. `NEXT_PUBLIC_SHOW_UNIVERSITY_ASSETS=true` controls that display preference. It does not claim permission: `QCU_AUTHORIZED` and `NEXT_PUBLIC_QCU_ASSETS_AUTHORIZED` remain false. The old static `/qcu-logo.jpg` file was moved outside `public/`; the two selected assets are served through the allowlisted brand-assets route.

The live copyright page credits the university seal, disclaims official endorsement, identifies the photograph as operator-supplied with unverified photographer/license, and provides a rights-contact route. Credit does not itself grant a license. See [IPOPHL guidance](https://www.ipophil.gov.ph/news/ipophl-answers-8-most-common-questions-on-ctto-sharing-and-uploading-on-social-media/?news_page=2).

## Verification and ongoing operation

Verified: frontend lint and optimized build; 13 isolated backend integration tests; 20 live HTTP checks including Secure/HttpOnly session cookies, owner admin sign-in, unauthorized access, invalid-origin rejection, policy pages and selected image delivery; live logo/photo rendering, credits and admin UI; hosted upload transport without creating content; and actual recovery-email delivery.

The automated tests cover moderation, ownership, chat, meetups, warranty/manual refunds, privacy and reset-token/session behavior. They do not mean a real public sale or payment was performed. No fake public listing or review was created for verification.

Vercel Hobby is selected for the operator's stated personal/non-commercial community marketplace. Render Free sleeps after inactivity, so the first request may take roughly a minute. Its filesystem is ephemeral; application uploads are stored in MongoDB, not local disk. Retention cleanup runs on startup and hourly while the process is awake. Atlas Free currently has no automated backup schedule configured. Review provider limits and backup/restore arrangements as use grows. See [Render Free limits](https://render.com/docs/free).

Search indexing remains disabled while the operator introduces and reviews the service. To enable it later, set `NEXT_PUBLIC_SEARCH_INDEXING=true` in Vercel Production and redeploy. Private account and administrator pages remain noindex.

Update the production branch only after relevant checks. Vercel redeploys from `main`; Render follows changes under `backend`. Environment changes require a rebuild/redeploy. Keep both proxy-key values synchronized and keep institutional authorization metadata truthful.
