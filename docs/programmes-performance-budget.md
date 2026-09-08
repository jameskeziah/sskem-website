# Programme performance budget

## Purpose

`content/programmes-performance-budget.json` fixes the limits for all three
private Programme routes before approved media arrives. The contract is strict:
unknown fields and relaxed ceilings fail validation. The audit reads source
files and build output; it never edits or optimises media.

## Limits

| Area | Limit |
| --- | ---: |
| Hero image | 250,000 bytes |
| Hero video poster | 250,000 bytes |
| Complete hero video file | 3,000,000 bytes |
| Video transferred during initial load | 0 bytes |
| Complete initial route transfer | 1,500,000 bytes |
| Initial requests | 32 |
| Typeface stacks | 2 system-font stacks |
| Font files / font transfer | 0 / 0 bytes |
| Motion components | 2 maximum |
| Autoplay media | 0 |
| Infinite animations | 0 |
| Longest single animation or transition | 700 ms |
| Largest Contentful Paint | 2,500 ms |
| Cumulative Layout Shift | 0.1 |

The 1.5 MB route ceiling was set from the current private-shell baseline of
approximately 1.21-1.27 MB, leaving limited room for approved content while the
separate 250 KB hero cap prevents that allowance being consumed by replacement
artwork. A video may be no larger than 3 MB, but it must remain outside the
initial transfer and must not autoplay.

## Enforcement

`npm run programmes:performance:audit` is a read-only source audit. It verifies
the exact route scope, current hero asset bytes and intrinsic dimensions, the
absence of web-font files/sources, the two typography tokens, the 700 ms shared
motion ceiling and the global reduced-motion override. It runs in every build.

`tests/browser/programmes-performance.spec.ts` measures the built routes in a
fresh Chromium context. It records every initial request and encoded transfer,
hero bytes, font/video transfer, motion/autoplay/infinite animation counts,
maximum CSS duration, buffered LCP and CLS. A missing measurement fails closed.

These are local lab gates, not field data. After deployment is separately
authorised, production Lighthouse or Web Vitals monitoring should confirm the
same LCP and CLS limits under representative mobile network and device profiles.

## Real-media intake

Before replacing a prototype, inspect the exact derivative against this budget.
Do not raise a limit merely to accept an oversized asset. Optimisation or a
versioned budget change requires separate review, then the static audit, browser
suite, accessibility suite and public release audit must all be rerun.
