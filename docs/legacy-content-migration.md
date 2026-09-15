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

Its download uses the same 35-column decision contract and the same full-matrix and record digests as the canonical worksheet, but contains only the ten Wave 1 rows. It preselects nothing and cannot be submitted, persisted or published. Management keeps every prefilled route cell unchanged, completes the remaining `proposed_*` decision cells, then the browser-only Wave 1 validator combines them with a separately selected fresh 115-row master worksheet.

The merger performs no request, upload, browser storage or server persistence. It rejects stale bindings, missing or duplicate records, changed immutable fields, formula-like values, unsafe targets, incompatible routes, invalid reason/role codes and invalid review dates through the canonical decision contract. A successful result is a local combined CSV download only. The existing full intake remains the authoritative validator and still requires all 115 canonical rows before any controlled decision write.

### Wave 2: leadership, governance and services

`/publication-review/migration-wave-2` is the authenticated, noindex second decision packet. It contains eight public page records: chairman, president and principal messages; Board of Management and School Management Committee; Admission Form, Registration Form and Leaving/Transfer Certificate. All eight legacy routes already have guarded destinations, so this cohort adds no unresolved route decisions.

Every Wave 2 record is still high-risk and approval-blocked. Leadership and governance content requires current role, identity, portrait and signed-copy verification. The three service pages require data-protection review and must not recreate a public submission or pupil-record lookup. The packet contains only public-safe metadata and opaque references; it includes no names, portraits, form submissions, pupil data or archival copy.

Wave 2 uses the shared browser-only validator and merger. Its master input must already contain all ten valid Wave 1 decisions. A blank master, incomplete prior wave, stale binding, conflicting existing decision or invalid controlled value blocks the merge. A successful download carries 18 decisions in the 115-row master while recording, approval, implementation and publication remain unchanged.

### Wave 3: academic and compliance records

`/publication-review/migration-wave-3` is the authenticated, noindex third decision packet. It contains eight public page records: Academic Calendar, Competitive Exams, Faculty, Tentative Time Table, Age Rule, OASIS, SARAS and School Information. All eight routes already have guarded destinations, so the packet introduces no new route decision.

Every Wave 3 record remains approval-blocked. Calendars, timetables and age rules require current authoritative sources; competitive-exam and faculty information requires institutional-model and evidence review; disclosure records require current controlled documents and accessibility review. The packet contains no schedules, eligibility rules, staff identities, credentials, portraits, document contents, affiliation claims or archival copy.

Wave prerequisites are cumulative and chronological: Wave 3 declares and binds both Wave 1 and Wave 2, not only the immediately preceding wave. Its master input must contain all 18 earlier decisions. A successful browser-only merge carries 26 decisions in the 115-row master, leaving 89 content decisions and 79 route decisions, while recording, approval, implementation and publication remain unchanged.

### Wave 4: media-page continuity

`/publication-review/migration-wave-4` is the authenticated, noindex fourth decision packet. It contains ten public page records: Achievements, Gallery 2020 through Gallery 2026, Media and Fit India Movement 2020. All ten routes already have guarded destinations, so the packet introduces no new route decision.

Wave 4 governs page-level continuity only. Every record still requires accuracy, currency, editorial, management, privacy, rights, retention and accessibility review. The packet contains no image or video bytes, captions, names, pupil identities, consent records, approval evidence or archival copy. Selecting a page decision cannot authorize any media asset; the independent media inspection, approval, derivative-binding and publication gates remain mandatory.

Wave 4 cumulatively declares and binds Waves 1, 2 and 3. Its master input must contain all 26 earlier decisions. A successful browser-only merge carries 36 decisions in the 115-row master, leaving 79 content decisions and 79 route decisions, while recording, media approval, implementation and publication remain unchanged.

### Wave 5: unresolved historic media routes

`/publication-review/migration-wave-5` is the authenticated, noindex fifth decision packet. It contains five public page records: Gallery 2016 through Gallery 2019 and Electronic Media. Unlike Wave 4, all five route treatments are unresolved. The worksheet therefore requires an explicit route treatment and content decision for every row and preselects no destination.

Wave 5 remains a page-level continuity decision only. It contains no photographs, videos, captions, names, pupil identities, achievement claims, consent records, rights evidence or archival copy, and a completed worksheet cannot authorize an asset or public release. Independent media inspection, consent, privacy, rights, retention, accessibility, derivative-binding and publication gates remain mandatory. The 30 event-level gallery records are deliberately deferred to a separate higher-risk review.

Wave 5 cumulatively declares and binds Waves 1 through 4. Its master input must contain all 36 earlier decisions. A successful browser-only merge carries 41 decisions in the 115-row master, leaving 74 content decisions and 74 route decisions, while recording, media approval, implementation and publication remain unchanged.

### Wave 6: historic celebration galleries

`/publication-review/migration-wave-6` is the authenticated, noindex sixth decision packet. It contains twelve public `sk_igallery` index records for general cultural, civic and school celebrations. They were selected because they share one eight-review contract; records involving pupils by name, results and achievements, named visitors, health or vaccination, uncertain institutional ownership, structurally ambiguous titles and ambiguous activities remain deferred.

Wave 6 records route and content intent only. No destination is preselected. The `identityProtected: false` matrix classification is not proof that gallery media contains no child, that consent or rights exist, or that cultural participation establishes an individual's beliefs. The packet displays only unverified legacy index metadata. It does not retrieve or display underlying gallery content, and does not import, copy, approve, activate, transform or publish image or video bytes, captions, identities, consent records, rights evidence, asset metadata, derivatives or archival copy. Legacy event titles remain unverified and the packet cannot validate event claims. Every underlying asset remains subject to independent inspection, consent, privacy, rights, retention, accessibility, metadata, derivative-binding and publication gates.

Wave 6 cumulatively declares and binds Waves 1 through 5. Its master input must contain all 41 earlier decisions. A successful browser-only merge carries 53 decisions in the 115-row master, leaving 62 content decisions, 62 route decisions and 18 event-gallery records for later waves. Recording, media approval, implementation and publication remain unchanged.

### Wave 7: repeated cultural and community gallery routes

`/publication-review/migration-wave-7` is the authenticated, noindex seventh decision packet. It contains five public `sk_igallery` index records: two similarly titled Matru-Pitru records, two similarly titled Shiv Jayanti records and one tree-plantation record. They share the same eight-review contract and avoid records involving pupil or result claims, child health, named visitors, institutional-model claims or the structurally ambiguous A. P. J. Abdul Kalam title.

Wave 7 records route and content intent only. Similar titles do not establish that the underlying events or assets are duplicates, so no merge, redirect or destination is preselected. The `identityProtected: false` matrix classification is not proof that gallery media contains no child, that consent or rights exist, or that cultural participation establishes an individual's beliefs. The packet displays only unverified legacy index metadata. It does not retrieve or display underlying gallery content, and does not import, copy, approve, activate, transform or publish image or video bytes, captions, identities, consent records, rights evidence, asset metadata, derivatives or archival copy. Legacy event titles remain unverified and the packet cannot validate event claims. Every underlying asset remains subject to independent inspection, consent, privacy, rights, retention, accessibility, metadata, derivative-binding and publication gates.

Wave 7 cumulatively declares and binds Waves 1 through 6. Its master input must contain all 53 earlier decisions. A successful browser-only merge carries 58 decisions in the 115-row master, leaving 57 content decisions, 57 route decisions and 13 event-gallery records for later waves. Recording, media approval, implementation and publication remain unchanged.

### Wave 8: ambiguous gallery labels

`/publication-review/migration-wave-8` is the authenticated, noindex eighth decision packet. It contains two public `sk_igallery` index records whose legacy labels cannot be interpreted safely: `Bondla Activity` and `Celebration of Birth Anniversery of Dr. Apj Abdul Kalam Azad`. The first does not establish an activity, venue, participants, date or purpose. The second is structurally ambiguous and appears to conflate A. P. J. Abdul Kalam with Abul Kalam Azad. The canonical labels are shown only as unverified source metadata; the packet does not silently correct either record or infer a person, event, place, destination, relationship or duplicate.

Wave 8 records route and content intent only. No title, route, merge, destination or content decision is preselected. The `identityProtected: false` matrix classification is not proof that gallery media contains no child or that consent or rights exist. The packet does not retrieve or display underlying gallery content, and does not import, copy, approve, activate, transform or publish image or video bytes, captions, identities, consent records, rights evidence, asset metadata, derivatives or archival copy. Legacy event claims remain unverified. Every underlying asset remains subject to independent source clarification, inspection, consent, privacy, rights, retention, accessibility, metadata, derivative-binding and publication gates.

Wave 8 cumulatively declares and binds Waves 1 through 7. Its master input must contain all 58 earlier decisions. A successful browser-only merge carries 60 decisions in the 115-row master, leaving 55 content decisions, 55 route decisions and 11 event-gallery records for later waves. Those eleven records remain deferred because they involve institutional-model and evidence gates, pupil or result claims, named visitors or child health. Recording, media approval, implementation and publication remain unchanged.

### Wave 9: institutional-model and evidence-sensitive galleries

`/publication-review/migration-wave-9` is the authenticated, noindex ninth decision packet. It contains two public `sk_igallery` index records: `5th Foundation day Celebration at SSKEMS` and `Institute`. Both require the standard eight media reviews plus explicit institutional-model and evidence review. The first label does not establish which regulatory entity the anniversary concerns, its basis, event date or organiser. The second does not establish a legal operator, programme scope, enrolment or fee relationship, awarding authority, or a relationship with the CBSE School or Maharashtra Junior College.

Wave 9 records route and content intent only. Institutional-model and evidence review happen in the controlled system; completing or merging this worksheet does not perform, approve or replace those checks. No claim, identity, title, route, merge, destination or content decision is preselected. The packet contains no source documents or private evidence locations, does not retrieve or display underlying gallery content, and does not import, copy, approve, activate, transform or publish media, captions, identities, evidence, consent records, rights metadata, derivatives or archival copy. The `identityProtected: false` matrix classification is not proof that gallery media contains no child or that consent or rights exist. Institutional and event claims remain unverified, and every underlying asset remains subject to independent inspection and the full publication pipeline.

Wave 9 cumulatively declares and binds Waves 1 through 8. Its master input must contain all 60 earlier decisions. A successful browser-only merge carries 62 decisions in the 115-row master, leaving 53 content decisions, 53 route decisions and nine event-gallery records for later waves. Those nine records remain deferred because they involve pupil or result claims, named visitors or child health. Recording, evidence verification, media approval, implementation and publication remain unchanged.

### Wave 10: named-visitor galleries

`/publication-review/migration-wave-10` is the authenticated, noindex tenth decision packet. It contains two public `sk_igallery` index records: `Deputy collector (khed) visit to SSKEMS` and `Dr. Sonawane (Dervan) Visit to SSKEMS`. Their legacy labels do not prove a visitor's identity, role, credentials, event context or endorsement. The first does not establish the visitor's exact office, jurisdiction, official capacity, event date, purpose or authority to publish the wording. The second does not establish a full identity, the basis for the professional title, credentials, organisation, event purpose, date or any relationship with Dervan.

Wave 10 records route and content intent only. A past visit does not establish a current office, affiliation, partnership, recommendation, sponsorship or endorsement. Identity, role-at-event, event context and publication-rights evidence must be checked in the controlled system; completing or merging this worksheet cannot perform, approve or replace those checks. No identity, title, role, claim, route, destination, merge or content decision is preselected. The packet contains no supporting documents or private evidence locations, does not retrieve or display underlying gallery content, and does not import, copy, approve, activate, transform or publish media, captions, identities, evidence, consent records, rights metadata, derivatives or archival copy. The `identityProtected: false` matrix classification is not proof that gallery media contains no child or that consent and rights exist. Every underlying asset remains subject to independent inspection and the full publication pipeline.

Wave 10 cumulatively declares and binds Waves 1 through 9. Its master input must contain all 62 earlier decisions. A successful browser-only merge carries 64 decisions in the 115-row master, leaving 51 content decisions, 51 route decisions and seven event-gallery records for later waves. The remaining event galleries involve pupil or result claims and child health. Recording, identity or role verification, media approval, implementation and publication remain unchanged.

### Wave 11: pupil achievement and result galleries

`/publication-review/migration-wave-11` is the authenticated, noindex eleventh decision packet. It contains five public `sk_igallery` index records concerning achievements, pupil felicitation, Olympiad participation or a named result claim. Legacy labels are unverified index metadata, not publishable result evidence. They do not prove a pupil's identity or spelling, class or academic year, exam or award body, stage or level, rank or score, outcome, institutional attribution, endorsement, current standing or continuing permission to publish. Immutable legacy wording is preserved only as bound source metadata; any corrected public copy requires a later evidence-backed rewrite.

Wave 11 records route and content intent only. Earlier public availability, a poster or a certificate is not evidence of current guardian consent. Authoritative result proof, purpose-specific guardian or data-subject consent, pupil assent where appropriate, media rights, approved public fields and captions, withdrawal handling, and retention end dates must be verified in the controlled system. No claim, title, route, destination, merge or content decision is preselected. The packet contains no marksheets, certificates, pupil-level marks, roll numbers, guardian details, consent records, supporting evidence, private locations or source media, and it does not retrieve, display, import, copy, approve, activate, transform or publish them. The `identityProtected: false` matrix classification is not proof that gallery media contains no child or personal data, or that consent and rights exist. Every eventual asset and caption still requires separate evidence and media approval, exact-byte binding and activation.

Wave 11 cumulatively declares and binds Waves 1 through 10. Its master input must contain all 64 earlier decisions. A successful browser-only merge carries 69 decisions in the 115-row master, leaving 46 content decisions, 46 route decisions and two child-health event galleries for a later wave. Recording, evidence and consent verification, media approval, implementation and publication remain unchanged.

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
5. Use the Wave 1 combined master as the required input for Wave 2; complete its eight rows and download the 18-decision combined master.
6. Use the Wave 2 combined master as the required input for Wave 3; complete its eight rows and download the 26-decision combined master.
7. Use the Wave 3 combined master as the required input for Wave 4; complete its ten rows and download the 36-decision combined master.
8. Use the Wave 4 combined master as the required input for Wave 5; complete route and content decisions for its five rows and download the 41-decision combined master.
9. Use the Wave 5 combined master as the required input for Wave 6; complete route and content decisions for its twelve rows and download the 53-decision combined master.
10. Use the Wave 6 combined master as the required input for Wave 7; complete route and content decisions for its five rows and download the 58-decision combined master.
11. Use the Wave 7 combined master as the required input for Wave 8; clarify and complete route and content decisions for its two ambiguous rows and download the 60-decision combined master.
12. Use the Wave 8 combined master as the required input for Wave 9; complete route and content decisions for its two institutional-model records only after consulting controlled evidence, then download the 62-decision combined master.
13. Use the Wave 9 combined master as the required input for Wave 10; verify the two visitors' identity, role at the event and event context in the controlled system, complete their route and content decisions, then download the 64-decision combined master.
14. Use the Wave 10 combined master as the required input for Wave 11; verify result evidence and purpose-specific consent in the controlled system, complete the five pupil achievement and result route and content decisions, then download the 69-decision combined master.
15. Complete route and content decisions for the remaining 46 records until all 115 are decided.
16. Validate the completed worksheet in the private intake, then independently reproduce its read-only CLI plan.
17. Implement each destination, redirect, archive or retirement.
18. Verify implementation and complete the separate approval pipelines.
19. Run the migration release audit and composite public-release audit.
20. Deploy publicly only after every independent gate passes and rollback ownership is confirmed.
