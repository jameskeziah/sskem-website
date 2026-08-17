# Public release readiness

`npm run release:audit` is the single launch decision for the rebuilt public
site. It combines six independent gates without weakening any gate's own
validation or evidence requirements:

1. Publication approvals: every governed public target has a current approval.
2. Campus media: all four homepage roles have exact approved derivative bindings.
3. Appendix IX documents: all twelve required PDFs have exact approved bindings.
4. Homepage media budget: all five tracked assets meet their transfer limits.
5. Legacy route cutover: every inventoried WordPress route has an implementation.
6. Review-only treatment: private-review labels and presentation have been
   intentionally removed from the public source.

The result is fail closed. Public release is ready only when all six gates pass
and every gate's underlying registry, receipt, artifact and configuration checks
are structurally valid. A valid approval manifest does not override missing
media, missing documents, a performance overage, an unfinished redirect or
review-only source treatment.

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
artwork, publish documents, remove review treatment, write to Sanity or deploy
the website. Consent forms, scan reports, certificates, pupil records and
approver identities remain in the school's controlled evidence system. The
repository stores only the existing opaque references and public-safe receipts.

## Release sequence

1. Resolve each gate through its guarded workflow and independent approval.
2. Run `npm run release:audit` after every material approval or activation.
3. When the report reaches `6 of 6 gates ready`, run the full public build and
   contract tests.
4. Measure field LCP after launch; the transfer-budget gate is not field evidence.
5. Publish only with separate, explicit deployment authorization.
