# Campus marketplace API contract

Policy version: `2026-10-22`. The frontend uses same-origin `/api`, proxied to Express (loopback locally; authenticated HTTPS Render service in production). JSON request/response bodies; money is PHP with at most two decimals. This is an independently operated website. It does not process payments or refunds and does not assert QCU endorsement.

## Authentication and request protection

Every POST, PUT, PATCH, DELETE requires the exact allowed browser `Origin` and `X-Requested-With: XMLHttpRequest`. Requests with missing Origin are rejected, including local scripts; tests explicitly supply their isolated allowed Origin. CORS grants credentials only to exact configured origins. No bearer token authentication is accepted.

`qcu_session` is an opaque, random, HttpOnly cookie, path `/api`, SameSite=Lax, Secure in production, eight-hour absolute expiry. Only its SHA-256 hash is stored in MongoDB. Login rotates the current cookie; logout, password reset, suspension, and account removal revoke sessions. At most five sessions per user are retained. The frontend must not put tokens/passwords in localStorage or sessionStorage. `withCredentials: true` is appropriate for the same-origin proxy.

Responses on error are `{message, fields?}`. Usual statuses: 400 invalid data; 401 session absent/expired; 403 denied action/CSRF/incorrect deletion reauthentication; 404 inaccessible record; 409 conflicting state; 413 body too large; 415 wrong content type; 429 rate limit; 410 removed Google sign-in provider. API responses contain no internal error stack or database details.

`user` is `{_id,name,email,role,emailVerified,bio,contactPreference,createdAt,consent,preferences:{analytics}}`. Role is `student` or `admin`. Password hashes, session hashes, reset hashes, and legacy external-auth identifiers are never returned.

## Public configuration, consent, analytics

- `GET /public/config`: `{policyVersion,projectStatus:'local'|'live',publicLaunchEnabled,qcuAuthorized,operator:{name,email,address},authProviders:{password,google},passwordResetAvailable,analytics:{enabled,retentionDays},retention:{messagesDays,notificationsDays,reportsDays,logsDays,privacyRequestsDays,analyticsDays,transactionsDays,disputesDays}}`.
- `GET /privacy/consent`: `{analytics:boolean,version}`.
- `POST /privacy/consent`: `{analytics:boolean,version:'2026-10-22'}`; returns the same preference and sets `qcu_analytics`, HttpOnly/SameSite=Lax/Secure in production, 180 days. Missing/old-version preference means analytics off. This preference is not required for login.
- `POST /analytics/events`: `{event:'page_view',page,consent:{analytics:true,version:'2026-10-22'}}`; 202 `{accepted:true}`. Page is exactly `home`, `browse`, `product`, `sell`, `dashboard`, `listings`, `inbox`, `profile`, `safety`, or `legal`. Extra top-level fields, query-bearing URLs, and absent/false/old consent are rejected. Events can use `credentials:'omit'`; the explicit current consent in each event is required. Only daily `{day,event,page,count}` aggregates are stored, without identity, IP, user agent, raw URL, or referrer. The in-memory rate limiter temporarily uses source IPs separately from analytics.
- `GET /health`: `{status:'ok'|'starting'}`; HTTP200 when connected, HTTP503 when starting.

## Account endpoints

- `POST /users/register`: `{name,email,password,consent:{terms:true,privacy:true,version}}`; 201 `{user}` plus session cookie. Name 2–80; password at least 12 JavaScript string units and at most 72 UTF-8 bytes, no mandatory character classes. Email normalized lowercase. Supplied role is ignored. Optional `REQUIRED_EMAIL_DOMAIN` restricts campus domain. Password registration does not falsely claim email verification.
- `POST /users/login`: `{email,password}`; `{user}` plus new cookie.
- `GET /users/me`: `{user}` or 401.
- `POST /users/logout`: empty JSON; 204.
- `POST /users/google-login`: HTTP410. Removed; no external identity token is accepted or exchanged for a session.
- `POST /users/forgot-password`: `{email}`; 202 generic `{message}` for known/unknown accounts. A configured SMTP provider sends a 30-minute one-time token in a URL fragment. No token is returned by this API or logged; only SHA-256 hash is stored. Without configured SMTP, no email is sent. Delivery errors keep the same generic response and remove the failed token.
- `POST /users/reset-password`: `{token,password}`; `{message}`; consumes token and revokes all sessions.
- `PATCH /users/me`: only `{name?,bio?,contactPreference?}`; bio ≤500; contact preference `inbox` or `campus-meetup`; `{user}`. No phone collection, email change, role change, or password change through this endpoint.
- `GET /users/me/export`: own data JSON attachment `{exportedAt,account,listings,transactions,messages,notifications,reports,privacyRequests,disputes,media}`. Media contains safe re-encoded image data. No unrelated account records or authentication/reset/session secrets.
- `DELETE /users/me`: `{password,confirmation:'DELETE'}`; `{message}`. Incorrect current password is 403 and preserves the session. Legacy external-auth-only accounts use an authenticated privacy deletion request. Accepted meetups and open/accepted or administration-unreviewed/reviewing disputes block automatic deletion with409 and require cancellation or human privacy review. A seller's rejected/refunded label does not bypass review. Otherwise removes account, sessions, messages, images, listings, notifications, and own privacy requests. Counterparty transaction records retain price/warranty evidence with names/IDs pseudonymized; direct meetup details are removed. Final contract records follow retention below. Deletion does not waive seller obligations or legal rights.
- `POST /users/me/privacy-requests`: `{type:'access'|'correction'|'deletion'|'objection',message}`; message 5–2000; 201 `{request}`.
- `GET /users/me/privacy-requests`: `{requests:[{_id,type,message,status,response,createdAt,updatedAt,resolvedAt?}]}`, own account only.
- `GET /users/notifications`: own notification array, latest 100: `{_id,userId,message,type,isRead,resourceId,createdAt,updatedAt}`.
- `PATCH /users/notifications/:id/read` / `PATCH /users/notifications/read-all`: `{}`; scope limited to current user.

Consent alias: `policyConsent:{kind:'registration',version,accepted:true}` is also accepted. Listing alias additionally needs `kind:'listing'` and `imageRights:true`. Server supplies acceptance timestamps; it does not trust client timestamps.

## Listings and images

- `GET /products`: approved, nonremoved public listings, newest first, up to 200. Optional scalar `search` and `category`; search is regex-escaped.
- `GET /products/my-listings`: authenticated owner's listings, including review states, up to 200.
- `GET /products/:id`: public Approved/Reserved/Sold listing; Pending/Rejected visible only to owner/admin. Removed listings 404.
- `POST /products`: `{title,description?,price,category,condition,location?,warrantyTerms,image,consent:{terms:true,imageRights:true,version}}`; 201 product; owner/name and Pending status assigned from session. Supplied seller/status fields cannot grant control.
- `PUT /products/:id`: allowed listing fields above, owner only. A replaced image requires fresh listing/image-rights consent. Changes return listing to Pending. Reserved/Sold listings cannot be edited. Required legacy fields must be updated before approval.
- `DELETE /products/:id`: owner only; removes listing and uploaded image. Accepted reservations must be cancelled first.
- `GET /media/:id`: WebP bytes, no user-controlled content type. Pending media only to owner/admin; public media only via available public listings. No arbitrary file paths or external fetch.

Fields: title 3–120; description ≤3000; location ≤120; warranty terms 3–2000, explicitly supplied (`No additional seller warranty` is allowed and does not waive statutory rights). Categories Books/Electronics/Clothing/Food/Services/Others. Conditions New/Like New/Good/Fair; legacy `Used - Good`/`Used - Fair` normalize. Price 0–1,000,000 PHP, maximum two decimals.

Image input: PNG/JPEG/WebP base64 data URL, ≤5 MiB decoded, still image ≤4096×4096. Magic bytes and decoded format must agree. Sharp rotates/resizes to at most1600px and re-encodes WebP, stripping EXIF/other metadata. SVG/GIF/arbitrary URLs are rejected before decoder use. Stored in MongoDB, served through the access-checked media route. Maximum 100 nonremoved listings per account. Legacy external/dataURL images are not exposed through the public serializer; sellers must re-upload them.

Product response: `{_id,title,description,price,category,condition,location,warrantyTerms,sellerId,sellerName,status,rejectionReason,image,createdAt,updatedAt}`. `image` is a same-origin `/api/media/:id` path. No uploader consent/internal binary fields returned.

## Conversations, meetups, reports, manual refund records

- `GET /transactions/my-transactions`: `{purchases,sales,adminThread}`. Real transactions include buyer/seller IDs/names, product ID/title, server price/warranty snapshot, meetup/payment details, status, disputes. Inquiry-only threads have `isInquiry:true`, ID `chat-...`, status Inquiry; do not show handover/refund controls for these. `adminThread` is null when no administrator exists, otherwise a support descriptor with `sellerId:'admin'`, `productId:null`, `isAdminThread:true`.
- `GET /transactions/messages/:otherUserId/:productId`: own two-party messages, latest200 in chronological order. Support uses otherUserId `admin` and productId `null`; admin replies to the actual student ID. Ordinary users cannot create private support-style threads with other students. Listing conversations must involve its seller and current user.
- `POST /transactions/messages`: `{receiverId,productId,text}`; text1–3000; sender is session owner, never body senderId. Returns201 message and generates scoped notification. Product ID null only for administrator support.
- `POST /transactions/buy-request`: `{productId,meetupLocation,meetupTime,paymentMethod,message?}`; 201 transaction. Meetup within next90days, location3–160, optional message≤1000. Payment `Cash`, `GCash at meet-up`, `Maya at meet-up` (GCash/Maya aliases accepted). Price, title, seller, warranty terms come from database. One active request per buyer/item. No self-purchase or unavailable item.
- `PATCH /transactions/:id/status` (PUT alias): `{status:'Accepted'|'Completed'|'Cancelled'}`. Seller accepts Pending and records Completed only after Accepted; either participant cancels before completion. Atomic database transactions prevent multiple accepted buyers, reserve/sell inventory, cancel competing pending requests, and release cancelled reservations. Completed is a manual handover record, not payment verification.
- `POST /reports`: `{product,reportedUser?,message}`; message10–2000. Reported seller derived from listing; forged reportedUser ignored. Approved items can be reported by nonsellers; Reserved/Sold listing reports require its transaction participant.
- `POST /transactions/:id/disputes`: `{type:'refund'|'dispute',reason,amount}`; reason10–2000, amount0–transactionprice. Refund requests require the buyer and a Completed handover. Either participant may open a dispute. One active request per transaction. Returns201 dispute.
- `GET /transactions/:id/disputes`: participant/admin scoped array.
- `PATCH /transactions/:id/disputes/:disputeId`: seller only `{status:'accepted'|'rejected'|'refunded',response}`; response5–2000; open→accepted/rejected, accepted→refunded. Refunded is solely the seller's manual record of a direct refund; no payment gateway, money transfer, or guaranteed refund is implied.

## Administrator endpoints

All require a current admin session; authorization is read from the database, not client claims.

- `GET /admin/stats` → `{totalUsers,totalProducts,totalReports}`.
- `GET /admin/users` → public user array, no password/hash/token fields.
- `GET /admin/products?search=` → product array, including review states.
- `GET /admin/reports` → reports; reporter/reportedUser populated name only.
- `GET /admin/logs` → latest200 logs; adminId populated name/email, generic action descriptions.
- `PUT /admin/products/:id/approve` `{}` / `PUT /admin/products/:id/reject` `{reason}`; rejection reason5–1000. Legacy missing safe image/terms cannot be approved.
- `DELETE /admin/products/:id` removes availability/image and cancels active requests.
- `PATCH /admin/users/:id` `{isBanned:boolean}` revokes sessions on suspension; cannot suspend own/admin account.
- `DELETE /admin/users/:id` removes account subject to the same active-case holds; cannot remove self through this route or the last administrator.
- `PUT /admin/reports/:id/resolve` `{warningMessage?}` records response and optional marketplace-support message.
- `GET /admin/privacy-requests` → array with userId populated `{name,email}`; `PATCH /admin/privacy-requests/:id` `{status:'resolved',response}`. Resolution is a response record; it does not pretend to perform deletion automatically.
- `GET /admin/analytics` → daily aggregate array `{_id,day,event,page,count}`.
- `GET /admin/disputes` → array; transactionId populated `{productTitle,buyerName,sellerName,price,warrantyTerms}`. `PATCH /admin/disputes/:id` `{reviewStatus:'reviewing'|'closed',adminNote}` records review only. Admin cannot set seller refund status or move money.
- `POST /admin/retention/purge` `{}` → `{deleted}`; same actual purge as startup/hourly job.

## Retention

Startup and everyhour while the server is running: expire session/reset records; purge messages/logs after365days, notifications/aggregateanalytics after90days, resolvedreports and resolvedprivacyrequests365days after resolution. Completed/cancelled transactions365days after lastupdate, except held by open/accepted or unreviewed/reviewing disputes. Rejected/refunded disputes are purged365days after lastupdate only when administration's review is closed. Unresolved safety/privacy/case records are retained for human review; operators must periodically review holds rather than leave them unresolved indefinitely. The scheduler cannot run while the service is offline; startup catches up. Independent backups, if introduced by an operator, require a separate documented lifecycle.

Hosted requests require a private X-Backend-Proxy-Key and valid X-Marketplace-Client-IP, attached only by the frontend server. Health is exempt. The client-IP header is ignored when no trusted proxy key is configured; IPv6 addresses share a /56 rate bucket.
