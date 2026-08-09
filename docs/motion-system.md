# SSKEMS motion system implementation

Content leads. Motion supports. Access is immediate.

The canonical duration, easing, distance, stagger, and scale values live in
`app/design-tokens.json`. `npm run tokens:build` generates both the CSS custom
properties in `app/tokens.css` and the GSAP values in
`lib/motion-tokens.generated.ts`; implementation code must not duplicate raw
timings.

## Implemented motion recipes

| Component | Level | Trigger | Initial state | Final state | Duration and ease | Delay or stagger | Replay | Mobile | Reduced motion | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Admissions hero heading | 4 | Initial page entry | `opacity: 0`, `y: 20px` desktop or `16px` tablet | Fully visible at authored position | `deliberate`, `enter` | None | Once | Combined intro group, `y: 10px` | Static final state | GSAP |
| Admissions hero support | 4 | Initial page entry | `opacity: 0`, same bounded vertical travel | Fully visible at authored position | `deliberate`, `enter` | `60ms` after heading start | Once | Combined with heading | Static final state | GSAP |
| Admissions architectural mask | 4 | Initial page entry | Bottom-to-top clipped decorative layer | Authored static mask | `slow`, `emphasised` | None | Once | Static mask, no travel | Static final state | GSAP |
| Admissions four-step preview | 4 | `top 82%` | `opacity: 0`, bounded vertical travel | Fully visible at authored position | `deliberate`, `enter` | `60ms` desktop/tablet, `40ms` mobile; four items maximum | Once | Four items maximum, `y: 10px` | Static final state | GSAP + ScrollTrigger |
| Full eight-step process | 3 | Each four-step group at `top 82%` | Four related items share one reveal | Fully visible at authored position | `deliberate`, `enter` | No item stagger | Once | Two groups of four; no scrub | Static final state | GSAP + ScrollTrigger |
| Homepage arrival heading | 4 | Initial page entry below `64rem` | `opacity: 0`, `y: 10px` | Fully visible at authored position | `slow`, `emphasised` | Mobile token; three lines maximum | Once | Live heading reveal | Static final state | GSAP |
| Homepage approved desktop artwork | 4 | Initial render at `64rem` and above | Exact authored `/og.png` composition | Static, uncropped and unoverlaid artwork | None | None | Never | Replaced by live copy and a static campus photograph | Static final state | Responsive CSS |
| Homepage campus chapter | 4 | Section at `top 82%` | Copy reveal plus three bounded image masks | Fully visible at authored position | `deliberate` through `slow` | Card token; three frames maximum | Once | Copy reveal only | Static final state | GSAP + ScrollTrigger |
| Homepage publication review | 4 | Section at `top 82%` | Four supplied artwork cards share one reveal | Fully visible at authored position | `deliberate`, `enter` | `60ms` desktop/tablet, `40ms` mobile | Once | Bounded `y: 10px` | Static final state | GSAP + ScrollTrigger |

Homepage essential-service links, the publication approval note, hero facts,
admissions actions, forms, notices, disclosure records, document lists, tables,
dates, and legal content remain outside all reveal timelines.

## CSS-owned feedback and orientation

- Buttons and links use `micro` or `fast` feedback. Fine-pointer button lift is
  capped at `1px`.
- Cards use `fast` or `standard` feedback. Fine-pointer card lift is capped at
  `2px`.
- Hover rules exist only inside `(hover: hover) and (pointer: fine)`.
- Keyboard focus uses an immediate outline and never a spatial transform.
- Submenus, the mobile sheet, search dialog, and application progress use
  bounded CSS transitions. Progress animates `transform: scaleX()`, not width.
- The loading state is static; the system contains no continuous automatic
  animation.

## Progressive enhancement and cleanup

Server-rendered markup contains every heading, step, link, and form in its final
readable state. GSAP applies temporary initial styles only after hydration and
clears them after each sequence. Each island owns a scoped root, uses
`useGSAP()`, groups responsive rules with `gsap.matchMedia()`, and reverts its
media context during unmount.

The static navigation fallback remains available until the interactive header
has actually hydrated. It therefore covers disabled JavaScript and failed or
slow client bundles without introducing layout shift.

## Deliberate exclusions

The approved homepage prototype uses the supplied campus photography for a
bounded Level 4 arrival, one campus chapter, and one publication-review group.
Student-result artwork remains behind a visible approval gate until accuracy,
institutional status, and publication consent are confirmed. Crest motion and
scroll-linked parallax remain deferred. Pinning, scrubbing on content,
smooth-scroll libraries, custom cursors, counters, continuous loops, and global
reveal scanners are prohibited.
