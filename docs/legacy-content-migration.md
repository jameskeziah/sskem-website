# Legacy content migration matrix

Status: built for authenticated private review; public release blocked.

## Purpose

`content/legacy-content-migration-matrix.json` accounts for every content record in the `SSKEMS-BACKUP-2026-08-29` migration archive. It binds 115 records to opaque references and exact Markdown digests without copying archived content, evidence, private paths or identity-bearing labels into the website repository.

Route continuity is not content migration. The 35 treatments already implemented in `content/legacy-cutover-inventory.json` are recorded as route facts only. Their legacy copy remains unselected for migration. Another 73 public routes and seven private records require an explicit route decision.

## Current baseline

- 115 archive content records: 108 public and seven private.
- 35 existing route treatments reconciled by exact cutover record ID.
- 73 additional public routes need a keep, redirect, archive or retire decision.
- All 115 content decisions remain `unselected`.
- All 115 implementation states remain `not-started`.
- Zero records are publication-eligible through this matrix.

The matrix is a control register, not proof that a legacy statement is current, that a document is safe, that media rights or pupil consent exist, or that management has approved publication.

## Private workspace

`/publication-review/migration-matrix` is available only when `HOMEPAGE_REVIEW_MODE=private` and a ChatGPT-authenticated user is present. It provides server-rendered search, filters, pagination and a safe CSV download. Outside private review it returns not found and is absent from public navigation and the sitemap.

The worksheet contains public-safe labels, opaque source references, exact matrix/record/source digests, immutable current-state columns and eight proposed decision columns. Downloading it stores nothing, approves nothing, updates no route and publishes no content.

`/publication-review/migration-decision-intake` validates a completed CSV locally in the browser. It requires the exact 115-row set and rejects stale bindings, changed current fields, malformed CSV, formula-like inputs, unsafe target combinations and likely private-data leakage. It returns only a temporary, read-only plan. There is no upload, POST, browser storage or server persistence.

### Wave 1: core information

`/publication-review/migration-wave-1` is an authenticated, noindex decision packet for ten high-value public page records: home, school overview, vision, facilities, clubs, uniform guidance, admissions guidance, enrolment and contact. It deliberately excludes galleries, results, staff identities, fees, notices and regulatory documents.

Its download uses the same 35-column decision contract and the same full-matrix and record digests as the canonical worksheet, but contains only the ten Wave 1 rows. It preselects nothing and cannot be submitted, persisted or published. Management completes the eight `proposed_*` columns, then the browser-only Wave 1 validator combines them with a separately selected fresh 115-row master worksheet.

The merger performs no request, upload, browser storage or server persistence. It rejects stale bindings, missing or duplicate records, changed immutable fields, formula-like values, unsafe targets, incompatible routes, invalid reason/role codes and invalid review dates through the canonical decision contract. A successful result is a local combined CSV download only. The existing full intake remains the authoritative validator and still requires all 115 canonical rows before any controlled decision write.

## Decision contract

For every record, the owner must choose:

1. Route treatment: retain, redirect, archive, retire or private-only.
2. Content decision: migrate, rewrite, merge, archive, redirect-only or retire.
3. A public target where the selected decision requires one.
4. A controlled reason code, allowlisted institutional role and review date. Free-form rationale and personal names are rejected.
5. Implementation is deliberately outside this intake and becomes `verified` only after a separate independent check.

Names of approvers, evidence locations, WordPress content, pupil information and private source paths remain in the controlled system. The repository stores roles and opaque references only.

Decision-contract version 2 accepts these reason codes only: `preserve-existing-public-information`, `replace-with-current-information`, `consolidate-overlapping-information`, `retain-as-controlled-history`, `preserve-route-continuity-only`, `remove-obsolete-or-out-of-scope-information`, `protect-identity-or-private-information`, and `hold-for-rights-or-evidence-review`. The selected code must be compatible with the selected content decision. Approved role codes are `academic-office`, `admissions-office`, `compliance-owner`, `content-editor`, `media-owner`, `school-management`, `school-office`, `student-life-owner`, and `website-owner`.

Targets are limited to the registered public site namespaces and exact public utility routes. WordPress administration paths and private review, API, Studio and framework paths are never valid destinations. Identity-protected records may only be archived or retired as content.

## Commands

- `npm run migration:matrix:audit` validates structure, counts, privacy redaction and fail-closed state. It does not write.
- `npm run migration:matrix:release` additionally requires every record to have a final decision and verified implementation.
- `npm run migration:decisions -- --worksheet="CONTROLLED_DECISIONS.csv"` rebuilds the exact decision plan without writing. A write requires the current decision batch ID, `--apply` and `--acknowledge-local-write=record-controlled-legacy-content-migration-decisions`. The atomic update changes only unresolved route decisions and first content decisions, then stores its rollback snapshot under ignored `work/`.
- If the matrix commits but the post-commit marker cannot be stored, the command exits nonzero with a transaction ID. After verifying the matrix after-hash against that transaction's rollback receipt, repair only the marker with `npm run migration:decisions -- --repair-applied-marker=TRANSACTION_ID --acknowledge-local-write=repair-legacy-migration-applied-marker`.
- `npm run migration:matrix:refresh` is the explicit local rebuild command. It reads the controlled archive in `work/SSKEMS-BACKUP` and rewrites the sanitized canonical matrix. Review its diff before accepting a refresh. Refresh and decision writes share one exclusive local lock; contention fails closed and stale locks are never removed automatically.

The structural audit runs before the composite release audit. Migration completion is a separate public-release gate; claims, media, documents, Programmes, accessibility, performance and final cutover approval remain independent gates.

## Chronological operating order

1. Preserve the current archive and its checksum register.
2. Start with the private Wave 1 packet or download the full safe worksheet.
3. Consult exact archived sources only inside the controlled system.
4. Complete Wave 1 without changing bindings, then validate and merge it with a fresh full worksheet in the browser-only Wave 1 tool.
5. Complete route and content decisions for the remaining records until all 115 are decided.
6. Validate the completed worksheet in the private intake, then independently reproduce its read-only CLI plan.
7. Implement each destination, redirect, archive or retirement.
8. Verify implementation and complete the separate approval pipelines.
9. Run the migration release audit and composite public-release audit.
10. Deploy only after every independent gate passes and rollback ownership is confirmed.
