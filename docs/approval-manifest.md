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

Document approval continues to require the established upload/approval
separation of duties. The private evidence system—not this manifest—must record
the actual uploader and approver identities.

## Commands

- `npm run approvals:audit` validates structure and prints the current summary.
- `npm run approvals:release` prints every blocking ID and fails unless the
  registry is ready for public release.
- `npm run build:review` permits the owner-only review build when the manifest is
  structurally valid.
- `npm run build` consumes the same manifest and refuses a public build while
  any public target is unapproved.
