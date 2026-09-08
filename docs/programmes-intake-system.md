# Programmes intake and publication register

## Outcome

This contract defines the next operational layer around the existing private
Programmes content package. It is the source specification for:

1. one restricted Google Form for the non-repeating management decision;
2. one controlled Google Sheet for repeating programme data and publication
   tracking;
3. one controlled Drive folder tree for the actual evidence; and
4. one explicit gate from reviewed source material to the existing guarded JSON
   package and, later, the public website.

The machine-readable definition is
`content/programmes-intake-system.json`. It contains no real school claim,
fee, result, person, approval or evidence record. Its Google assets are not yet
provisioned.

## What each system owns

| System | Owns | Does not prove or do |
| --- | --- | --- |
| Google Form | One management intake response for an academic-year decision package | Approval, publication or evidence verification |
| Google Sheet | Repeating faculty, fee, result, scholarship and campus rows; evidence index; publication tracker | Canonical claim approval or public activation |
| Controlled Drive | Original documents, result proofs, media, consent evidence and decision records | Automatic website eligibility |
| Programmes review workspace | Validation and download of the exact public-safe package | Persistence, approval, manifest updates or deployment |
| Approval manifest | Current repository-visible decision for each public claim | Storage of private evidence or approver identity |
| Sanity | Approved public display content only | Evidence storage, admissions records or an approval override |

The populated Sheet and its private Drive links must remain in controlled Drive.
Only approved public projections, opaque evidence IDs, role slugs and exact
publication receipts may cross into the repository.

## Canonical IDs

The intake uses three fixed programme IDs:

| ID | Meaning |
| --- | --- |
| `PRG-CBSE-SS` | CBSE Senior Secondary pathway |
| `PRG-JUNIOR-COLLEGE` | Separate Junior College pathway |
| `PRG-EXAM-PREP` | JEE, NEET and CET preparation |

Repeating rows use typed stable IDs: `CMP-*`, `FAC-*`, `FEE-*`, `RES-*`,
`SCH-*`, `EVD-YYYY-NNNN` and `PUB-*`. Never use a person's name, phone number,
email address, Drive URL or filename as an ID.

## Google Form build specification

Create a restricted Form named **SSKEMS Programmes management intake**. Use one
response per academic-year package and branch the CBSE Senior Secondary and
Junior College sections from the institutional-model answer.

The six sections and exact field IDs are defined in
`programmes-intake-system.json#googleForm.sections`:

1. Control record: academic year, submitting role and institutional model.
2. CBSE Senior Secondary: official identity, board, affiliation, classes,
   streams, subjects, eligibility, public fee wording, admissions and summary.
3. Separate Junior College: the same verified programme facts, shown only when
   that pathway is current.
4. JEE, NEET and CET preparation: operator, curriculum, timetable, public
   faculty and fee summaries, facilities, results decision and public summary.
5. Publication direction: exact claims, requested media IDs and navigation.
6. Approval: at least two opaque evidence IDs, approving role, dates and the
   exact final confirmation value expected by the existing package validator.

The Form may use the authorised Google account for access auditing inside the
controlled environment. The exported Programmes package must contain only the
approving role slug, never a person's identity or email address.

## Google Sheet build specification

Create one native Google Sheet named **SSKEMS Programmes publication register**.
Use protected header rows, filters, dropdowns sourced from `Lists`, frozen key
columns and separate protected formula columns. The exact ordered columns are
defined in `programmes-intake-system.json#googleSheet.tabs`.

The register has these tabs:

| Tab | One row per | Critical rule |
| --- | --- | --- |
| Programmes | Programme and academic year | Summary row only; detail stays in the Form/package |
| Faculty | Public faculty profile and programme | No contact details; public name/bio requires the applicable consent and claim decision |
| Fees | Fee category and academic year | Record only exact approved public wording and a current circular reference |
| Results | Aggregate result claim | No pupil-level data; every published metric needs result-proof evidence and a claim record |
| Scholarships | Scholarship and academic year | Eligibility, benefit and deadline must match current evidence |
| Campus | Campus | Use approved public location/facility wording and approved media IDs only |
| Evidence Register | Controlled evidence item | The Drive link remains private; repository exports keep only the evidence ID |
| Publication Tracker | Proposed public item | One explicit blocker whenever all gates do not pass |
| Lists | Dropdown value | Protected administrator-owned reference data |

The `Publication Tracker` computes readiness from independently reviewed gates.
Its logic is:

```text
READY only if
  required public fields are complete
  AND evidence is verified and current
  AND every exact claim has a current approved manifest record
  AND management decision is approved and current
  AND SEO title and description are reviewed
  AND navigation placement and public URL are assigned
  AND selected media/documents pass their own pipelines
  AND the exact public output has its required revision or digest receipt.

Otherwise BLOCKED with one explicit blocker.
```

`sanityState` is only an editorial state. It cannot satisfy any approval gate.

## Controlled Drive build specification

Create the root `SSKEMS-Controlled-Publication`, restricted to authorised school
roles. The ordered folders and naming rule are defined in
`programmes-intake-system.json#controlledDrive`.

Important boundaries:

- affiliation, fee, timetable, brochure, result, faculty, media, consent and
  approval source files stay in Drive;
- the publication workspace contains aggregate result evidence only, never
  pupil-level exports;
- consent records stay in the private Consent folder and are referenced by an
  opaque evidence ID only;
- filenames start with the assigned evidence ID; and
- the public-export folder contains only reviewed public-safe packages and exact
  publication receipts.

## Chronological operating order

1. Provision the restricted Drive root, roles and retention rule.
2. Create the native Sheet from the tab and column definition; protect headers,
   list values, formulas and tracker gates.
3. Create the restricted Form with the exact field IDs and branching rules.
4. Pilot only `PRG-CBSE-SS` for one current academic year.
5. Upload authoritative documents to Drive and assign opaque evidence IDs.
6. Enter repeating rows in the Sheet; do not add pupil records or staff contact
   details.
7. Complete the Form using exact management-reviewed public wording.
8. Verify evidence and claims independently; record blockers honestly.
9. Enter the approved decision in the private Programmes review workspace and
   download the validated JSON package.
10. Compare the package with the Sheet source rows and current evidence validity.
11. Make a separate implementation change for public routes and navigation.
12. Complete private exact-output review, media/document gates and required
    revision/digest binding.
13. Publish only after the release audit passes. Record the actual publication
    date and receipt; keep rollback ownership explicit.
14. Repeat for Junior College, then exam preparation. Do not combine all three
    pathways in the first pilot.

## Built and remaining

Built in the repository:

- the private Programmes management workspace;
- the private, browser-only XLSX intake preflight and sanitized digest receipt;
- the schema-backed JSON package and validator;
- the programme, evidence, navigation and approval guardrails;
- the machine-readable Form/Sheet/Drive/tracker specification; and
- automated contract checks for the intake boundary.

Still external and deliberately not claimed as complete:

- Google Drive connection and restricted folder provisioning;
- native Google Sheet and Form creation;
- real current school, Junior College and JEE/NEET/CET source collection;
- resolution of the blockers recorded by the current workbook intake receipt;
- management decisions, evidence verification and claim approvals;
- completion of the first approved Programmes JSON package;
- public route population, navigation activation, Sanity records/bindings; and
- public deployment or legacy-site cutover.

Building this intake contract does not approve a claim, provision Google assets,
write to Sanity, update the approval manifest, activate navigation, publish
content or deploy the website.
