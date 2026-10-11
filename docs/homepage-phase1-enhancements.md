# Homepage Phase 1 visual enhancement

Implemented locally on `feat/homepage-enhancements`. No commit, push or deployment was performed.

## Audit and design changes

The existing homepage uses seven independently composed photographic hero scenes, a governed public-media projection, token-based motion utilities, and separate public and private review modes. The refinement retains those boundaries and the existing institutional copy, SEO metadata and destination routes.

- Fluid heading sizes, balanced wrapping, readable paragraph widths and consistent section gutters improve hierarchy and section rhythm.
- Programme cards adapt to the number of published profiles, keep their established colour families, and gain restrained hover, visible focus and clearer accessible link names.
- Admissions content has clearer spacing, status information and CTA feedback. The enquiry message remains the source of the CTA's accessible description.
- All seven hero compositions retain their artwork, focal crops, scene configuration and image-expansion interaction. Heading sizes respond to their copy container. Mobile copy and controls occupy separate grid rows, while stable counters and progress buttons prevent control movement between scenes.
- Hero timing now uses existing motion tokens. Reduced motion keeps all scenes operable and static; autoplay checks its desktop/motion eligibility on every interval.
- The cinematic navigation uses its existing accessible drawer on narrower laptops, retains the school wordmark at 320px, and provides stronger focus/hover contrast. Closing mobile search returns focus to the visible menu trigger.
- The campus feature uses the existing `CampusPicture` component in private review as well as public mode, removing a reference to an absent private draft image.
- A small admissions stylesheet correction improves three enquiry-boundary badge contrasts found by the full accessibility suite.

## Files modified

Production files:

- `app/page.tsx`
- `app/homepage.css`
- `app/zentry-hero.css`
- `app/globals.css`
- `app/admissions.css`
- `components/motion/home-zentry-hero.tsx`
- `components/home/homepage-institution-pathways.tsx`
- `components/home/homepage-admissions-feature.tsx`
- `components/site-header.tsx`

Regression and tooling files:

- `package.json`: adds the dedicated homepage browser command and makes private browser/test wrappers satisfy the existing preview gate.
- `tests/browser/homepage-enhancements.spec.ts`: five-width geometry and actual text-range checks, all seven scenes, touch targets, keyboard navigation, CTA destinations, contrast, reduced motion and animated page stability.
- `tests/browser/navigation.spec.ts`
- `tests/browser/accessibility.spec.ts`
- `tests/browser/motion.spec.ts`
- `tests/browser/responsive.spec.ts`
- `tests/browser/public-home-preloader.spec.ts`
- `tests/browser/zentry-hero.spec.ts`
- `tests/browser/publication-review.spec.ts`
- `tests/browser/visual.spec.ts` and its affected PNG references: wait for completed content and exclude the fixed header from component captures; the header and navigation retain dedicated snapshots.
- `tests/browser/fixtures/visual-component.css`: screenshot-only styling, including animated header descendants.
- `tests/home-zentry-hero.test.mjs`
- `tests/rendered-html.test.mjs`
- `tests/stage3-admissions.test.mjs`

Older assertions were aligned with the current rendered content and canonical manifests. Privacy, publication, hydration-failure and keyboard assertions remain in place. No dependencies, artwork files, approval records or publication-gate implementation changed.

Updated PNG references in `tests/browser/visual.spec.ts-snapshots/`:

- `site-header-desktop-win32.png`
- `home-hero-desktop-win32.png`
- `home-hero-mobile-win32.png`
- `home-campus-desktop-win32.png`
- `home-pathways-desktop-win32.png`
- `home-achievements-laptop-win32.png`
- `mobile-navigation-win32.png`
- `mpd-section-b-desktop-win32.png`
- `admissions-hero-desktop-win32.png`
- `admissions-actions-desktop-win32.png`
- `admissions-age-checker-desktop-win32.png`
- `admissions-enquiry-mobile-win32.png`

## Validation

Final verification results:

| Check | Result |
| --- | --- |
| `npm.cmd run lint` | Passed |
| TypeScript `--noEmit --incremental false` | Passed |
| `npm.cmd run build` | Passed; repeated by the public and private-preview browser commands |
| Every `tests/**/*.test.mjs`, with private review/preview environment and test concurrency 1 | 453 passed, 0 failed |
| `npm.cmd run hero:publication:audit` | Passed for all seven approved full/preview pairs |
| `npm.cmd run test:browser:homepage` | 37 passed, 0 failed; actual approved public photographs |
| Private fallback homepage, motion, navigation and visual suites | 40 passed, 0 failed, 4 carousel-only checks skipped |
| `npm.cmd run test:browser:zentry` | 5 passed, 0 failed |
| Updated component snapshots | 10 tests passed without snapshot update; seven previously obscured captures manually reviewed |
| Bounded hover regression after waiting for the parent reveal | 3 consecutive passes |
| Final five-width public screenshot capture | No browser page errors |

The complete 123-case browser inventory was exercised in private mode. Five failures involving stale selectors, readiness/host timing and screenshot capture were repaired and verified by the final focused runs above; the public run covers mode-specific cases skipped by private review. Private draft photographs remain excluded from this checkout, and the private carousel retains its existing image fallback. Public checks explicitly require each scene's approved production photograph to load.

Detailed local logs and screenshots are in the ignored `outputs/phase1/` directory. Representative final captures: [desktop hero](../outputs/phase1/hero-1440.png), [mobile hero](../outputs/phase1/hero-375.png), [desktop programmes](../outputs/phase1/pathways-1440.png), [mobile admissions](../outputs/phase1/admissions-feature-375.png).

The homepage regression covers 320, 375, 768, 1024 and 1440 CSS pixels. Its seven-scene checks inspect both element geometry and actual text ranges so clipped text cannot pass merely because the page hides overflow. Motion checks guard hero height, the following section, essential copy and controls. Raw browser layout-shift diagnostics are attached separately because scene artwork and the next-scene preview intentionally change composition.

## Remaining limits

This work is a local Phase 1 implementation. Separate school content, media and publication approvals remain governed by the existing release process; passing visual tests does not authorize those records or prove a deployed release. Automated accessibility checks supplement the keyboard and visual review; they are not a complete assistive-technology certification.
