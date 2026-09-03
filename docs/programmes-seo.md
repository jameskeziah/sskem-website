# Programme SEO and structured data

## Purpose

`lib/programmes-seo.ts` converts one adapter-issued Programme page projection
into exact page metadata, breadcrumbs and JSON-LD. It accepts only the original
in-process page object created by `adaptProgrammesPublicationPackage`; a copied
or hand-authored object is rejected even if it carries a real render gate.

The engine prepares data only. It does not activate a route, add it to public
navigation or sitemap, publish structured data or deploy the site.

## Metadata output

For every accepted page the engine produces:

- the approved SEO title and description;
- an absolute HTTPS canonical URL under `https://www.sskemschool.com`;
- `alternates.canonical` for the Next metadata API;
- index/follow values from the accepted public projection; and
- a two-item breadcrumb trail from Home to the current page.

Metadata conversion is rejected when the page projection is unissued, the
title or description is blank/placeholder text, the canonical route differs
from the governed route, or index/follow approval is absent.

## Structured-data templates

The engine implements three independent templates:

| Template | Minimum complete input |
| --- | --- |
| `EducationalOrganization` | Absolute HTTPS `@id`, approved organisation name and absolute HTTPS organisation URL |
| `EducationalOccupationalProgram` | Absolute HTTPS `@id` and URL, programme ID, name, description, type, prerequisites, complete provider reference and at least one approved subject |
| `BreadcrumbList` | Absolute HTTPS `@id` and at least two complete ordered name/URL items |

Optional programme mode is included only when it contains approved non-
placeholder text. Subject names are expressed as `DefinedTerm` values through
`about`; they are not promoted to `Course` records because the package does not
establish that each subject is a separately published course.

The organization node deliberately omits address, telephone, logo, affiliation
and external profile fields. Those properties may be useful, but this package
does not currently supply them as digest-covered organization data.

## Suppression behaviour

Each template returns either a complete node or `null` plus exact missing field
names. The combined graph includes only complete nodes and exposes suppressed
template decisions for private review. It never inserts values such as `TBD`,
`not confirmed`, `pending approval`, `placeholder` or `coming soon`.

If no node is complete, the JSON-LD graph is `null` and the renderer emits no
script element. A missing organization also suppresses the programme node
because the provider relationship would be incomplete; a valid breadcrumb
node can still remain.

## Rendering safety

`components/programmes/programme-structured-data.tsx` emits a JSON-LD script
only for a successful SEO projection with a non-empty graph.
`serializeProgrammeJsonLd` escapes characters that could terminate the script
element, including `<`, `>`, `&`, U+2028 and U+2029.

## Standards basis

The templates follow:

- https://schema.org/EducationalOrganization
- https://schema.org/EducationalOccupationalProgram
- https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies

Breadcrumbs represent the visible navigation path rather than mechanically
splitting URL segments. The engine uses absolute canonical URLs consistently.

## Future route integration

An approved route resolver can later:

1. obtain the adapter result for the exact approved package and manifest;
2. select the page projection for the route;
3. call `buildProgrammeSeo(page)`;
4. return `seo.metadata` from `generateMetadata` only when `seo.ok` is true;
5. render the same `seo.breadcrumbs` visibly on the page; and
6. mount `ProgrammeStructuredData` beside the matching approved page content.

Private route shells remain noindex and must not use this future public SEO
projection until public route activation is separately reviewed and authorised.
