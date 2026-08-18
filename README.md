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
normal `npm run build` is the public-release path and remains blocked until all
six release gates pass. Use
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
Every approval card also links to an authenticated completion workspace and an
unfilled request generated from that record's current digest. The workspace
preselects nothing and downloads a completed JSON request entirely in the
browser; it sends no decision data to the server and performs no manifest write.
Downloads contain only decisions, opaque reference IDs and a role identifier;
completed requests stay in the controlled system and return through the guarded
local planner and updater.
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

The authenticated `/publication-review/campus-master-preflight` workspace is
the next intake step when those four production masters arrive. It checks local
file type, dimensions, SHA-256 and duplicate bytes entirely inside the browser,
then downloads a filename-free technical report. It never uploads or modifies
the files and does not persist anything. The report is advisory; authoritative
colour-space, metadata and still-image inspection remains the local
`media:inspect` step.

`npm run media:inspect-batch` closes that handoff by matching all four local
masters to the downloaded preflight hashes before performing the authoritative
pipeline inspection. The batch is read-only, fails as one unit and returns a
privacy-safe result without filenames, paths, derivatives or approval changes.

`npm run media:stage-batch` is the guarded atomic staging batch that follows a
successful inspection. It plans without writing by default, requires an exact
local-write acknowledgement, prepares all 60 responsive derivatives in a
temporary ignored directory and exposes none of them unless the complete
four-record batch succeeds. It cannot grant approval or write public media.

`npm run media:publish-batch-plan` is the permanently read-only
first-publication planner. After private review and all four approvals, it
reopens every staged derivative, requires all four live targets and bindings to
be absent, and calculates one exact four-binding registry projection. It accepts
no apply or replacement flag and performs no public write or deployment.

The authenticated `/publication-review/campus-approval-batch` workspace turns
the four campus approval templates into one browser-only bundle while keeping
every record's checks, evidence references, role and confirmation independent.
Nothing is preselected or sent to the server. The bundle is reviewed with
`npm run approvals:campus-batch -- --request "CONTROLLED_BATCH_PATH"`; only a
separate exact acknowledgement makes an atomic all-or-nothing manifest write
available, and that write records rather than grants the supplied approvals.

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
private review retains the prototype source. Achievement artwork has an
independent fail-closed public projection: each card requires the exact media
record, its paired claim record and a hash-bound activation for the unchanged
JPEG. Otherwise it is omitted from public HTML. Run
`npm run achievements:activate -- --record RECORD_ID` for a read-only plan only
after both approvals pass, and `npm run achievements:bindings:audit` to verify
the active bytes. This separation does not grant approval, so public release
remains blocked until the manifest and the other release gates pass. See
[`docs/homepage-achievement-publication.md`](docs/homepage-achievement-publication.md).

Homepage media also has a schema-backed, read-only transfer audit. Run
`npm run performance:audit` before public release. It verifies the exact tracked
files, dimensions, formats and byte counts, blocks an oversized hero poster or
incomplete campus bindings on the public build, and allows those known release
debts only in `build:review`. The audit never crops, recompresses or replaces
artwork. Its byte limits are an acceptance gate, not a substitute for measuring
the 75th-percentile LCP on representative traffic after launch.

The homepage poster has a separate lossless review workflow. Run
`npm run poster:inspect` for a write-free measurement or `npm run poster:prepare`
to place a pixel-identical candidate and privacy-safe receipt under the ignored
`work/` directory. Neither command changes `public/og.png`, its approval state,
or the release budget. See [the poster optimization guide](docs/homepage-poster-optimization.md)
for the verified result and decision boundary.

`npm run poster:decision-request` generates the unfilled, source-hash-bound
delivery decision packet. Private reviewers can also download it from the
publication dashboard after authentication. It preselects no option, creates no
candidate and cannot approve or publish the poster.

The authenticated `/publication-review/poster-delivery-decision-workspace`
turns that packet into a no-persistence management worksheet. It preselects
nothing, requires all four boundaries plus an opaque controlled-record
reference and role, validates the exact current template in the browser, and
downloads only the completed JSON request. Decision fields never leave the
browser; the worksheet does not persist data, record a binding, generate a
candidate or grant publication approval.

After management completes that packet in the controlled system, run
`npm run poster:decision-plan -- --request "CONTROLLED_REQUEST_PATH"`. The
planner rejects stale digests, missing acknowledgements, private evidence paths,
identity-bearing role values and future timestamps. It reports only the exact
selected review authority and has no apply or image-generation mode.

The canonical poster decision-binding registry starts empty. A completed,
validated request can be proposed with `npm run poster:decision-record --
--request "CONTROLLED_REQUEST_PATH"`; default mode is read-only. Recording a
single public-safe scope later requires the exact acknowledgement shown by the
command, while replacement additionally requires `--replace`. The registry
stores only hashes, one opaque decision reference and a role identifier.

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
- The homepage art-direction prototype uses the supplied campus photography.
  Private review keeps all pupil/result artwork behind a visible gate; public
  HTML requires the exact approved media/claim pair and hash-bound artwork.
  The capture plan, consent requirements, delivery specification and approval
  register are in `docs/campus-media-brief.md`.
- `scripts/assert-publication-safety.mjs` and the composite release audit prevent
  a normal production build until the approval, binding, performance and
  cutover gates are release-ready.
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
