# Campus Exchange — independent marketplace

Developed and operated by Chandler Noguera. Contact: noguera.chandler.espenilla@gmail.com.

This is an independently operated website, not an official university-operated service. The approved Next.js frontend connects to an Express/Mongoose API. Payments and refunds take place directly between the buyer and seller at meet-up; the application records requests, agreed warranty terms, handovers, and dispute responses.

## Local development

Run `npm ci` in `backend` and `frontend` when installing a fresh copy. Use Node.js 22 or newer.

In one terminal:

```powershell
cd backend
npm run dev:local
```

In another terminal:

```powershell
cd frontend
npm run dev
```

Open http://127.0.0.1:3000. The API uses loopback port 5000 and MongoDB uses loopback port 27018. The managed development launcher persists the database, remembers its directory in `backend/.local/runtime.json`, and does not use the existing `.env` database. Do not commit `.local`, credentials, or database files. Stop a running local instance before starting another one.

Create your administrator explicitly in a third terminal: `cd backend`, then `npm run create-admin`. Choose your own credentials at the prompts. There is no default password and public registration cannot create an administrator. Real inventory starts empty; create and approve listings through the real workflow. Preview access and sample product URLs are removed.

The local launcher disables SMTP by default. Configure real providers deliberately before using email delivery. The application does not pretend an email was delivered if SMTP is missing.

## Verification

- Backend: `cd backend`, `npm test` — isolated MongoDB integration tests, without reading the old `.env` or sending real mail.
- Frontend: `cd frontend`, `npm run lint` and `npm run build`.
- Run the built frontend with `npm start`; dynamic SSR provides a fresh document script nonce.

The main flows have also been tested in a real browser against a separate temporary API/database, including seller/buyer/admin actions, manual warranty refunds, privacy review/export, and logout. Accessibility verification is targeted and does not establish full WCAG conformance.

## Before public use

Public launch is disabled. Operator name/email are configured. Hosting accounts, the actual production database, SMTP delivery, an operator address, and deployment/backup procedures remain to be configured. Public university assets default to disabled until their rights are confirmed. Do not substitute university institutional contact details for the operator’s support/privacy contact. Policies must continue to match actual processing.

See [backend instructions](backend/README.md), [API contract](backend/API_CONTRACT.md), and the website's Privacy, Terms, Cookies, Returns & Refunds, About, and Accessibility pages.


Publishing: see [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel frontend + Render API + MongoDB Atlas configuration. Public launch has not occurred.
