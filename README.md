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

Approved decisions can be recorded through the guarded manifest updater. It
generates an unfilled, digest-bound request for one existing record and remains
read-only until a separately completed controlled request and exact local-write
acknowledgement are supplied. It never preselects checks, creates evidence or
stores an approver identity. See `docs/approval-manifest.md`.

Run `npm run release:audit` for the authoritative launch decision across
approvals, exact campus-media bindings, exact Appendix IX document bindings,
homepage transfer budgets, legacy-route implementation and removal of
review-only source treatment. A public build requires all six gates; private
review reports the same blockers without treating them as approval. The model
and operating sequence are documented in
[`docs/public-release-readiness.md`](docs/public-release-readiness.md).

The owner-only review deployment also provides `/publication-review`, a
manifest-driven approval queue with filters, check progress and a downloadable
coordination worksheet, plus `/publication-review/editorial` for reviewing the
exact sanitized Sanity projection and downloading its revision-bound receipt.
Every approval card also links to an authenticated, unfilled request generated
from that record's current digest. Downloads are read-only and contain no
evidence, decision, approver identity or private path; completed requests stay
in the controlled system and return through the guarded local updater.
These routes are unavailable outside private review mode. The editorial screen
and receipt endpoint also enforce dispatch-owned ChatGPT sign-in, while the
private Sites access policy remains the authorization boundary; review mode or
sign-in alone is not a substitute for controlled access and evidence handling.
The editorial screen can also download a first `siteSettings` migration packet
that maps every public contact field to its required address/contact claims. It
is a local draft aid only and performs no external CMS write. A guarded operator
command now prepares the matching create-only draft mutation locally; its write
path remains blocked until both claims, explicit acknowledgement and a
process-only Sanity credential all pass.

The review page also downloads an authenticated four-shot campus capture
packet. It is generated from the canonical manifest, responsive-media profile
and current exact bindings, so the photographer handoff cannot silently drift
from publication requirements. It requests exterior photography only and omits
controlled source paths, evidence and approver identities.

The same private editorial screen provides a first announcement intake packet.
Because no authoritative announcement copy has been supplied, it contains no
placeholder text or draft and reports `source-required`; real copy still needs
its own canonical claim approval before draft readiness.

Approved replacement photography is prepared through the guarded campus-media
pipeline documented in `docs/campus-media-ingestion.md`. It validates production
dimensions, preserves composition, strips embedded metadata, creates responsive
AVIF/WebP/JPEG variants and refuses public output for unapproved records.
Published receipts now produce exact hash-bound activation proposals. A guarded
activator verifies the receipt and all 15 files in read-only mode by default,
then requires an explicit acknowledgement for an atomic registry write; silent
replacement is refused. The homepage uses those responsive variants only when
the registry, manifest, receipt and derivative files all agree; otherwise
private review retains the prototype source and public release remains blocked.

Homepage media also has a schema-backed, read-only transfer audit. Run
`npm run performance:audit` before public release. It verifies the exact tracked
files, dimensions, formats and byte counts, blocks an oversized hero poster or
incomplete campus bindings on the public build, and allows those known release
debts only in `build:review`. The audit never crops, recompresses or replaces
artwork. Its byte limits are an acceptance gate, not a substitute for measuring
the 75th-percentile LCP on representative traffic after launch.

Appendix IX PDFs are prepared through the guarded document pipeline documented
in `docs/document-ingestion.md`. It rejects encrypted or interactive PDFs,
assesses the text layer, renders every page for review and binds publication to
the exact staged SHA-256 receipt. Malware scanning remains an external,
controlled-system requirement and is never implied by the local pipeline.

Published PDFs have a separate, guarded activation step. The default
`documents:activate` mode verifies the exact staged receipt, approved public
file, current manifest decision, external malware-scan check and public-safe
metadata without writing. An explicit acknowledgement is required to add or
replace a hash-bound registry entry. Document pages expose a download only when
that registry validates; filenames or manifest approval alone never activate a
file.

Legacy WordPress route continuity is controlled by the schema-backed inventory
documented in `docs/legacy-cutover.md`. It implements direct permanent redirects
to safe rebuilt destinations without copying old claims, forms, uploads or pupil
media. Route readiness is separate from publication approval.

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
- The compliance schema and guarded intake pipeline are ready; the twelve real
  Appendix IX PDFs, their controlled malware scans, metadata, privacy and
  accessibility reviews, approvals and public-domain cutover remain blocked
  until the school supplies approved records and operating decisions.
- `content/legacy-cutover-inventory.json` maps the observed WordPress route
  surface to direct rebuilt destinations. The owner dashboard exposes the route
  audit separately from the 33 publication blockers.

## Technology

- Next.js-compatible vinext runtime on Cloudflare Workers
- React and TypeScript
- Tailwind CSS with project-owned design tokens
- Playwright and axe-core for browser verification
