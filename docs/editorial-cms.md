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
| `publication.approvalRecordIds` | Exact unique set of opaque claim-approval IDs required by the displayed fields; at least one is required when state is `published` |
| `publication.validFrom` | Start of the public display window |
| `publication.validUntil` | End of the public display window; Studio rejects a supplied end earlier than its supplied start |

Studio also captures the accountable content-owner role and last-review time for
editorial operations. They are outside the four-field adapter projection, are
not approval evidence and do not make content public. Studio and the first-slice
adapter both require the start and end boundaries for published records.

The four document types and their current homepage projections are:

| Type | Studio fields | Fields read by the first-slice adapter |
| --- | --- | --- |
| `siteSettings` | public `contact` and `publication` | `contact.location`, `phone`, `mobile`, `email`, `principalEmail` and `workingHours` |
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
4. The CMS document's `publication.approvalRecordIds` is set to the exact set
   of matching manifest claim IDs. The IDs are references, not evidence. Every
   referenced claim must pass independently; one approved claim cannot cover an
   unrelated field.
5. A **Publisher** changes the exact reviewed document to `published` only
   after approval. Studio validation refuses `published` without approval IDs.
6. A technical operator records the exact published document ID, `_rev` and
   SHA-256 digest of the adapter's sanitized public projection in
   `content/editorial-publication-bindings.json`. The registry stores the
   accountable role and public-safe notes, never an approver identity or the
   controlled evidence.
7. The public website independently accepts the document only when the adapter
   confirms the publication state, every approval record, validity window, exact
   revision and exact content digest.

The adapter fails closed: draft, in-review, retired, missing-window,
not-yet-valid, expired, missing-approval, unapproved, unbound, changed-revision
and digest-mismatched records do not become public CMS content.
Changing a CMS state does not change the canonical manifest decision.

## Exact revision and digest binding

`content/editorial-publication-bindings.json` is a public-safe receipt registry,
not an approval system. Each entry binds an exact set of claim approval records
to one published Sanity document ID, one exact `_rev` and one lowercase SHA-256 digest.
The digest covers canonical JSON containing the content type, document ID,
revision and the exact sanitized projection that the adapter would display.
Object keys are sorted and array order is preserved.

One approval record cannot bind multiple revisions, and one document revision
cannot have multiple bindings. Draft IDs are rejected. A valid binding remains
insufficient on its own: every referenced claim must also be currently approved
in `content/approval-manifest.json`, and the CMS publication window must be
current. Run `npm run editorial:bindings:audit` after every registry edit.

The repository starts with zero bindings because no real Sanity revision has
completed the controlled approval process. This is intentional: connecting a
dataset cannot make its records public until exact review receipts are added.
If an editor changes any accepted record, Sanity creates a different revision;
the adapter refuses it until the changed public projection is reviewed and a
new binding replaces the old one.

## Private exact-output review

The private review deployment exposes `/publication-review/editorial`. It
queries the same server-only adapter and shows only the allowlisted, sanitized
projection that the public homepage would receive. It never displays the raw
Sanity document, draft fields, credentials or fields outside the four homepage
projections.

For each published candidate the screen shows the exact document ID, `_rev`,
approval reference, display window, sanitized JSON projection and SHA-256
digest. A binding receipt download is enabled only when all of these pass:

- the published document identity and revision are valid;
- the public projection passes server sanitization;
- every referenced claim is currently approved in the canonical manifest; and
- the publication window is current.

The download route re-fetches and re-validates the requested revision on the
server. It returns a single public-safe binding object with private no-store
headers; it does not write the registry or approve the claim. Add the proposed
object to `content/editorial-publication-bindings.json`, run
`npm run editorial:bindings:audit`, and review the resulting change normally.
If Sanity changes between screen review and download, the exact revision no
longer matches and the request is refused.

This screen uses dispatch-owned ChatGPT sign-in and the private Sites access
policy, not an app-owned password or OAuth stack. The page requires an
authenticated platform user, and the receipt endpoint independently rejects
requests without the authenticated-user headers. The private Site access policy
remains the authorization boundary; sign-in alone does not prove school or
workspace membership. `HOMEPAGE_REVIEW_MODE=private` only makes the routes
available and is not authentication by itself. Search directives are never
treated as access control.

## First site settings migration packet

The authenticated review screen can download a public-safe first-record packet
from `/publication-review/editorial-site-settings-packet`. The packet is built
from `app/data/site.ts#siteFacts` through the schema-backed field map in
`content/editorial-site-settings-migration.json`. It compares all seven public
contact fields with their controlling claims and prepares a `draft`
`siteSettings` candidate without writing to Sanity.

The complete address requires `claim-complete-address`; phone, mobile, public
emails and working hours require `claim-public-contact`. Both claims must be
current and approved. The current manifest blocks both, so the packet honestly
reports `review-required` and cannot imply migration or publication readiness.
It contains neither approval evidence nor approver identities, and deliberately
omits `lastReviewedAt` and publication dates until a human review supplies them.

Run `npm run editorial:site-settings:audit` after changing the field map. Once
both claims pass, the guarded importer can create the first draft without
granting approval or publishing it. Its default mode is a local plan and makes
no network request:

```text
npm run editorial:site-settings:import
```

The external create requires all of the following at the same time:

- both controlling claims are current and approved in the canonical manifest;
- `SANITY_PROJECT_ID`, `SANITY_DATASET`, the pinned `SANITY_API_VERSION`, and a
  process-only `SANITY_IMPORT_TOKEN` with the minimum required write access;
- the `--apply` flag; and
- the exact acknowledgement
  `--acknowledge-external-write=cms-site-settings-first-record`.

The importer uses a single `create` mutation for `drafts.site-settings`. It does
not use `createOrReplace`, does not publish, and refuses to overwrite an existing
draft. Keep the import token out of `.env`, `.env.example`, Studio configuration,
logs, receipts and the repository. If the request outcome or response receipt is
uncertain, inspect Sanity transaction history before retrying.

After the draft is created, complete Studio review, publish the exact reviewed
revision, and return to the exact-output screen for the binding receipt. Building
the importer does not authorize or execute the external write; the current two
blocked claims still prevent it.

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
  publication, approval, exact-revision and content-digest checks.
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

The eleven tests in `tests/cms-editorial.test.mjs` currently prove that the
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
- rejects both content edits and revision changes after an exact review receipt
  has been recorded; and
- exposes only the sanitized public projection to private review and generates
  a receipt for the exact reviewed revision; and
- requires every claim in a multi-claim approval set before generating a
  receipt; and
- fails closed to local content on network failure or a malformed Content Lake
  response.

The five tests in `tests/editorial-publication-bindings.test.mjs` additionally
prove that the repository registry and approval manifest pass a joint audit,
unsafe draft/digest/reference values are rejected, and one approval cannot
silently authorize multiple revisions or be bound before approval. They also
prove that one revision may require an exact set of independently approved
claims.

The three tests in `tests/site-settings-migration.test.mjs` prove complete field
coverage, the two-claim readiness gate and rejection of an incomplete or
redirected source map.

The five tests in `tests/site-settings-import.test.mjs` prove that local planning
makes no request, blocked or unacknowledged writes fail before the network, the
approved path creates only the canonical draft, receipts exclude the token, and
a rejected create is never retried as an overwrite.

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

The current slice does **not** yet promise draft preview, webhook
revalidation, tagged caching, route-target approvals, CMS asset publication,
CMS document uploads or a mandatory-CMS mode. Those
features require separate design, implementation and tests before this contract
can describe them as active controls.

Also add future tests for Studio schema exports and validation, browser-rendered
CMS content, no-JavaScript output, accessibility, connection to a real test
dataset, migration redirects and the guarded media/document boundaries. These
are acceptance requirements for later rollout, not evidence supplied by the
current adapter test file.
