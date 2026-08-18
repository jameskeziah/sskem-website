# Publication approval manifest

`content/approval-manifest.json` is the release-control registry for homepage
media, public institutional claims and Appendix IX documents. Its companion
schema is `content/approval-manifest.schema.json`.

The registry stores decisions and opaque evidence references only. Never place
consent forms, pupil identifiers, signed certificates, approver identities,
private file paths or source-document contents in this repository.

## Record model

Every record identifies:

- a stable kind-prefixed ID;
- the repository content it governs through `sourcePointer`;
- every intended `publicTarget`;
- a reusable `checkProfile` and the state of each required check;
- a decision: `blocked`, `review-required`, `approved` or `withdrawn`;
- opaque references to evidence in the school's controlled record system;
- approving role, approval timestamp, optional expiry and operational notes.

`verified` and `not-applicable` are the only check states accepted for an
approved record. Approval also requires at least one controlled evidence
reference, the approving role and an ISO timestamp. Expired approvals fail the
audit. A withdrawn record cannot retain a public placement.

## Operating procedure

1. Verify the source in the school's controlled system. For pupil material,
   verify guardian consent separately from content accuracy and image rights.
2. Update only the relevant check states. Do not mark a check verified because
   another check passed.
3. Add opaque controlled-record IDs to `evidenceReferences`. The IDs must not
   reveal a pupil, parent, approver, email address or private storage location.
4. Set `decision` to `approved` only after every required check is verified or
   explicitly not applicable. Record the approving role and timestamp.
5. Run the structural audit. Resolve validation errors before private review.
6. Run the release audit. It remains non-zero until every record with a public
   target is approved.
7. When the manifest is release-ready, remove review-only page treatment and
   restore public indexing through a separate, intentional release change.

## Guarded decision recording

Do not hand-edit an approved decision into the manifest. Generate a request
template bound to the exact current record:

`npm run approvals:update -- --record media-campus-main`

The template deliberately leaves every check, evidence reference, approving
role and timestamp empty. Complete it only after the independent review in the
school-controlled system, and keep the completed request there. The request may
contain only check outcomes, opaque evidence IDs, a lowercase role identifier,
the approval time and optional expiry; it must never contain evidence, a person
name or a controlled path.

Review the completed request without writing:

`npm run approvals:update -- --request "CONTROLLED_REQUEST_PATH"`

If the plan is `ready-for-explicit-write`, record that supplied decision with:

`npm run approvals:update -- --request "CONTROLLED_REQUEST_PATH" --apply --acknowledge-local-write=record-controlled-publication-approval`

The updater accepts approved decisions only, rejects stale record digests,
requires the record's exact checks, validates the complete next manifest and
rechecks the manifest hash before an atomic local write. It records the
controlled decision; it does not grant approval, inspect evidence or prove the
identity or authority of the reviewer.

Document approval continues to require the established upload/approval
separation of duties. The private evidence system—not this manifest—must record
the actual uploader and approver identities.

Candidate Appendix IX PDFs use the guarded intake procedure in
`docs/document-ingestion.md`. It renders every page for review, assesses the text
layer, rejects interactive content and binds publication to the staged SHA-256
receipt. The local pipeline does not replace the controlled malware scan.

## Commands

- `npm run approvals:audit` validates structure and prints the current summary.
- `npm run approvals:release` prints every blocking ID and fails unless the
  registry is ready for public release.
- `npm run approvals:update -- --record ID` generates an unfilled, digest-bound
  approval request; `--request PATH` reviews a completed request without writing.
- `npm run release:audit` combines the manifest with the five other independent
  launch gates documented in `docs/public-release-readiness.md`.
- `npm run documents:inspect -- --record ID --input PATH` performs static PDF,
  page-count and text-layer checks without publishing anything.
- `npm run documents:prepare -- --record ID --input PATH` creates an ignored
  candidate bundle, page previews and privacy-safe receipt.
- `npm run documents:publish -- --record ID --input PATH --public-filename NAME.pdf`
  requires approval, verified scan evidence and an exact staged hash match.
- `npm run build:review` permits the owner-only review build when the manifest is
  structurally valid.
- `npm run build` consumes the same manifest and refuses a public build while
  any public target is unapproved.

## Owner-only reviewer dashboard

The private review deployment exposes `/publication-review`. It reads the
canonical manifest directly, shows the current release blockers, supports
kind/decision filters and prioritises the four campus photographs as the first
review batch. The route returns a not-found response outside
`HOMEPAGE_REVIEW_MODE=private` and is excluded from the public sitemap.

The dashboard can download a CSV worksheet from
`/publication-review/export`. The worksheet is a working aid for coordination;
the JSON manifest remains the release source of truth. It deliberately omits
private evidence and approver identities. Store those in the school's
controlled system and copy only opaque references into the manifest.

Each review card also exposes an authenticated download at
`/publication-review/approval-request/RECORD_ID`. It returns the exact unfilled
request template for the current record digest with no preselected checks,
evidence references, approving role or timestamp. The endpoint is read-only,
uses private no-store caching, returns not found outside private review mode and
requires ChatGPT sign-in. Sign-in identifies a viewer; the private Sites access
policy remains the workspace authorization boundary. Never upload or store a
completed request through the website.

The authenticated `/publication-review/campus-media-packet` download is the
canonical production handoff for the four campus exterior masters. It derives
shot roles, technical limits, approval checks and activation status from the
manifest and media pipeline. It does not grant approval or include evidence,
approver identities, private source paths or pupil-photography requests.

The authenticated `/publication-review/poster-delivery-decision` download is a
separate, source-hash-bound request for the oversized homepage poster. It
preselects no delivery option and authorizes no candidate, artwork change,
budget change or publication. The completed request and supporting evidence
remain in the school-controlled system; the existing poster approval record is
still the publication source of truth.

Use `npm run poster:decision-plan -- --request "CONTROLLED_REQUEST_PATH"` to
validate a completed poster packet. The planner is read-only and fail-closed: it
checks exact contract and approval-record digests, all acknowledgements, opaque
evidence references, the role identifier and timestamp. It never echoes the
evidence references and has no apply, candidate-generation or publication mode.

The companion `poster:decision-record` command proposes a single public-safe
binding in read-only mode. A later write requires its exact acknowledgement;
replacing a different binding also requires `--replace`. The empty canonical
registry stores no decision today. When used, it retains only exact hashes, one
opaque controlled reference, the selected scope, role and timestamps—never the
completed request, evidence, identity or source path. A binding is review
authority only and cannot satisfy the separate poster publication approval.

The linked `/publication-review/editorial` screen reviews exact published
Sanity revisions without exposing raw CMS records. It produces a downloadable
binding proposal only after the corresponding claim approval and display
window are current. The screen and receipt endpoint require dispatch-owned
ChatGPT sign-in, while the private Sites access policy provides the actual
workspace authorization boundary. `HOMEPAGE_REVIEW_MODE=private` is only a
route-availability gate and must never be used as the sole protection on an
internet-accessible deployment.

The editorial screen also downloads the first `siteSettings` migration packet.
Its seven fields are mapped to `claim-complete-address` and
`claim-public-contact`; both must be approved before the packet reports draft
readiness. Downloading it does not write to Sanity or approve either claim. The
companion importer is local-plan-only by default and requires both approvals,
an explicit apply flag, an exact external-write acknowledgement and a
process-only credential before it can create `drafts.site-settings`. It cannot
publish or replace an existing draft.

The announcement intake packet is intentionally source-required. It contains no
placeholder notice and does not add a speculative manifest claim. Once the
school supplies exact dated copy, create a matching claim record with only opaque
evidence references; the packet remains review-required until that claim is
current and approved.
