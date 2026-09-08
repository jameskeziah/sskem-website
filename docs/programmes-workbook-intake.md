# Programmes workbook intake preflight

## Outcome

The private `/publication-review/programmes-workbook-intake` route audits a
local XLSX workbook before anyone copies programme information into the guarded
Programmes content package. The browser processes the workbook locally and
returns a code-only, aggregate receipt. When a complete recognized source is
selected, it also shows a temporary, screened programme sketch in browser
memory. It never uploads or persists the source or the sketch.

The currently supplied workbook is structurally readable but **blocked**. A
fully populated response column is not the same as a verified response: many
cells deliberately contain `NOT CONFIRMED`, and every programme record remains
unapproved for publication.

## Recorded audit

The repository keeps only
`content/programmes-workbook-intake-receipt.json`. It is bound to the source by
a SHA-256 fingerprint and records these public-safe aggregates:

- 14 recognized source worksheets;
- 5 of the 9 canonical intake tabs matched exactly;
- 3 programme forms and 423 populated response fields;
- 263 responses containing `NOT CONFIRMED`;
- 119 unresolved critical responses out of 210 critical fields;
- 0 of 3 management-confirmed forms;
- 0 of 3 approved-for-publication forms;
- 0 approved evidence rows; and
- 0 publication-ready tracker rows.

The receipt does not contain the workbook filename or path, raw cell text,
people, contacts, addresses, fee amounts, evidence wording or links, or an
approver identity.

## Temporary private draft

The authenticated review page can use a blocked workbook for a provisional
layout check without treating it as approved content. The draft:

- exists only in component memory and disappears on reset or refresh;
- uses fixed record titles and a small source-cell allowlist;
- suppresses formula-backed, overlong, unconfirmed or risky values;
- shows a fixed `Awaiting management confirmation` fallback for omitted facts;
- never enters the receipt download, repository content, CMS, URL state,
  navigation or sitemap; and
- always remains `Not verified`, `Not approved` and `Not publishable`.

The allowlist is limited to matching academic year controls and selected
high-level class, duration, entry-point, delivery, medium, subject, eligibility
and audience fields. Curriculum marketing copy is currently withheld. Faculty
identities, qualifications and contacts; fees and scholarships; results and
performance claims; board, affiliation and ownership claims; campus addresses;
and evidence, consent and approval records are always excluded.

## Programme page rehearsal

After local inspection, the same browser-memory draft can be rehearsed against
the canonical ten-section Programme page order. The reviewer can switch among
the three source records and see screened facts in the hero, subjects,
eligibility and schedule positions. Fee, faculty, facility, result, document
and admissions-action sections remain visibly locked.

The rehearsal reports screened section coverage separately from publication
readiness. Publication readiness is always `0 / 10`; the feature does not call,
forge or weaken the production Programme render gate. Its printable checklist
contains generic missing requirements and fixed record titles only. Printing
creates a user-controlled private copy that remains unverified and not
publishable.

## Why direct import is rejected

The workbook is not an exact instance of the repository contract in
`content/programmes-intake-system.json`:

1. it has no embedded `sskem-programmes-intake-system` ID and schema-version
   marker;
2. its worksheet structure differs from the canonical nine-tab register;
3. it does not make one compatible institutional-model decision across CBSE
   Senior Secondary, a separate Junior College and exam preparation;
4. critical facts, evidence and validity dates remain unconfirmed; and
5. it contains categories that may hold private or internal information.

The preflight therefore cannot create a Programmes content package. A reviewer
must reconcile a future management-completed source into the existing private
content-package workspace.

## Controls

- XLSX input is limited to 10 MB.
- Only workbook definitions, shared strings and worksheet XML are decompressed.
- Individual and aggregate decompressed-entry limits reduce ZIP-bomb risk.
- External-link, macro and embedded-object package parts are detected and
  rejected.
- The receipt view shows generic record IDs and aggregate counts; the optional
  draft view shows only screened allowlisted facts in the current browser tab.
- The page rehearsal uses a separate private presenter and leaves every
  production Programme component boundary unchanged.
- The downloaded audit receipt uses a generic digest-based filename.
- No `fetch`, form action, URL state, browser storage or server persistence is
  used.
- The audit is not malware scanning and explicitly records that no scan was
  performed.
- The route is authenticated, private-mode-only, `noindex` and excluded from
  the sitemap.

## Operating order

1. Keep the populated workbook in the controlled school system.
2. Resolve every critical unconfirmed field against authoritative evidence.
3. Record the exact institutional model and role-based management decision.
4. Separate private people, contact, internal fee and evidence material from
   the proposed public wording.
5. Open the private workbook-intake route and inspect the revised XLSX locally;
   the temporary draft may be used for layout review only.
6. Clear the temporary draft or close the tab when review is complete.
7. Download and retain the sanitized aggregate audit receipt if needed.
8. Only after the preflight allows controlled reconciliation, manually enter
   the approved public projection in `/publication-review/programmes-content-package`.
9. Re-run the independent claim, media, document, validity and public-release
   gates before any route or navigation activation.

The temporary draft does not approve a claim or verify evidence. Neither the
draft nor the preflight creates a public-safe projection, updates the approval
manifest or CMS, activates navigation, publishes content, deploys the site or
scans the source for malware.
