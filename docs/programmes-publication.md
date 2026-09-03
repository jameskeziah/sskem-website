# Programmes publication contract

## Purpose

The Programmes publication contract is the deterministic boundary between a
future management-approved source package and any website implementation. A
package never flows directly into a page, navigation, sitemap, Sanity or a
deployment.

The first operation is always:

```text
parse JSON
  -> validate schema and supported version
  -> validate academic year and package approval
  -> resolve every canonical reference
  -> validate evidence, aggregate results, claims and media
  -> calculate each route independently
  -> generate a read-only implementation plan
  -> canonicalise the exact package
  -> generate package and route SHA-256 digests
  -> generate a non-authorising receipt
```

Any content-gate failure remains a blocking error. No automatic repair,
best-effort record dropping, production bypass or administrator override exists.

## Implemented files

- `content/programmes-publication.schema.json` is the strict JSON Schema for
  version `1.0.0`.
- `lib/programmes-publication.ts` implements deterministic validation, route
  gates, canonicalisation, SHA-256 digests, navigation/sitemap projections, the
  implementation plan and receipt.
- `lib/programmes-data-adapter.ts` converts one fully accepted package into
  immutable component-ready page projections and rejects incompatible owning
  institution types.
- `lib/programmes-seo.ts` prepares exact metadata, canonical URLs, breadcrumbs
  and independently suppressible Schema.org organization/programme graphs from
  adapter-issued page projections only.
- `lib/programmes-media.ts` and `components/programmes/programme-media.tsx`
  provide private-only responsive image/video slots with strict source,
  ratio, caption, alt-text, loading and reduced-motion rules.
- `lib/programmes-document-integration.ts` and
  `components/programmes/programme-document-groups.tsx` resolve exact guarded
  PDF bindings into route-scoped brochure, timetable/calendar, fee-circular
  and affiliation components. Missing approval or route scope yields no files.
- `lib/programmes-publication-routes.ts` owns the exact three governed routes.
- `scripts/plan-programmes-publication.mjs` is the read-only command surface.
- `tests/programmes-publication.test.mjs` proves the principal publication
  denials and digest invariants.

## Compatibility and privacy decisions

The publication contract deliberately tightens three examples from the initial
brief so it remains compatible with the existing controlled publication system:

1. Academic years use the existing consecutive full-year format
   `2026-2027`, not the shortened `2026-27` form.
2. Approval attribution is `approvedByRole`, using a lowercase role slug. A
   person's name or email address is not allowed in the repository package.
3. Results are aggregate public claims. Pupil names, scores tied to identities,
   consent documents and similar pupil-level records are not package fields.
   Consent and source evidence remain in the controlled system.

Evidence records expose only an opaque `controlledReference`. Paths, URLs,
filenames and document contents are rejected. Claims and media additionally
reference the current canonical approval manifest; package-level approval cannot
override a blocked, withdrawn or expired claim/media decision.

## Package structure

One immutable package contains:

- a supported schema version, package identity, academic year and generation
  time;
- a current package-level approval window;
- canonical evidence, organisation, faculty, facility, aggregate result, fee,
  scholarship, media and claim collections;
- exactly one programme record for each governed route;
- canonical navigation records; and
- canonical SEO records.

Programme records contain IDs only for repeating records. Faculty, results,
fees, media, claims and evidence must not be duplicated inside page data.

The required programme/route pairs are exact:

| Programme ID | Route |
| --- | --- |
| `school-academics` | `/school/academics` |
| `junior-college` | `/junior-college` |
| `jee-neet` | `/programmes/jee-neet` |

Missing routes, duplicate routes or a mismatched programme ID are blocking
schema failures.

## Gate behaviour

Each route receives these content gates:

- schema and supported schema version;
- academic year;
- package and programme approval;
- reference resolution;
- evidence validity and scope;
- aggregate-result verification;
- claim validity, evidence and canonical manifest decision;
- media rights, consent where applicable and canonical manifest decision;
- required route content; and
- SEO completeness and canonical-path agreement.

`publicationReady` is true only when every content gate passes. An unverified
result referenced by a programme blocks the complete route; it is never silently
removed so the remainder can publish.

Navigation remains downstream. A content-ready route with an unapproved
navigation record may remain publication-ready but receives
`showInNavigation: false`. Sitemap inclusion derives from route publication
readiness, never from the presence of a route file.

## Evidence rules

Evidence must exist, be `verified`, be current, be scoped to the programme and
have the correct type where one is required. The validator enforces at least:

| Data or claim | Required evidence type |
| --- | --- |
| Junior College status | `affiliation` or `recognition` |
| Current fee | `fee-circular` |
| Scholarship | `scholarship` |
| Aggregate result/performance claim | `aggregate-result` |
| Faculty qualification | `faculty-qualification` |
| Facility description | `facility` |
| Academic programme claim | `programme-approval` |
| Media rights | `media-rights` |
| Media containing people | `media-consent` |

Historical aggregate results may predate the package academic year. Current
fees, scholarships, eligibility, schedules, admissions and programme records
must match it exactly.

## Claim rules

Claims are canonical records with one of these risk classes:

- informational;
- academic;
- performance;
- comparative;
- regulatory; or
- financial.

Every claim must be approved, current, scoped to the organisation/programme and
covered by an approved current `claim-*` record in
`content/approval-manifest.json`. Academic, performance, comparative,
regulatory and financial claims require evidence appropriate to their class.

## Public fail-closed boundary

Until a later, separately reviewed activation change consumes a passing plan and
exact receipt:

- all three governed public routes return `notFound()`;
- the routes are absent from generated static parameters;
- they are absent from header search/navigation and footer links;
- they are absent from the sitemap; and
- the private Programmes prototype remains the review surface.

A route file or placeholder page cannot make a programme public. No current
package, plan or binding is active.

## Read-only command

After management supplies the future package, run:

```text
npm run programmes:plan -- <approved-package.json>
```

For reproducible review at a controlled time:

```text
npm run programmes:plan -- <approved-package.json> --now=<ISO-date-time>
```

The command reads the package and canonical approval manifest, writes the plan
to standard output and exits non-zero when content publication is blocked. It
does not write a file, mutate the repository, update the approval manifest,
publish content, activate navigation/sitemap entries, write to Sanity or deploy.
It never includes the input file path in the plan or receipt.

## Plan and receipt

The plan contains the package decision, blocking issues, route-specific gates,
required component list, exact referenced-record mappings, media/SEO/navigation/
claim mappings and a route digest.

The receipt contains:

- package, schema, academic-year and approval IDs;
- controlled validation time;
- SHA-256 of JCS-style canonical UTF-8 JSON;
- gate summary;
- route readiness;
- exact counts for all canonical collections;
- one digest per route's exact referenced projection; and
- `publicationAuthorized`, which is true only when all three content routes are
  ready.

The same semantic JSON with different key ordering receives the same package
digest. Any approved-data change, including a one-rupee fee change, changes the
digest. A receipt records validation; it does not itself publish or activate the
website.

## Remaining after a passing plan

A passing plan still requires a separate implementation and activation change:

1. compare the plan with the exact approved management package;
2. implement the three route projections from canonical references;
3. privately review the exact rendered output;
4. bind the exact package, route projections and code revision;
5. rerun media, document, accessibility, performance and release audits;
6. activate route/navigation/sitemap projections atomically; and
7. deploy only with separate explicit authorization and rollback ownership.
