# Programme data adapter

## Purpose

`lib/programmes-data-adapter.ts` is the fail-closed boundary between a future
approved Programmes package and route rendering. It converts the exact package
into immutable, component-ready data only after the existing publication
validator authorises all three governed routes.

The adapter does not approve, persist, publish, activate navigation, update the
sitemap or deploy anything.

## Input and output

Call:

```ts
const result = adaptProgrammesPublicationPackage({
  packageData,
  manifest,
  now: "2026-09-03T12:00:00.000Z",
});
```

A successful result has `ok: true`, one page projection for each governed
route, the exact package digest, downstream navigation warnings and one opaque
render gate per page. The page projection contains:

- public organisation identity and institutional type;
- component data for hero, subjects/streams, eligibility, schedule, fees,
  faculty, facilities, aggregate results, documents and admissions CTA;
- approved academic detail, scholarships and claims;
- opaque approved media descriptors, never controlled paths or URLs;
- SEO metadata, related governed routes and separately gated navigation.

The projection deliberately excludes evidence records, controlled references,
manifest record IDs, approver identity and pupil-level results.

A rejected result has `ok: false`, `pages: null` and structured issues. The
adapter is atomic: it never returns a partially publishable set of pages.

## Rejection rules

The existing publication validator remains the approval authority. Its errors
flow through unchanged, including:

- `EXPIRED_APPROVAL`;
- `MISSING_EVIDENCE`, `UNVERIFIED_EVIDENCE` and `EXPIRED_EVIDENCE`;
- `UNVERIFIED_RESULT`; and
- all schema, reference, scope, claim, media, content and SEO failures.

The adapter adds `INCOMPATIBLE_INSTITUTIONAL_MODEL` for route/type conflicts:

| Route | Accepted owning organisation type |
| --- | --- |
| `/school/academics` | `cbse-school` |
| `/junior-college` | `junior-college` |
| `/programmes/jee-neet` | `cbse-school`, `junior-college` or `institute` |

This allows management to confirm that JEE/NEET preparation is school-run,
Junior College-run or institute-run without treating an unmodelled external
partner as the owning institution. A future external-partner arrangement needs
an explicit relationship model and partnership evidence in a versioned schema.

If the validator-issued implementation plan cannot issue its digest-bound
opaque route gate, conversion fails with `RENDER_GATE_NOT_ISSUED`.

## Component use

The route renderer can pass the common gate and the matching component data:

```tsx
const { media: heroMedia, ...heroProps } = page.components.hero;

<ProgrammeHero gate={page.gate} {...heroProps} approvedMedia={resolveMedia(heroMedia)} />
<ProgrammeSubjectsStreams gate={page.gate} {...page.components.subjectsStreams} />
<ProgrammeEligibility gate={page.gate} {...page.components.eligibility} />
<ProgrammeSchedule gate={page.gate} {...page.components.schedule} />
```

Media resolution must separately bind the descriptor ID to the exact approved
public media artifact. The adapter never turns a controlled evidence reference
into a public asset URL.

## Version 1 limitation

Package schema `1.0.0` has no canonical public-document records. Therefore the
documents component receives an empty list and the successful result carries
`DOCUMENTS_NOT_MODELLED_IN_V1`. The adapter does not invent document metadata
or bypass the document publication pipeline. The separate guarded resolver in
`lib/programmes-document-integration.ts` and the four specialised presentation
components are ready, but a future versioned package must supply canonical
references before the adapter can connect them to a route.

Admissions CTA labels and internal destinations are code-owned interface copy;
the CTA summary comes from the approved programme admission record. Canonical
management-approved CTA/contact records remain a versioned schema `1.1` task.

## Activation boundary

The adapter is ready for private integration testing. The three routes remain
private review shells and stay absent from public navigation and sitemap. A
separate reviewed resolver must later load the exact approved package and
manifest, call the adapter, resolve approved media/documents and render only the
matching page projection. Public activation and deployment remain separate,
explicitly authorised steps.
