# SSKEMS School Website

Stages 1–3 of the SSKEMS website rebuild: the verified design-system and
navigation foundation, an accessible Mandatory Public Disclosure and document
archive, and a review-safe admissions service foundation.

## Local development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm test
```

`npm test` intentionally exercises the complete private-review prototype. A
normal `npm run build` is the public-release path and is blocked while pupil
artwork still carries the publication-review requirement. Use
`npm run build:review` only for an access-controlled private review; it also
emits `noindex, nofollow` metadata. Search-engine directives are not access
control.

Publication decisions are tracked in `content/approval-manifest.json`. Run
`npm run approvals:audit` for a structural summary and
`npm run approvals:release` for the exact media, claim and document blockers.
Only opaque references belong in the manifest; private evidence remains in the
school's controlled record system.

The test command regenerates design tokens, creates a production build, checks
the Phase 1, Stage 2 and Stage 3 contracts, validates document-publication and
admissions safeguards, and runs accessibility, keyboard, responsive,
archive-filter and visual tests.

## Current content policy

- CBSE School is the only verified primary pathway.
- Junior College and Institute remain available as clearly labelled pending
  routes until management confirms their status and navigation placement.
- Public contact details are centralized in `app/data/site.ts`.
- Design tokens are authored in `app/design-tokens.json` and generated into
  `app/tokens.css`.
- `/mandatory-public-disclosure` follows the revised five-section Appendix IX
  HTML structure without exposing unapproved PDFs.
- `/documents` provides controlled taxonomy, native GET filters and stable
  document/version routes.
- `/admissions` separates enquiry, formal application and parent tracking;
  all fifteen admissions routes are available for private review.
- The age checker returns manual review until a current Maharashtra order,
  cut-off date, source document and verification record are approved.
- Enquiry, application, visit and status interfaces are non-submitting
  prototypes. Real applicant information must not be entered until D1, private
  R2 storage, parent OTP, staff roles, notifications and security controls are
  configured.
- The homepage art-direction prototype uses the supplied campus photography and
  keeps all pupil/result artwork behind a visible publication-review gate. The
  capture plan, consent requirements, delivery specification and approval
  register are in `docs/campus-media-brief.md`.
- `scripts/assert-publication-safety.mjs` prevents the normal production build
  from packaging review material until the structured approval manifest is
  release-ready and the review-only source treatment is intentionally resolved.
- `db/admissions-schema.ts` and its generated migration scaffold the audited
  workflow without activating persistence.
- The compliance schema and validation layer are foundations only; official
  document ingestion, approvals, scanning and public-domain cutover remain
  blocked until the school supplies approved records and operating decisions.

## Technology

- Next.js-compatible vinext runtime on Cloudflare Workers
- React and TypeScript
- Tailwind CSS with project-owned design tokens
- Playwright and axe-core for browser verification
