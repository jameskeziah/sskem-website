# SSKEMS editorial CMS: first-slice operating contract

## Current scope

Sanity is an optional editorial source for a deliberately small set of public
website content. The implemented first slice provides the Studio schemas, a
server-only homepage adapter and adapter unit tests. The Studio contains only
these document types:

- `siteSettings`
- `announcement`
- `admissionCycle`
- `event`

It does not replace the repository's publication controls, guarded media and
document pipelines, or safe local content. A Sanity document is eligible for
the public website only through the server-side CMS adapter. Until a page calls
that adapter, the page continues to use repository-owned content.

## Data boundary

Sanity is for information already suitable for public display. It may contain
official contact details, approved announcements, public admissions guidance
and public event information.

Never store any of the following in Sanity or Sanity Assets:

- enquiry, applicant, student or guardian records;
- dates of birth, identity documents, medical/support details or attendance;
- consent forms, consent evidence or private pupil media;
- private or unapproved PDFs and source documents;
- approver names, email addresses, signatures or other identities;
- controlled evidence, audit attachments, internal notes or private file paths;
- passwords, API tokens or operational credentials.

Admissions submissions remain in a separate protected service. Public PDFs
continue through `docs/document-ingestion.md`; campus media continues through
`docs/campus-media-ingestion.md`. The current CMS types do not upload or publish
those assets.

## Implemented content model

Each document has a `publication` object. The shared website-adapter contract is
exactly:

| Field | Meaning |
| --- | --- |
| `publication.state` | `draft`, `inReview`, `published` or `retired` |
| `publication.approvalRecordId` | Opaque ID of the matching publication-approval record; required when state is `published` |
| `publication.validFrom` | Start of the public display window |
| `publication.validUntil` | End of the public display window; Studio rejects a supplied end earlier than its supplied start |

Studio also captures the accountable content-owner role and last-review time for
editorial operations. They are outside the four-field adapter projection, are
not approval evidence and do not make content public. Studio and the first-slice
adapter both require the start and end boundaries for published records.

The four document types and their current homepage projections are:

| Type | Studio fields | Fields read by the first-slice adapter |
| --- | --- | --- |
| `siteSettings` | `schoolName`, `shortName`, `affiliationNumber`, public `contact` and `publication` | `contact.location`, `phone`, `mobile`, `email`, `principalEmail` and `workingHours` |
| `announcement` | `title`, `message`, optional internal-path/HTTPS `href` and `publication` | `title`, `message` and `href` |
| `admissionCycle` | `institution`, `academicYear`, `publicStatus`, `publicMessage`, `verifiedAt` and `publication` | the same public fields |
| `event` | `title`, optional `summary`, required `startAt`, optional `endAt`, `location`, internal-path/HTTPS `href` and `publication` | the same public fields |

An admission-cycle document contains no application or class record. An event
contains no attendee or registration response. Studio fields absent from the
adapter projection are not yet website content.

The Studio schemas provide required-field, length, URL and date-order checks.
They improve editor input but are not a security boundary; the website adapter
must validate data again.

## Publication and approval flow

1. An **Author** creates a draft containing public editorial information only.
2. A **Reviewer** checks accuracy, dates, links, accessibility and whether the
   item belongs within the CMS boundary, then moves it to `inReview`.
3. The responsible school process completes the applicable checks in
   `content/approval-manifest.json`. Private evidence and approver identities
   remain in the school's controlled system; the manifest stores only opaque
   evidence references and approving role.
4. The CMS document's `publication.approvalRecordId` is set to the matching
   manifest record ID. The ID is a reference, not evidence.
5. A **Publisher** changes the exact reviewed document to `published` only
   after approval. Studio validation refuses `published` without an approval ID.
6. The public website independently accepts the document only when the adapter
   confirms the publication state, approval record and validity window.

The adapter fails closed: draft, in-review, retired, missing-window,
not-yet-valid, expired, missing-approval and unapproved records do not become
public CMS content.
Changing a CMS state does not change the canonical manifest decision.

## Roles

| Role | May | Must not |
| --- | --- | --- |
| Author | Create and edit drafts | Publish or enter private evidence |
| Reviewer | Check copy, dates, links and readiness | Treat review as formal approval |
| Publisher | Publish or retire the reviewed item | Override the website's approval checks |
| Compliance/management approver | Complete the controlled approval process | Store private evidence or identity details in Sanity |
| Technical operator | Configure the adapter, run audits and migrate content | Invent an approval or weaken a failed gate |

Use named, least-privilege Sanity accounts with MFA. Remove access promptly when
responsibilities change. Keep document upload and approval separated wherever
the existing document process requires it.

## Runtime configuration

The root website currently recognises exactly these server-side keys:

| Key | Purpose |
| --- | --- |
| `SANITY_PROJECT_ID` | Enables the Sanity adapter when populated; leaving it empty keeps the verified local fallback active |
| `SANITY_DATASET` | Dataset name; the example uses `production` |
| `SANITY_API_VERSION` | Optional pinned API date; defaults to `2026-08-12` when omitted |

The names and safe defaults are recorded in the root `.env.example`. Do not add
tokens to browser-visible variables. Studio uses its separate public identifiers
from `studio/.env.example`; it must not contain API tokens.

Pages and components must use the one server-side adapter rather than issuing
their own Sanity queries. The CMS connection is optional in this first slice:
missing configuration or an unavailable/invalid CMS response must not prevent
the site from rendering.

## Safe fallback behaviour

- With no `SANITY_PROJECT_ID`, the adapter uses the verified repository-owned
  editorial fallback.
- If Sanity is unreachable, returns malformed data or has no eligible record,
  the adapter returns the corresponding safe local fallback.
- A CMS value never replaces the fallback unless it passes the adapter's
  publication and approval checks.
- Optional CMS lists may be empty rather than displaying a draft, expired or
  unapproved item.
- Admissions continues to use its honest local verification/availability
  wording when no approved CMS cycle is available.
- CMS failure must not remove Mandatory Public Disclosure, document archive or
  essential school-contact navigation.

## WordPress migration order

1. Maintain the schema-backed WordPress URL inventory in
   `content/legacy-cutover-inventory.json`; its owner roles, dispositions and
   direct redirect targets are implemented and audited through
   `docs/legacy-cutover.md`.
2. Run the four-type Sanity slice alongside the local fallback. Do not change
   public routes during initial comparison.
3. Migrate one approved `siteSettings` record, then announcements, the current
   admissions cycle and current public events.
4. Review every imported item; do not bulk-publish old WordPress content. Prior
   publication does not prove current accuracy, rights or consent.
5. Do not copy the WordPress uploads directory into Sanity. Route candidate
   images and PDFs through the existing guarded pipelines.
6. Preserve useful slugs and add permanent redirects for retired WordPress URLs.
7. Keep WordPress read-only during comparison. Decommission it only after owner
   sign-off, redirect verification, backup and rollback ownership are complete.

Additional page types should be proposed only after this slice is proven in
production. Do not model pupil results, galleries or document storage merely to
speed up migration.

## Verification of the current slice

The eight tests in `tests/cms-editorial.test.mjs` currently prove that the
server adapter:

- makes no request and returns the reviewed local fallback when Sanity is not
  configured;
- rejects an invalid `SANITY_API_VERSION` before making a request and returns
  the safe fallback with an `invalid-config` status;
- rejects a record whose manifest decision is not approved;
- skips a future record and selects a later approved record whose publication
  window is current;
- rejects a published record if either validity boundary is absent;
- rejects executable links;
- safely merges partial approved contact/admissions values with local fallbacks,
  normalises email, sorts events and limits the homepage result to three; and
- fails closed to local content on network failure or a malformed Content Lake
  response.

The root test suite must include this file before the CMS slice is treated as a
release gate. Studio schema validation is currently implemented in schema code,
but it does not yet have an automated schema-test harness.

Manual acceptance before connecting a real dataset:

- verify least-privilege Studio roles and MFA;
- enter one harmless record of each type and confirm the expected validation;
- confirm no private data or unapproved asset has been imported;
- compare approved CMS output with the repository fallback on mobile and desktop;
- disconnect the CMS and confirm the public pages remain usable.

## Later phases and unimplemented acceptance gates

The first slice does **not** yet promise authenticated draft preview, webhook
revalidation, tagged caching, revision/digest binding, route-target approvals,
CMS asset publication, CMS document uploads or a mandatory-CMS mode. Those
features require separate design, implementation and tests before this contract
can describe them as active controls.

Also add future tests for Studio schema exports and validation, browser-rendered
CMS content, no-JavaScript output, accessibility, connection to a real test
dataset, migration redirects and the guarded media/document boundaries. These
are acceptance requirements for later rollout, not evidence supplied by the
current adapter test file.
