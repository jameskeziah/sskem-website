# SSKEMS Hero V2 — Part 1: Art direction and implementation

**Status:** private-review implementation. Do not merge into the public homepage or publish student photography until existing approvals and release gates pass.

## What changed

The current Zentry-inspired hero's expansion controller remains intact. V2 adds seven individually art-directed compositions and seven SVG illustration motifs. Instead of one dark diagonal reused throughout, each scene has its own image-first photographic treatment, text position, accent, illustration and thumbnail position. The source photographs are never replaced with another school's reference photography or AI-altered documentary imagery.

| Scene | Layout token | Motif | Photo treatment | Desktop editorial / thumbnail placement |
|---|---|---|---|---|
| 01 Campus | `slash` | `architecture` | ~2/3 unobstructed bright campus image; narrow navy panel and thin translucent coral slash | Left; middle-right preview |
| 02 Entrance | `curve` | `pathway` | Real curved warm-navy panel ~30% wide, welcoming coral | Bottom-left; upper-right preview |
| 03 Science | `frame` | `science` | Localized left-side contrast, translucent cyan laboratory frame | Left; lower-right preview |
| 04 Skating | `chevron` | `motion` | Full-bleed action photograph, lower-left radial contrast only | Bottom-left; upper-right preview |
| 05 Computer lab | `grid` | `digital` | Floating cyan interface panel and restrained grid; real computers visible | Upper-left; lower-right preview |
| 06 Culture | `ribbon` | `culture` | Narrow editorial gradient, slim cream-and-coral stage ribbon | Left; upper-right preview |
| 07 Sports | `sport` | `sport` | Near-full-bleed photo; local negative-space scrim, scoreboard chapter count | Bottom-left; upper-right preview |

## Assets and crop sign-off

The original local student/campus photos are at `public/media/home/hero-drafts/` and intentionally ignored by Git. The reference images linked in the art-direction brief are *composition references only* and must not be downloaded or substituted for actual school photographs. The existing fallback campus image is just an error fallback, **not proof that all seven photos are present** on a deployment.

Initial `focal` percentages in `lib/home-zentry-slides.ts` are art-director starting points, **not measured crops**. Finalize the seven crops using the actual local photos at these viewports: 1440×820, 1024×768, 768×1024, 390×844, and 360×740. Inspect the actual school name and gateway, building façade, laboratory faces and hands, skaters and their equipment, computer screens, central performers, and sports participants. Use image-specific mobile source assets if a single focal point cannot protect the subjects at every viewport.

Do not commit draft media or disable Git ignore to make the remote demo look complete. A remote review environment needs separately authorized/private image delivery. Final crop acceptance is impossible without access to those source photos.

## Illustration layer

`components/hero/zentry-motifs.tsx` provides individually controlled decorative SVGs:

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
git switch feature/zentry-hero-v2-art-direction
npm install
npm run test:hero
npm run lint
$env:HOMEPAGE_REVIEW_MODE="private"
$env:HOMEPAGE_ZENTRY_HERO="preview"
npm run dev
```

When the local publication audits/build prerequisites permit, run `npm run build:review` and `npm run test:browser:zentry`. Those commands can reveal unrelated baseline audit blockers; never bypass approval checks merely to pass the preview.

**Acceptance gate:** all seven full-size actual photographs resolve (no fallback), all seven layouts differ perceptibly, source photographs remain bright, the school entrance signage and subjects are unobstructed, the seven illustration motifs and preview buttons land in safe regions, all mobile sizes have readable typography and usable buttons, and no public approval gate is weakened.
