# Public release readiness

`npm run release:audit` is the single launch decision for the rebuilt public
site. It combines seven independent gates without weakening any gate's own
validation or evidence requirements:

1. Publication approvals: every governed public target has a current approval.
2. Campus media: all four homepage roles have exact approved derivative bindings.
3. Appendix IX documents: all twelve required PDFs have exact approved bindings.
4. Homepage media budget: all five tracked assets meet their transfer limits.
5. Legacy route cutover: every inventoried WordPress route has an implementation.
6. Legacy content migration: all 115 archived content records have an explicit
   route and content decision whose implementation has been independently verified.
7. Review-only treatment: the homepage uses separate projections—private review
   may show all supplied achievement artwork, while public HTML receives only an
   exact artwork whose media record and paired claim record are both current and
   approved and whose bytes match an active hash binding. An empty public
   projection is omitted.

The result is fail closed. Public release is ready only when all seven gates pass
and every gate's underlying registry, receipt, artifact and configuration checks
are structurally valid. A valid approval manifest does not override missing
media, missing documents, a performance overage, an unfinished redirect,
unaccounted archived content or an unsafe private/public artwork projection.

## Operating modes

- `npm run release:audit` reports all gates and exits non-zero while any gate is
  blocked. The normal public build runs this command before the specialized
  media, document and performance audits.
- `HOMEPAGE_REVIEW_MODE=private npm run release:audit` reports the same blockers
  but permits a controlled private-review build when there are no integrity
  errors.
- `npm run build:review` is still a review artifact, not public-release approval,
  access control or deployment authorization.

The audit is read-only. It does not approve records, create bindings, modify
artwork, publish documents, write to Sanity or deploy the website. Passing the
review-treatment gate means only that unapproved achievement artwork is absent
from public HTML; it does not make any artwork approved. Consent forms, scan
reports, certificates, pupil records and approver identities remain in the
school's controlled evidence system. The repository stores only the existing
opaque references and public-safe receipts.

## Release sequence

1. Resolve each gate through its guarded workflow and independent approval.
2. Run `npm run release:audit` after every material approval or activation.
3. When the report reaches `7 of 7 gates ready`, run the full public build and
   contract tests.
4. Measure field LCP after launch; the transfer-budget gate is not field evidence.
5. Publish only with separate, explicit deployment authorization.
