# Admin override — minimal glass workspace

Direction: an ivory moderation desk with restrained burgundy/rose gradients, a floating frosted sidebar, and a glass topbar. Preserve the marketplace brand while making operational screens quieter and easier to scan.

Skill evidence: UI/UX Pro Max's glassmorphism style fits the requested navigation/layer treatment. Its generated dark slate/green palette, marketing hero, trial CTA and external font are not used; these conflict with the existing brand and the actual moderation task. Modern UI/UX supplies solid fallbacks, restrained blur, readable layering, task hierarchy, and reduced-motion/transparency support. No new dependency or external font is needed.

Material: warm pale gradient canvas; sidebar/topbar use white72% with18px backdrop blur and opaque fallback. Data panels use white85% with white edges and light shadows without adding blur to every card. Active navigation and primary actions use burgundy gradients. Badges remain semantic and text-labeled. Fonts reuse Segoe UI; titles28–32px, tables13–14px, metadata12px.

Overview: factual counts, daily account/listing activity with a table alternative, report queue with honest zero state, pending listing table. No invented inventory, claims, ratings or activity.

Privacy & insights: three explicit context buttons for privacy requests, warranty/disputes and opt-in aggregate page insights. Existing data, permissions, forms, notes and API actions remain intact.

Responsive:240px floating sidebar desktop;200–220px intermediate; contained horizontally scrollable navigation below800px. Controls stay keyboard reachable; action tables scroll inside labeled regions and never widen the whole document. Mobile uses two-column metric cards, one-column content, explicit labels and large form controls. Support and confirmation dialogs use matching neutral surfaces.

Verify all six admin screens, three privacy sections, search/filter, chart range/table, dialog close/Escape/focus, approval/rejection/request payloads, empty/error/loading states, mobile/tablet/desktop, contrast and keyboard navigation. Use isolated fixtures for state-changing QA; do not create fake live listings or alter real member records for screenshots.
