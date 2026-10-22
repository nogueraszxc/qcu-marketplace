# Login override — EcoCollect reference

User-supplied reference: a full-screen softly blurred community photograph, dark atmosphere, serif editorial statement on the left, pale glass sign-in card on the right, brand/status across the top, and three steps/legal links at the bottom.

Use the QCU marketplace burgundy, ivory and gold tokens. Headline: Georgia, regular with gold italic emphasis. Form: existing Segoe UI stack, explicit labels, email/password only, visible password toggle, recovery/registration/support links, real server feedback and busy state. Keep form contrast independent of the photograph using an opaque-enough glass surface with a solid fallback.

Scope is `/login` only. Registration/recovery pages keep AccountShell. Local supplied campus/seal assets follow the existing authorization gate; the public build uses the burgundy gradient and own marketplace icon by default. Do not re-enable preview or third-party sign-in.

Desktop: centered max1416px scene, editorial area plus 440px card. Tablet preserves the split down to760px. Narrow layouts stack a compact story above the card and footer steps. Inputs remain16px, icon buttons44px minimum, focus visible, no horizontal scrolling at320px or 200% zoom. Background stays decorative with empty alt. Respect reduced motion/transparency; do not animate blur or delay access to the form.
