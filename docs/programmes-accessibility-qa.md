# Programme accessibility and responsive QA

## Scope

The private Programme routes share one automated QA contract:

- `/school/academics`
- `/junior-college`
- `/programmes/jee-neet`

Run it with:

```text
npm run test:qa:programmes
```

The command builds the private review release, starts the production preview and
runs both the accessibility/responsive and Programme performance browser suites.
It does not publish, deploy or add a route to navigation or the sitemap.

## Automated coverage

`tests/browser/programmes-accessibility-responsive.spec.ts` checks:

- WCAG 2 A/AA, WCAG 2.1 AA and WCAG 2.2 AA rules with Axe;
- explicit contrast analysis on the Programme content surface;
- one main landmark, a coherent heading outline, labelled route navigation,
  meaningful image alternatives and visible captions;
- skip-link and keyboard traversal with visible focus;
- horizontal overflow, clipped critical content and 44-pixel route targets at
  320, 360 and 768 CSS pixels;
- the 200-percent zoom equivalent using a 640 CSS-pixel viewport;
- reduced-motion rendering with zero animation/transition duration, no autoplay
  video and readable static content; and
- route navigation, headings, state and all ten component slots with JavaScript
  disabled.

The Programme hero uses a solid approved design-token surface. This lets the
contrast engine evaluate the real reading background instead of returning an
indeterminate result for text over a decorative gradient.

## Human checks still required

Automation is a release gate, not a screen-reader certification. When the exact
approved package and real media are wired, repeat the suite and complete manual
checks with keyboard-only navigation, NVDA or VoiceOver, browser zoom at 200%,
captions/transcripts, alt-text accuracy and content order on representative
phones and desktops.

