# Programme document integration

## Purpose

The Programme document layer presents brochures, timetables/calendars, fee
circulars and affiliation records without accepting arbitrary file URLs. It
reuses the existing guarded PDF ingestion, approval, publication and activation
pipeline.

The integration does not inspect, approve, publish, activate or deploy a PDF.
It only projects a document after the existing registry and manifest establish
that the exact public file is current and approved for the requested Programme
route.

## Runtime boundary

`resolveApprovedProgrammeDocuments` in
`lib/programmes-document-integration.ts` requires:

1. a governed Programme route;
2. a stable reference ID, presentation kind and canonical document ID;
3. a valid complete public-document registry;
4. a current exact PDF binding;
5. a current approved manifest record with all document checks verified; and
6. the exact Programme route in that record's `publicTargets`.

Resolution is atomic. A missing binding, wrong kind, duplicate reference,
invalid registry, expired approval or missing route scope returns no public
documents. The public projection excludes hashes, evidence references, source
paths and approver identity. Components also require resolver-issued object
identity, so a copied or hand-built object cannot provide rendering authority.

## Presentation kinds

| Component | Current compatible guarded record |
| --- | --- |
| `ProgrammeBrochures` | None in Appendix IX pipeline v1 |
| `ProgrammeTimetables` | `mpd-c-2` annual academic calendar |
| `ProgrammeFeeCirculars` | `mpd-c-1` current fee structure |
| `ProgrammeAffiliationDocuments` | `mpd-b-1`, `mpd-b-3`, `mpd-b-4` |

The brochure component is complete but intentionally produces no output until
a canonical brochure/prospectus record is added through a versioned extension
of the guarded document catalogue. An affiliation record cannot be relabelled
as a brochure to bypass that change.

## Component behaviour

`ProgrammeDocuments` groups resolver-issued files into the four specialised
components. Each card exposes only approved public metadata:

- title and public note;
- current or expiring-soon status;
- academic/publication period;
- issuing authority, issue date and applicable expiry date;
- PDF page count and readable file size;
- language and accessibility status; and
- explicit view-in-new-tab and download actions.

No iframe, preview thumbnail or speculative summary is generated. Empty groups
are omitted. If the Programme render gate or guarded-document provenance check
fails, the component returns no markup.

## Current state

The canonical public-document registry contains zero active bindings and its
existing manifest records do not include any Programme route in
`publicTargets`. Therefore no Programme document is publicly renderable today.
The private route shells describe the four integration kinds without exposing
a file or changing public navigation, sitemap or route access.

## Future activation sequence

1. Add any genuinely new document class, including brochures, through a
   versioned guarded-pipeline catalogue change.
2. Inspect and stage the exact PDF using the existing document intake workflow.
3. Complete external malware, privacy, accessibility, authenticity, metadata
   and management checks in the controlled system.
4. Include the exact Programme route in the record's approved public targets.
5. Publish and activate the exact hash-bound PDF using the existing guarded
   commands.
6. Add the canonical document reference to the versioned Programmes package.
7. Resolve and privately review the complete adapter-fed route before any
   separately authorised public activation.

