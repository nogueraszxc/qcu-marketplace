# QCU Campus Exchange — Design master
## Direction
A bold campus noticeboard: expressive burgundy and butter-yellow campaign blocks, clean white marketplace surfaces, large confident sans-serif type, generous spacing, and practical seller/admin workspaces. This is a full revision of the earlier quiet sage design.
## Skill evidence and judgment
UI/UX Pro Max's Vibrant & Block-based style fits the student audience. Its generated testimonial/newsletter landing-page patterns did not match marketplace workflows, so those patterns are excluded. Product structure follows the skill's built-in accessibility, navigation, forms, and responsive guidelines. Next.js Link/navigation and reduced-motion searches returned applicable matches. Palette and type below are QCU-specific implementation decisions, not claims of an exact database match.
## Tokens
--canvas:#f7f5f0; --surface:#ffffff; --ink:#211d22; --muted:#65616a;
--accent:#76253d; --accent-dark:#54182a; --accent-soft:#f3e8ed;
--gold:#f4c95b; --on-gold:#34240b; --gold-soft:#fff5d5;
--sage:#e8efe9; --border:#ded9dd; --control-border:#8b808c;
--success:#315b3e; --success-soft:#edf4ec; --warning:#785312; --warning-soft:#fff3d1;
--danger:#a33131; --danger-soft:#fff0ee; --radius:18px;
--shadow:0 10px 36px #241e2408;
--font-sans:'Segoe UI',Arial,sans-serif; --font-display:'Segoe UI Variable Display','Segoe UI',Arial,sans-serif;
Spacing:4,8,12,16,24,32,48,64. Body16/1.6; secondary14; label12; h1 36; major display52–72. Text never below12 except nonessential decorative lettering.
## Shared component contract
.page-shell width min(1360px,100%), desktop padding40px 40px 72px, mobile24px 20px.
.page-heading, .eyebrow, .muted, .panel, .btn/.btn-primary/.btn-secondary/.btn-ghost/.btn-gold, .icon-button, .field, .form-grid, .badge/.badge-success/.badge-warning, .empty-state, .inline-error, .back-link.
Controls >=44px; form inputs16px. Focus 3px accent outline. Icon component and Brand stay shared; use semantic tokens throughout page CSS.
## Layout and workflow
Marketplace: campaign hero, working search, horizontal categories, filter/sort controls, four-column listings desktop/two mobile, real moderated listings.
Student: task-led overview, listing management, responsive inbox master-detail. Admin: operational sidebar, accessible tables, moderation confirmations. Auth: split campus poster/form with email/password only. Supplied campus image uses a subtle blur and tint locally; public university assets require documented authorization.
Login follows the full-screen photo/glass-card override in pages/login.md; other account pages retain the split poster/form. Mobile navigation keeps <=5 primary destinations and accounts for fixed bar/safe areas. No page-wide horizontal scrolling; tables can have labeled contained scrolling.
## Motion
Standard motion6/10: short page entrance, one-time scroll reveal, layered hero settle, card hover, modal enter/exit. Use native CSS/Web Animations where sufficient; do not add a library solely because a preset uses one. 140ms press, 200ms controls, 280ms dialog, 420ms sections, stagger40ms capped160ms. Transform/opacity only; avoid perpetual decoration, scroll hijacking, hidden essential content, or delayed controls. Respect live reduced-motion changes.
## Behavior
Frontend connects to real authenticated backend workflows. Public preview access is removed; old preview storage cannot grant access or show sample listings. Profiles persist through the API. Do not invent ratings, verified claims, transaction counts or live users.
## Validation
ESLint/build plus browser checks at375/768/1024/1440, keyboard focus, modal escape, 200% text scaling, mobile landscape, reduced motion. Existing Chrome executable available with bundled Playwright for dev QA. Confirm stale preview state is ignored and real authentication remains required.
