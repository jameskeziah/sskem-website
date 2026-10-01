# Complete SSKEMS homepage: approval-gated public release

## Scope and status

This branch carries the latest seven-scene Zentry-inspired interactive hero, hybrid identity/foundation and campus compositions, reduced-motion and mobile handling, and a **separate** public media projection. It is intentionally **not publishable yet**: the seven hero scenes are marked `pending`, the media approval manifest does not include approved `media-hero-*` records, and the school's existing public-release gates remain outstanding.

The previous prototype under `public/media/home/hero-drafts/` stays gitignored and must not be uploaded to Git or an unprotected public preview. This branch does not change DNS or the Vercel redirect.

## Seven exact records that must be approved

| Chapter | Hero media record | Required derivative filenames |
| --- | --- | --- |
| Campus | `media-hero-campus` | `full-<SHA12>.webp`, `preview-<SHA12>.webp` |
| Entrance | `media-hero-entrance` | same pattern |
| Science | `media-hero-science` | same pattern |
| Skating | `media-hero-skating` | same pattern |
| Digital | `media-hero-digital` | same pattern |
| Culture | `media-hero-culture` | same pattern |
| Sports | `media-hero-sports` | same pattern |

For each scene, publish the two derivatives under `public/media/home/production/hero/<scene>/`. `<SHA12>` is the first 12 lowercase hexadecimal characters of the **actual derivative file's SHA-256**. The image and preview must both be WebP, at least 1400 px and 320 px wide respectively, no more than 1.5 MB and 110 KB respectively, and free of EXIF metadata.

Record the source SHA-256, each derivative SHA-256, an opaque authorized receipt reference, approved accessible caption, and the individual desktop/tablet/mobile crop sign-off. Store consent, authenticity/rights, permission records for identifiable pupils, and approver identity in the controlled school system, never in the public repository. Confirm the skating scene actually depicts inline skating and that all descriptions truthfully match their specific approved photographs.

Only after documentary approval should the publication operator add the seven media records to the existing `content/approval-manifest.json` through the project's governed approval workflow. Use the applicable validated media check profile and source pointer to the approved *public-safe* derivative, with `publicTargets: ["/"]`; do not manually stamp an unreviewed record as approved. All other blocked school-wide records must also be resolved before public release.

Finally update **only the matching record** in `content/home-zentry-publication.json` after exact asset publication and verification: `decision: "approved"`, `visualReviewStatus: "approved"`, `approvedAlt: true`, production paths, three real SHA-256 values, and the opaque `receiptRef`. Unapproved or partially approved scenes must remain pending; the code requires all seven.

## Build and activation controls

The active public projection never reads from `hero-drafts`. The requested public hero is off by default. A production build with `HOMEPAGE_PUBLIC_ZENTRY_HERO=true` fails unless all seven records, exact production file hashes, readable WebP metadata, caption/crop approvals, the public preloader, and the pre-existing **whole-site** release audit pass. Missing photos do **not** silently publish the fallback private image.

After all approval records, exact files, and unrelated outstanding release gates are resolved, validate on a review/release environment using PowerShell:

```powershell
npm ci
npm run tokens:build
npm run lint
npx tsc --noEmit --incremental false
npm run test:hero
node --experimental-strip-types --test tests/motion-system.test.mjs
npm run test:contract
# Maintained current-framework contracts, with Poppler installed for PDF tests.
# Separate Playwright checks cover live disclosure/admissions routes.
npm run approvals:release
npm run release:audit

Remove-Item Env:HOMEPAGE_REVIEW_MODE -ErrorAction SilentlyContinue
$env:HOMEPAGE_PUBLIC_PRELOADER = "true"
$env:HOMEPAGE_PUBLIC_ZENTRY_HERO = "true"
npm run hero:publication:audit
npm run build:vercel
```

Before activating the public flags, review the **actual approved** seven-image carousel at desktop, tablet, 390 px and 360 px mobile, and reduced-motion/no-JavaScript modes. Complete automated browser tests using approved media and human visual checks for headline contrast, cropping, preview hover/focus, navigation and autoplay behavior, alt text, performance and accessibility.

Only then update Vercel Production variables (`HOMEPAGE_PUBLIC_PRELOADER=true`, `HOMEPAGE_PUBLIC_ZENTRY_HERO=true`, with `HOMEPAGE_REVIEW_MODE` absent), and merge the approved, tested release into the configured Production branch. Verify the final deployment and maintain a rollback deployment. Do not enable the private homepage review flag in production.

The already-open draft PRs #3, #4, #7 and #8 represent different dependencies or incremental styling; coordinate their eventual merge with this branch to avoid duplicate or conflicting commits. This release branch should remain a **draft PR** until all approvals, test runs, and school publication reviews pass.

## Automated contract suite scope

`npm run test:contract` now invokes the maintained current-framework `test:release-contract` suite. The archived Stage 2/3 Express worker tests still exist for historical reference but cannot run against the current Vinext stack (`dist/server/index.js` no longer exists); equivalent live-route coverage is provided by `npm run test:browser:disclosure-admissions` and CI Playwright specs. CI installs Poppler for genuine PDF-ingestion tests. This is a test-harness migration, not a claim that the incompatible archived tests individually pass. The latest seven-scene hero, scoped motion and media approval tests run independently and in the current suite. Resolve high/critical production dependency findings before launch.
