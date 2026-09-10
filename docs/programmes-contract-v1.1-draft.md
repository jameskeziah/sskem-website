# Programmes publication contract v1.1 draft

## Outcome

The v1.1 contract is now drafted as a separate, non-activating supplement to
the current Programmes publication package. It defines the records missing from
v1.0 without changing the accepted v1.0 schema or validator.

The frozen base schema is `content/programmes-publication.schema.json`, version
`1.0.0`, SHA-256
`6d5a72a61a06bfdec060b3fe4266dfc02b7940bd5de531296174b49dd4f04bd3`.
The registry in `content/programmes-publication-contract-registry.json` keeps
v1.0 active and marks v1.1 as `draft-not-activated`.

## Draft scope

The schema in `content/programmes-publication-v1.1-draft.schema.json` adds the
five original missing publication areas plus two supporting collections exposed
by the management intake:

1. `publicDocuments` references a guarded brochure, timetable, fee circular or
   affiliation document. It never accepts an arbitrary file URL. A brochure
   must remain `catalogue-extension-required` with null pipeline IDs until the
   guarded document catalogue is versioned.
2. `admissionsActions` records CTA wording, a safe internal or HTTPS
   destination, an internal public contact route, and a dated, year-round or
   not-confirmed admissions window. It stores no personal staff contact.
3. `programmeGovernance` assigns operation, enrolment, fee collection,
   academic delivery, entrance-exam coaching and certification responsibilities
   to an organisation without misusing an organisation-relationship record.
4. `organisationRelationships` records the relationship between two distinct
   institutions, exact public wording, claim and evidence references, and
   explicit yes/no decisions for academic-wing, coaching-wing, partner and
   `integrated` terminology.
5. `boardAndStatus` records the recognised institution name, explicit board,
   affiliation/recognition or programme-approval status, public wording, claim,
   evidence and validity.
6. `institutionalIdentifiers` stores affiliation/recognition numbers,
   institution/school codes and UDISE/official codes as separate typed records.
7. `campusAvailability` records programme availability by campus and academic
   year, with delivery mode, duration, batch count and intake capacity.

All objects reject unknown fields. Programme IDs are tied to the three governed
routes, academic years must be consecutive `YYYY-YYYY`, validity dates must be
real and ordered, and confirmed facts require current evidence. The draft
supports a structured `not-confirmed` state instead of placeholder copy.

## Publication boundary

`lib/programmes-publication-v1-1-draft.ts` validates draft supplements and
always returns `publicationAuthorized: false`. It does not issue a Programme
render gate. `approved` is deliberately not a valid draft review status.

The v1.1 draft does not:

- change the v1.0 schema or runtime validator;
- approve a programme, claim, relationship, document or contact action;
- write evidence, personal contacts or approver identities to the repository;
- update the approval manifest;
- populate a public Programme route;
- activate navigation or the sitemap; or
- deploy the website.

The earlier intake spelling `SHREE SAMARTHA KRUPA ENGLISH MEDIUM SCHOOL (CBSE)`
is retained only as a superseded historical submission. The later
official-record reconciliation uses `Shree Samarth Krupa English Medium School`
for the CBSE entity and separately records the Maharashtra Junior College and
Shree Samarth Krupa Institute.

This reconciliation exposes two additions needed before promotion: the schema
must represent both the current and renewal affiliation periods without
conflation, and it must bind subjects to the exact stream and regulatory entity.
The reconciled data remains a private candidate rather than approved contract
content.

## Required promotion sequence

1. Review and accept or revise this field contract.
2. Update the Form, Sheet and publication tracker definitions to collect the
   new fields without putting real controlled data in the repository.
3. Add affiliation-period and stream-to-subject records, then promote the
   accepted definitions into a full v1.1 approved-package schema and validator
   as a separate implementation change.
4. Add the route-specific relationship, board/status, campus and related-link
   gates and the remaining frozen tests.
5. Only then collect and validate an exact, management-approved package in the
   controlled system.
6. Public route wiring and deployment remain separate, explicitly authorised
   steps after every release gate passes.

Step 2 is now built: the machine-readable Form, Sheet and tracker definitions
collect these fields and preserve the supplied partial rows as a blocked,
non-authorizing private-review candidate. The next chronological build is step
3, promotion into a full approved-package schema and validator, after this
field contract is accepted. Source-data correction, documentary evidence and
management approval remain separate prerequisites for publication.
