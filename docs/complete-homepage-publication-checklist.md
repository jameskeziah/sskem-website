# SSKEMS complete homepage: release sign-off checklist

**Scope:** seven-scene interactive homepage hero, hybrid campus section, foundation/identity animations and public preloader. **Status:** draft; do not enable on the public site while any gate below is incomplete.

## 1. Approve the fourteen exact hero derivatives

The seven scenes are **campus, entrance, science, skating, digital, culture, sports**. Each requires exactly two optimized WebP files (full and preview), an exact-source SHA-256, approved crops at desktop/tablet/mobile, accurate alt text, and a documented derivative receipt.

For each scene `{id}`, the final files must be:

- `public/media/home/production/hero/{id}/full-{first12-of-full-sha256}.webp`
- `public/media/home/production/hero/{id}/preview-{first12-of-preview-sha256}.webp`

**Never commit** `public/media/home/hero-drafts/`, the local hero-media archive, consent forms, identity records or approval evidence. The exact 14 public derivative files are uploaded **only after approval**. Each full image must be WebP, at least 1400 px wide and at most 1.5 MB; each preview must be WebP, at least 320 px wide and at most 110 KB, with EXIF stripped.

Record approval in the school's controlled approval system. Create the exact `media-hero-{id}` records in `content/approval-manifest.json` using the existing manifest update workflow: `decision: approved`, homepage target `/`, verified applicable checklist items (including guardian consent for identifiable pupils), controlled evidence references including the **exact derivative receipt**, an authorized approver role, an approval timestamp and expiration if applicable. The repository must contain references only, not evidence.

After approval and derivative verification, populate `content/home-zentry-publication.json` in this same seven-scene order with each scene's full and preview paths and 64-character source/full/preview SHA-256 hashes, receipt reference, approved crop and approved-alt status. Do not set flags or mark any item approved on the basis of an image existing locally.

## 2. Complete existing school publication gates

The existing four campus records (`media-campus-main`, `media-campus-grounds`, `media-campus-entrance`, `media-campus-courtyard`) currently await approval and have no active production media bindings. Approve and publish their exact derivatives through the existing campus-media workflow. Complete the existing mandatory document, claims, poster/media performance and legacy-content migration gates. The full public-release audit is authoritative; do not bypass it to publish a homepage.

## 3. Verify the release candidate

For the approved branch, run:

```powershell
npm ci
npm run tokens:build
npm run lint
npx tsc --noEmit --incremental false
npm run test:hero
node --experimental-strip-types --test tests/motion-system.test.mjs
npm run test:release-contract
npm run approvals:release
npm run media:bindings:audit
npm run release:audit
```

Test **public** media activation in an isolated release-candidate build with:

```powershell
$env:HOMEPAGE_REVIEW_MODE = "public"
$env:HOMEPAGE_PUBLIC_PRELOADER = "true"
$env:HOMEPAGE_PUBLIC_ZENTRY_HERO = "true"
npm run hero:publication:audit
npm run build:vercel
```

If any audit or build fails, **stop**. Keep public activation disabled. The preview build without approved media can validate layout and controls using only private, locally authorized materials, not serve as publication approval.

Perform desktop (1440 px), tablet (768 px), mobile (390 px and 360 px), keyboard, screen-reader, reduced-motion and real-image crop checks. Verify that all seven slides, the thumbnail expansion, previous/next buttons, pause control, admissions link, preloader handoff and footer remain usable, and that each caption depicts the actual approved photograph.

## 4. Launch only after review

Merge the reviewed release candidate into `main` only once the GitHub validation job, Vercel checks, all publication audits, photo/management sign-offs and production imagery inspection pass. Configure Production `HOMEPAGE_PUBLIC_PRELOADER=true` and `HOMEPAGE_PUBLIC_ZENTRY_HERO=true`, with `HOMEPAGE_REVIEW_MODE` unset or not `private`. Redeploy and verify the production domain, then connect and verify the custom domain separately. Keep a rollback deployment available.

**Note:** This checklist does not itself constitute approval or confirmation that any scene or image is publication-ready.
