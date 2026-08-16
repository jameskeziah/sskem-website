# Legacy WordPress cutover inventory

`content/legacy-cutover-inventory.json` is the route-continuity register for the
public WordPress site observed on 16 August 2026. It records the homepage and
the internal destinations exposed by the live primary navigation. The companion
schema rejects silent field mistakes and unsafe path shapes.

The inventory is not a content migration and is not approval evidence. No
WordPress copy, upload, form, PDF or pupil image was copied into the rebuild.
Existing publication approvals, the media pipeline and the document pipeline
remain the only permitted routes for governed content.

## Implemented behavior

- the two paths that remain unchanged, `/` and `/contact`, keep their current
  rebuilt routes;
- seven compatibility aliases use dedicated permanent-redirect routes;
- the remaining legacy paths use the central catch-all redirect map;
- every redirect points directly to its final rebuilt route—redirect chains and
  loops fail the audit;
- high-risk galleries, forms, identity pages, documents and claims land on safe
  status or guidance pages instead of republishing their legacy content;
- the owner-only publication dashboard reports route readiness and provides a
  cutover worksheet.

The inventory currently covers 35 routes: 33 permanent redirects and two
retained routes. Route implementation is complete, but that does not clear any
of the publication manifest's media, claim or document blockers.

## Commands

- `npm run cutover:audit` validates the inventory and reports route, risk and
  content-review counts.
- `npm run cutover:release` additionally fails if any route implementation is
  still marked `pending`.
- `npm test` builds the private-review site and verifies every inventoried
  source route, final destination, dashboard summary and worksheet.

## Updating the inventory

1. Re-check the live WordPress homepage, navigation and any available sitemap.
2. Add newly discovered internal paths with the observation date and a role
   owner. Do not paste legacy page content into the record notes.
3. Choose the final rebuilt destination. A redirect target must not itself be a
   legacy redirect source.
4. Classify risk and content review honestly. Anything containing pupils,
   identities, forms, claims or downloads is high risk or approval-blocked.
5. Implement the route, run both cutover audits and the full private-review
   suite, then review the worksheet with the school owner.

Before public domain cutover, refresh this snapshot, compare server logs and
search-index coverage for missed URLs, verify the full redirect map on the real
domain and assign backup/rollback ownership. Keep WordPress read-only until that
final sign-off is complete.
