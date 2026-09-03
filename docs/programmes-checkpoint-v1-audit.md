# Programmes Intake Contract checkpoint v1.0 - implementation audit

**Audit date:** 2026-09-01  
**Checkpoint:** `Programmes_Intake_Contract_Checkpoint_v1.0.md`  
**Result:** **PARTIAL CONFORMANCE - SAFE TO CONTINUE BUILDING, NOT READY TO PUBLISH**

The implementation has the correct fail-closed publication foundation. It validates an immutable package, produces digest-bound route plans, and keeps all three governed routes out of public discovery, navigation and the sitemap. Each exact route now has an authenticated private-review shell, while its public-mode behavior remains not found. The reusable production Programme components remain intentionally dormant until an approved package can supply their public-safe data.

This audit does not approve content, activate navigation, publish a route, write to Sanity, update the approval manifest or deploy the site.

## Status key

- **Conforms:** implemented and covered by evidence in the repository.
- **Deliberate deviation:** safer or clearer than the checkpoint wording, but must be carried into the next checkpoint.
- **Partial:** the foundation exists, but one or more required details are missing.
- **Missing:** no conforming implementation exists yet.

## Checkpoint matrix

| Section | Status | Implementation evidence | Remaining work |
| --- | --- | --- | --- |
| 1. Intake architecture | Partial | `content/programmes-intake-system.json` and `docs/programmes-intake-system.md` define a Form, repeating-data workbook, controlled Drive folders and publication tracker. | Add the missing Form fields listed below; add an explicit Media and Evidence repeating-data surface; model current-year campus availability. |
| 2. Approved JSON package | Deliberate deviation | `content/programmes-publication.schema.json` and `lib/programmes-publication.ts` enforce schema `1.0.0`, exactly three controlled routes, strict keys and an immutable snapshot. | The implementation uses full `YYYY-YYYY`, adds canonical `claims` and `scholarships`, and does not yet model public documents or admissions CTA/contact records. Record these as a versioned contract change before expanding the schema. |
| 3. Validation order | Partial | Parsing is performed by the planner; shape, primitive, approval, reference, evidence, result, claim, media, content, SEO and navigation checks all exist. | Refactor or document the exact sequential phases. Some checks are currently interleaved inside per-programme validation. Add an exact validation-phase receipt if strict order is operationally important. |
| 4. Publication gates | Deliberate deviation | `validateProgrammesPublicationPackage` calculates route gates and `publicationReady`; `lib/programmes-render-gate.ts` issues an opaque digest-bound render token only from a validator-issued immutable plan. | `navigation` is intentionally downstream of route readiness, matching section 12 but differing from the simplified equality in section 4. `relatedLinkable` is not implemented. |
| 5. Academic-year rules | Partial | Full consecutive academic years are validated; programme, fee, eligibility, schedule, admission and scholarship year mismatches block; historical aggregate results are allowed. | Add year-sensitive campus/facility availability and explicit admission-date records. |
| 6. Approval rules | Conforms with safer identity boundary | Package and child statuses are checked; current validity windows are enforced; most restrictive status wins. Approval uses `approvedByRole`, not a person's identity. | Carry `approvedByRole` into the next checkpoint wording. Add explicit child validity windows where the source contract requires them. |
| 7. Evidence rules | Partial | Stable evidence IDs, type, status, controlled opaque reference, validity and programme scope are validated. Missing, pending, expired and wrongly scoped evidence block. | Model organisation/relationship scope explicitly; align partnership evidence with the ProTrack relationship claim; strengthen route-specific board/recognition requirements. |
| 8. Result rules | Conforms with safer privacy boundary | Only aggregate result fields are accepted. Verification and aggregate-result evidence are mandatory; unverified results block the route and cannot be silently omitted. | Add an explicit result-without-evidence test and document any consent rule that can apply even to aggregate publication. Pupil identities and marksheets remain outside the public package. |
| 9. Claims rules | Partial | Canonical claim records and manifest bindings exist; regulatory, financial, performance and comparative claims require verified evidence. | Add an explicit partnership/relationship claim model, approved use of the word `integrated`, and a prohibited-superlative rule or review gate. Academic claim evidence currently assumes programme approval and does not express every allowed relationship evidence path. |
| 10. Media rules | Conforms for publication validation and private presentation | Stable IDs, type, role, programme scope, approval status, manifest record, alt text, people flag, rights and consent decisions are validated. `lib/programmes-media.ts` and the Programme media components now enforce private-only paths, five fixed ratios, intrinsic ratio agreement, responsive loading, visible captions, descriptive alt text, video captions and a static reduced-motion poster. The three private route shells use only existing campus prototypes and cannot resolve production bindings. | Add explicit publication-validator tests for unresolved rights and required consent. Supply a real private video/poster/WebVTT set before visual video review; do not fabricate one. Production route media still requires exact approved derivative resolution. |
| 11. Route plans and components | Partial | `createProgrammesImplementationPlan` produces three read-only route plans. `components/programmes/programme-components.tsx` provides Hero, Subjects/Streams, Eligibility, Schedule, Fees, Faculty, Facilities, Results, Documents and Admissions CTA components. `lib/programmes-data-adapter.ts` converts an exact accepted package into immutable component-ready projections with digest-bound route gates. The new guarded document resolver and four specialised components require an active exact PDF binding, compatible document kind and explicit Programme-route target before rendering. `components/programmes/private-programme-route-shell.tsx` prepares the same ten structural slots on all three authenticated route shells. | Wire a reviewed resolver to the adapter; do not make the private shells public. Add canonical brochure and other public-document references plus CTA/contact records to a new versioned schema before public wiring. Add exact XI-XII, board, recognised-institution, ProTrack relationship, integrated terminology and campus-availability gates. |
| 12. Navigation | Conforms | Canonical navigation records are mapped only when the route is ready and the navigation record is approved. Static legacy links to governed routes are filtered. | Activate only from a future accepted package; no action now. |
| 13. Sitemap | Conforms | `buildProgrammesSitemap` emits publication-ready routes; `app/sitemap.ts` removes dormant governed routes. | Replace the dormant static exclusion only when a trusted package projection is wired. |
| 14. Public route | Conforms | Dedicated pages now exist at all three exact paths, but each checks private-review mode before authentication and returns not found outside that mode. Their metadata is non-indexable and no-cache. Navigation, footer and sitemap still exclude them. | Replace only the approved branch with a production resolver that requires an issued route gate. Preserve the private/public split and do not add a bypass flag. |
| 15. SEO | Conforms at engine level | Approved SEO records, route scope, approved Open Graph media and index/follow rules are mandatory for route readiness. `lib/programmes-seo.ts` accepts only adapter-issued page objects and prepares title, description, an absolute canonical URL, visible breadcrumbs and independently suppressible `EducationalOrganization`, `EducationalOccupationalProgram` and `BreadcrumbList` templates. | Wire route metadata and JSON-LD only through the same approved resolver used by the page. Resolve approved Open Graph media separately; keep private shells noindex. |
| 16. Digest and receipt | Conforms | Deterministic canonical JSON, package SHA-256, route-level SHA-256 values, counts, route states and an exact read-only receipt exist. Plans are now deep-frozen and marked as validator-issued. | Add an explicit route-relevant mutation test for the corresponding route digest. |
| 17. Required tests | Partial | Core schema/version/unknown/duplicate, reference, status, evidence, expiry, academic-year, result, claim, privacy, canonical digest, public-boundary and browser route tests exist. Component boundary tests now exist. | Add the specific missing cases listed below. |
| 18. Frozen invariant | Conforms for route, nav, sitemap and indexing | The validator's `publicationReady` controls public route planning, sitemap inclusion and indexing; navigation adds its required approval gate. The component token cannot be replaced by a copied object or standalone boolean. | Implement `relatedLinkable` and ensure the eventual route resolver consumes the issued token. |
| 19. Checkpoint rule | Missing | The attached checkpoint exists outside the repository and this audit preserves its meaning. | Add a checkpoint registry and immutable repository copy. Any schema/intake change must become v1.1 or an explicitly breaking v2.0; do not edit v1.0 in place. |

## Intake fields still missing

The current management Form does not explicitly collect:

- programme duration and general delivery mode;
- the formal SSKEMS-ProTrack relationship and supporting relationship claim;
- admission opening, closing and decision dates;
- intake, batch count and capacity;
- approved admissions CTA labels, destination and public contact route;
- policy and privacy permissions;
- information validity, next review date and future update owner;
- a structured `NOT CONFIRMED` state for critical facts;
- confidential/internal-only information separated from the public export.

The workbook has separate Campus and Evidence Register tabs, but no explicit combined `Media & Evidence` repeating-data tab. Media IDs are referenced indirectly. This is workable but does not exactly match the frozen checkpoint.

## Route-specific validation still missing

### `/school/academics`

- public documents and admissions CTA are not canonical package records;
- related programmes are referenced but related-link eligibility is not projected;
- the adapter produces the approved package projection, but no route renderer is wired to consume it yet.

### `/junior-college`

- levels are not asserted to be exactly XI-XII;
- board is not an explicit canonical field in the publication package;
- recognised-institution status is inferred from evidence rather than represented directly;
- campus availability is not current-year data;
- non-empty faculty and facility lists are not route-specific requirements.

### `/programmes/jee-neet`

- the SSKEMS-ProTrack relationship is not an explicit approved canonical record;
- `integrated` terminology is not governed as a specific approved claim;
- operator and delivery summaries exist, but the legal/operational relationship type is not modeled;
- non-empty faculty and facility lists are not route-specific requirements;
- public documents and CTA/contact records are absent.

## Explicit frozen tests still to add

- malformed JSON through the CLI;
- individual missing required fields;
- malformed IDs;
- invalid enum values and invalid dates;
- future approval validity;
- verified result without evidence;
- unresolved media rights and required consent;
- route-relevant mutation changes only the expected route digest;
- production source has no failed-gate override;
- related-content excludes blocked routes.

## Component-system audit

The new component system has these controls:

1. A route page must first obtain an immutable plan from `createProgrammesImplementationPlan`.
2. `issueApprovedProgrammeRenderGate` accepts only the exact plan object issued by that validator process.
3. It checks route readiness and matches both package and route digests to the receipt.
4. Every Programme component uses the same `ProgrammePublicationBoundary` and returns nothing without that opaque gate.
5. Copying the gate object does not copy its authority.
6. Faculty props expose public display fields only.
7. Result props expose aggregate fields only.
8. Programme documents fail closed unless issued by the guarded document resolver; CTA links still require an internal path or HTTPS URL.

The component system does **not** make draft data approved. Its future caller must map props only from the immutable approved package projection associated with the same route digest.

## Chronological remaining build order

1. **Version the contract:** store v1.0 unchanged; draft v1.1 for documents, CTA/contact, relationship, board/status and campus-year fields.
2. **Close the intake gaps:** update the Form, Sheet definitions and tracker without collecting real private data in the repository.
3. **Extend the approved package schema:** add public document and CTA records, explicit board/status and partner relationship records, and current-year campus availability.
4. **Strengthen route validation:** implement exact Junior College and JEE/NEET gates, prohibited claim wording, relationship evidence and related-link readiness.
5. **Complete frozen tests:** add every explicit missing test above before page wiring.
6. **Approved public projection — built:** `lib/programmes-data-adapter.ts` maps only accepted digest-covered records, rejects the package atomically and issues the opaque component gate.
7. **Wire governed routes for approved publication:** the authenticated private shells are ready; add a separate approved branch that consumes the adapter result, requires its issued route gate and otherwise returns not found.
8. **Document integration — built; package references remain:** route-scoped guarded resolution and brochure, timetable/calendar, fee-circular and affiliation components are ready. Add canonical references in schema v1.1 and a canonical brochure record before route wiring.
9. **SEO and structured-data engine — built; route wiring remains:** title, description, absolute canonical URL, breadcrumbs and fail-closed organization/programme JSON-LD are ready. Wire them with approved media/documents, related links, navigation and sitemap from the same route state; navigation still requires its separate approval.
10. **Approved-component accessibility QA:** private-shell structure and routing are covered; verify the final adapter-fed components, tables, responsive layout and content completeness with an approved test fixture.
11. **Management acceptance and activation:** only after real approved data, current evidence and exact receipts exist; then perform a separately authorised deployment/cutover.
