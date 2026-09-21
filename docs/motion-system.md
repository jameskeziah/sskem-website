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
| Private homepage loading stage | 4 | Initial homepage entry only | Hidden in server HTML, then a fixed SSKEMS layer after hydration while the critical font and poster settle | Hero remains rendered and readable underneath; bounded fail-safe prevents a stuck overlay | No artificial hold or percentage | None | Once per tab session when storage is available | Same asset wait | Never displayed | DOM readiness + GSAP island |
| Private homepage exit reveal | 4 | Critical assets settle or bounded fail-safe fires | Loader detail fades and the overlay scales slightly | Clip-path opens; hero media and copy begin their separate arrival sequence at the clip start | `standard` through `ceremonial`, `exit`, `move` and `emphasised` | Hero signal starts with the clip reveal | Once per initial homepage entry | Same bounded sequence | Instant final state; hero remains static and readable | GSAP |
| Guarded homepage film transition | 4 | Explicitly selecting an available, approved campus film preview | Small clipped preview over the existing poster | Film expands within the hero frame; the poster remains the no-JavaScript fallback | `slow` through `ceremonial`, `move` and `emphasised` | None | User controlled; Escape returns to poster | Wider preview mask inside the authored mobile frame | Opens without tween and remains paused until the user presses Play | GSAP + HTML video |
| Admissions hero heading | 4 | Initial page entry | `opacity: 0`, `y: 20px` desktop or `16px` tablet | Fully visible at authored position | `deliberate`, `enter` | None | Once | Combined intro group, `y: 10px` | Static final state | GSAP |
| Admissions hero support | 4 | Initial page entry | `opacity: 0`, same bounded vertical travel | Fully visible at authored position | `deliberate`, `enter` | `60ms` after heading start | Once | Combined with heading | Static final state | GSAP |
| Admissions architectural mask | 4 | Initial page entry | Bottom-to-top clipped decorative layer | Authored static mask | `slow`, `emphasised` | None | Once | Static mask, no travel | Static final state | GSAP |
| Admissions four-step preview | 4 | `top 82%` | `opacity: 0`, bounded vertical travel | Fully visible at authored position | `deliberate`, `enter` | `60ms` desktop/tablet, `40ms` mobile; four items maximum | Once | Four items maximum, `y: 10px` | Static final state | GSAP + ScrollTrigger |
| Full eight-step process | 3 | Each four-step group at `top 82%` | Four related items share one reveal | Fully visible at authored position | `deliberate`, `enter` | No item stagger | Once | Two groups of four; no scrub | Static final state | GSAP + ScrollTrigger |
| Homepage arrival heading | 4 | Initial page entry below `64rem`, plus private-review desktop | `opacity: 0`, bounded responsive `y` | Fully visible at authored position | `slow`, `emphasised` | Responsive heading token; three lines maximum | Once | Live heading reveal | Static final state | GSAP |
| Homepage public desktop artwork | 4 | Public render at `64rem` and above | Exact authored `/og.png` composition | Static, uncropped and unoverlaid artwork | None | None | Never | Replaced by live copy and a static campus photograph | Static final state | Responsive CSS |
| Homepage private desktop media | 4 | Private-review render at `64rem` and above | Campus image at the approved image-mask scale maximum | Static authored campus frame | `slow`, `emphasised` | Coordinated with the heading timeline | Once | Static image beneath live copy | Static final state | GSAP |
| Homepage campus chapter | 4 | Section at `top 82%` | Copy reveal plus three bounded image masks | Fully visible at authored position | `deliberate` through `slow` | Card token; three frames maximum | Once | Copy reveal only | Static final state | GSAP + ScrollTrigger |
| Homepage publication review | 4 | Section at `top 82%` | Four supplied artwork cards share one reveal | Fully visible at authored position | `deliberate`, `enter` | `60ms` desktop/tablet, `40ms` mobile | Once | Bounded `y: 10px` | Static final state | GSAP + ScrollTrigger |
| Floating primary navigation | 3 | Original navigation leaves viewport; scroll direction changes | Full-width authored header, then a dark institutional floating bar | Down-scroll hides; up-scroll, menu activity and keyboard focus reveal | `standard`, `move` | Direction threshold prevents jitter | Repeats only on intentional direction changes | Same interaction with compact spacing | Floating bar remains visible with no tween | React + GSAP |
| Private Programmes hero | 4 | Initial page entry | Four bounded text reveals plus one bottom-to-top campus-media mask | Fully visible at authored position | `deliberate` through `slow`, `enter` and `emphasised` | `60ms` text offsets | Once | Combined copy and media reveal, `y: 10px` | Static final state | GSAP |
| Private Programmes grid | 4 | Each group at `top 82%` | Up to four cards share one bounded vertical reveal | Fully visible at authored position | `deliberate`, `enter` | `60ms` desktop/tablet, `40ms` mobile; four cards maximum per group | Once | Bounded `y: 10px` | Static final state | GSAP + ScrollTrigger |

Homepage essential-service links, the publication approval note, hero facts,
admissions actions, forms, notices, disclosure records, document lists, tables,
dates, and legal content remain outside all reveal timelines.

The private homepage P0 identity strip, publication-aware pathway cards and
Admissions 2026–27 feature are server-rendered in their readable final state.
Only the private hero copy and campus-image arrival use the expanded motion
recipe; the institutional facts, programme availability and admissions status
never depend on animation.

The Programmes recipes run only at the authenticated
`/publication-review/programmes-preview` route. Their supplied programme copy,
campus reference and proposed navigation remain draft material; the motion
prototype does not grant approval or activate any public route.

## CSS-owned feedback and orientation

- Buttons and links use `micro` or `fast` feedback. Fine-pointer button lift is
  capped at `1px`.
- Cards use `fast` or `standard` feedback. Fine-pointer card lift is capped at
  `2px`.
- Hover rules exist only inside `(hover: hover) and (pointer: fine)`.
- Keyboard focus uses an immediate outline and never a spatial transform.
- Submenus, the mobile sheet, search dialog, and application progress use
  bounded CSS transitions. Progress animates `transform: scaleX()`, not width.
- Site-wide route loading remains static. The private homepage prototype has one
  asset-aware arrival layer with separate loading and exit-reveal stages, no
  fake progress counter or continuous loop. With session storage available, it
  runs once per tab session, not on every homepage revisit or route navigation.
  Private reviewers can reopen `/?replayPreloader=1` to replay the real
  asset-aware sequence without clearing storage. The query has no effect on
  the public homepage, where the preloader is not mounted.
- The homepage film transition is fail-closed. With no complete approved film,
  poster and caption bundle, the component emits no video element or controls.
  Playback is user initiated, starts muted, never loops, and always provides
  pause/play, sound and return-to-poster controls when a bundle is present.
  Video and caption URLs are attached only after that user action; `preload`
  remains `none` and neither asset participates in the homepage preloader.

## Progressive enhancement and cleanup

Server-rendered markup contains every heading, step, link, and form in its final
readable state. GSAP applies temporary initial styles only after hydration and
clears them after each sequence. Each island owns a scoped root, uses
`useGSAP()`, groups responsive rules with `gsap.matchMedia()`, and reverts its
media context during unmount.

The static navigation fallback remains available until the interactive header
has actually hydrated. It therefore covers disabled JavaScript and failed or
slow client bundles without introducing layout shift.

The private homepage preloader is hidden in server HTML and therefore does not
add a no-JavaScript blocker. A separate existing issue remains: with JavaScript
fully disabled, the local production preview renderer leaves the root `loading.tsx`
streaming shell visible instead of replacing it with the homepage. That route
rendering limitation must be resolved before claiming full no-JavaScript
homepage support; it is not caused by either preloader stage.

The film preview and its controls are also hidden until their client island has
hydrated. Without JavaScript, the same critical campus poster remains visible;
no inert video control replaces essential content.

The floating treatment begins only after the original primary navigation has
left the viewport. The notice and utility bars keep their authored position;
open desktop menus, the mobile drawer, search and keyboard focus force the
primary navigation visible. Reduced-motion users retain the floating access
bar without automatic hide/reveal movement.

## Deliberate exclusions

The approved homepage prototype uses the supplied campus photography for a
bounded Level 4 arrival, one asset-aware private preloader, one campus chapter,
and one publication-review group.
Student-result artwork remains behind a visible approval gate until accuracy,
institutional status, and publication consent are confirmed. Crest motion and
scroll-linked parallax remain deferred. Pinning, scrubbing on content,
smooth-scroll libraries, custom cursors, counters, continuous loops, and global
reveal scanners are prohibited.

No further decorative motion should be scheduled ahead of site-state, print,
focus, skip-link, footer, mobile-navigation or management-content acceptance.
