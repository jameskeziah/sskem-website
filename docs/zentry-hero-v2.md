# SSKEMS Hero V2 — Art direction and technical implementation

**Status:** private-review implementation. Do not merge into the public homepage or publish student photography until existing approvals and release gates pass.

## What changed

The current Zentry-inspired hero's expansion controller remains intact. V2 adds seven individually art-directed compositions and seven SVG illustration motifs. Each scene declares its palette, responsive image crops, and desktop preview placement in `lib/home-zentry-slides.ts`, and all seven are grouped into four `compositionFamily` variants (`architectural`, `editorial`, `kinetic`, `showcase`). Instead of one dark diagonal reused throughout, each scene has its own image-first photographic treatment, text position, accent, illustration and thumbnail position. The source photographs are never replaced with another school's reference photography or AI-altered documentary imagery.

| Scene | Layout token | Motif | Photo treatment | Desktop editorial / thumbnail placement |
|---|---|---|---|---|
| 01 Campus | `slash` | `architecture` | ~2/3 unobstructed bright campus image; narrow navy panel and thin translucent coral slash | Left; middle-right preview |
| 02 Entrance | `curve` | `pathway` | Real curved warm-navy panel ~30% wide, welcoming coral | Bottom-left; upper-right preview |
| 03 Science | `frame` | `science` | Localized left-side contrast, translucent cyan laboratory frame | Left; lower-right preview |
| 04 Skating | `chevron` | `motion` | Full-bleed authentic inline-skating photograph; protect the two foreground skaters | Bottom-left; lower-right preview |
| 05 Computer lab | `grid` | `digital` | Floating cyan interface panel and restrained grid; real computers visible | Upper-left; lower-right preview |
| 06 Culture | `ribbon` | `culture` | Narrow editorial gradient, slim cream-and-coral stage ribbon | Left; upper-right preview |
| 07 Sports | `sport` | `sport` | Near-full-bleed photo; local negative-space scrim, scoreboard chapter count | Bottom-left; lower-right preview |

## Typed chapter settings (current Part 2)

Every existing `HomeZentrySlide` now extends `HeroVisualSettings` with `focalMobile`, `motif`, `previewPosition`, `photoTreatment`, and `accentColor`. Values flow through the existing React hero, with no separate slide components:

| Chapter | Motif | Photo treatment | Provisional preview position |
|---|---|---|---|
| Campus | architecture | vibrant | centre-right |
| Entrance | pathway | warm | upper-right |
| Science | science | clean | lower-right |
| Skating | motion | warm | lower-right |
| Digital | digital | clean | lower-right |
| Culture | culture | vibrant | upper-right |
| Sports | sport | warm | lower-right |

The existing per-slide `palette.accent` values were copied into `accentColor`. The Skating media kit was subsequently replaced with a genuine user-supplied inline-skating photograph, and its mobile focal point was re-evaluated against that new source.  Initially, `focalMobile` and `previewPosition` were provisional aliases of the prototype; subsequently the seven photographs in the private `sskem-zentry-hero-assets.zip` media kit were inspected at an equivalent **390×742 mobile cover crop** and the mobile focal candidates adjusted below. The desktop skating/sports preview positions were changed to avoid covering the groups of children in the current images. None of these source-photo-only adjustments replace a real browser overlay check: all seven entries retain `visualReviewStatus: "pending"`. Keep compatibility aliases `imageCrop.mobile` and `focalMobile` equal. Four photo treatments share restrained natural light/colour adjustments with the GSAP expanding image to avoid a colour jump.

The desktop semantic preview presets and existing per-slide pixel/percentage refinements are both configurable. Tablet/mobile preview placement remains conservatively top-right in CSS for all seven scenes: in the inspected mobile source-photo mockups, this is the least intrusive shared region. Any per-scene responsive preview position changes still require a browser review at the actual school website viewport sizes.

| Chapter | Mobile `focalMobile` source-photo candidate | Desktop `previewPosition` |
|---|---|---|
| Campus | `34% 50%` | `centre-right` |
| Entrance | `75% 50%` | `upper-right` |
| Science | `43% 46%` | `lower-right` |
| Skating | `28% 44%` | `lower-right` |
| Digital | `43% 47%` | `lower-right` |
| Culture | `52% 48%` | `upper-right` |
| Sports | `53% 48%` | `lower-right` |

**Replacement photo available:** The user has supplied an original photograph showing students on inline skates (2048×1365 JPG). A format-only local WebP kit supplies `skating.webp` and `skating-preview.webp` without committing identifiable student photographs. The new source is **not** included in GitHub or production. Its new proposed responsive focal settings are desktop `50% 28%`, tablet `8% 44%`, mobile `28% 44%`; they prioritize the main two skaters when the existing full-bleed mobile layout is used. The narrow portrait crop cannot also show every background skater. Check the actual rendered hero against heading and thumbnail overlays before approval.

**Outstanding visual-layout risk:** The existing mobile lower text scrim intersects subjects or activity in some of the science, digital, culture and sports photographs. A focal-point adjustment alone cannot solve that; inspect the actual browser hero and adapt its mobile text layout or source aspect ratio before approving those scenes. The extreme panoramic campus original cannot show its full building façade in a narrow portrait crop; consider a separately authorized portrait source if that coverage is essential.

### Local photographic inspection and sign-off

1. Keep the 14 original/private hero files in the gitignored `public/media/home/hero-drafts/` folder; do not publish them.
2. Run `npm run hero:v2:assets`. Start the local server with `HOMEPAGE_REVIEW_MODE=private` and `HOMEPAGE_ZENTRY_HERO=preview` (PowerShell example below).
3. In another terminal, run `npm run hero:v2:mobile-review`. This captures seven real browser hero screenshots at **360×740** and **390×844** in `test-results/hero-v2-mobile-review/` (gitignored). It fails if any configured full-resolution photo is unavailable and will not connect to an external review server.
4. Inspect faces, hands, experiment equipment, signage, performers and sports action on each screenshot. Confirm or adjust the source-photo candidates in `focalMobile` and `previewPosition` (plus CSS responsive positioning if required), keep `imageCrop.mobile` in sync, rerun screenshots and mark `visualReviewStatus` approved only following permission/rights and complete page-layout visual review.

Do not claim the provisional position values are measured or authoritatively approved.

## Assets and crop sign-off

The original local student/campus photos are at `public/media/home/hero-drafts/` and intentionally ignored by Git. The reference images linked in the art-direction brief are *composition references only* and must not be downloaded or substituted for actual school photographs. The existing fallback campus image is just an error fallback, **not proof that all seven photos are present** on a deployment.

The mobile `focalMobile` values were compared visually against the real private WebP sources, not inferred from the concept posters. Desktop/tablet focal settings remain art-director starting points, and no crop should be treated as final until checked in the actual rendered hero. The expanding image uses the incoming slide's active breakpoint crop. Finalize the seven crops using the actual local photos at these viewports: 1440×820, 1024×768, 768×1024, 390×844, and 360×740. Inspect the actual school name and gateway, building façade, laboratory faces and hands, skaters and their equipment, computer screens, central performers, and sports participants. Use image-specific mobile source assets if a single focal point cannot protect the subjects at every viewport.

Do not commit draft media or disable Git ignore to make the remote demo look complete. A remote review environment needs separately authorized/private image delivery. Final crop acceptance is impossible without access to those source photos.


### Installing the replacement Skating image locally

Download the private replacement archive `sskem-skating-local-assets.zip` supplied in this conversation. From the root of the local repository on Windows PowerShell:

```powershell
git switch feature/zentry-inspired-school-hero
git pull --ff-only origin feature/zentry-inspired-school-hero
Expand-Archive "$HOME\\Downloads\\sskem-skating-local-assets.zip" -DestinationPath . -Force
npm run hero:v2:assets
```

The archive contains both `public/media/home/hero-drafts/skating.webp` and `skating-preview.webp` with no AI edits, just WebP compression and a smaller preview. These original school media files remain gitignored; do not `git add -f` or deploy publicly until authorizations are complete. Since the new source has different geometry from the previous media kit, regenerate the local mobile browser screenshots after installing it. Desktop and mobile layout overlap remains a manual acceptance gate.

## Illustration layer

`components/motion/home-zentry-motifs.tsx` provides individually controlled decorative SVGs:

- **Architecture:** blueprint construction grid, compass sunburst, corner markings.
- **Pathway:** dotted route, arrows, entrance approval-stamp geometry.
- **Science:** flask, molecule/orbit illustration, measurement markings.
- **Motion:** inline-skate wheels and directional speed lines.
- **Digital:** small friendly computer-robot, cursor and circuit connections.
- **Culture:** theatre masks, musical notes and a traced flourish.
- **Sport:** hand-drawn running figure, ball and athletic line marks.

All SVG motifs are decorative (`aria-hidden` and non-focusable), do not alter the photographic source, and have subtle CSS-only animation disabled by `prefers-reduced-motion`. Their positions are provisional until the actual images can be inspected. If the exact cartoon Easter eggs from the earlier promotional artwork are needed, replace the corresponding motif paths from the original source art without baking them into the photos.

## Interaction contract

- Click the thumbnail to expand the **next full-resolution slide image** via the existing GSAP FLIP-style overlay. Keep the overlay above outgoing type and ornaments until React commits the new scene.
- Keep previous/next arrows, seven chapter selectors, visible slide count, 10-second opt-in desktop autoplay behavior with hover/focus pause, and accessible link destinations.
- Skating and sports use 0.76 s expansion; culture uses a gentler 0.98 s expansion and wider text stagger; all other slides use 0.92 s expansion. Reduced-motion visitors receive an immediate image change with no overlay.
- Progress-selector jumps intentionally do not attempt an expansion from a narrow progress bar.

## Review workflow

From a checkout of this branch, with appropriately authorized local photography in the ignored folder:

```powershell
git switch feature/zentry-inspired-school-hero
npm install
npm run hero:v2:assets
npm run test:hero
npm run lint
$env:HOMEPAGE_REVIEW_MODE="private"
$env:HOMEPAGE_ZENTRY_HERO="preview"
npm run dev
```

With that private local server running, open another PowerShell window and run `npm run hero:v2:mobile-review` to capture subject-safe crop evidence before signing off the seven `focalMobile` and `previewPosition` values.

The source-image audit checks all seven full-size WebPs and seven thumbnails, dimensions, file sizes and duplicate/missing paths. It is deliberately *not* part of the public build, because draft media remain ignored by Git.

When the local publication audits/build prerequisites permit, run `npm run build:review` and `npm run test:browser:zentry`. Those commands can reveal unrelated baseline audit blockers; never bypass approval checks merely to pass the preview.

**Acceptance gate:** all seven full-size actual photographs resolve (no fallback), all seven layouts differ perceptibly, source photographs remain bright, the school entrance signage and subjects are unobstructed, the seven illustration motifs and preview buttons land in safe regions, all mobile sizes have readable typography and usable buttons, and no public approval gate is weakened.
