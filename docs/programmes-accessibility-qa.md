# Programme accessibility and responsive QA

## Scope

The approved Programme profile routes share one automated QA contract:

- `/school/academics`
- `/junior-college`
- `/programmes/jee-neet`

Run it with:

```text
npm run test:qa:programmes
```

The command builds the authenticated review release, starts the production
preview and runs both the accessibility/responsive and Programme performance
browser suites. The review release displays the same public-safe profile text
without exposing the incomplete full Programme package.

## Automated coverage

`tests/browser/programmes-accessibility-responsive.spec.ts` checks:

- WCAG 2 A/AA, WCAG 2.1 AA and WCAG 2.2 AA rules with Axe;
- explicit contrast analysis on the Programme content surface;
- one main landmark, a coherent heading outline and labelled related-profile navigation;
- skip-link and keyboard traversal with visible focus;
- horizontal overflow, clipped critical content and 44-pixel route targets at
  320, 360 and 768 CSS pixels;
- the 200-percent zoom equivalent using a 640 CSS-pixel viewport;
- reduced-motion rendering with zero animation/transition duration, no autoplay
  video and readable static content; and
- approved facts, headings, admissions actions and the static site navigation
  with JavaScript disabled.

The Programme hero uses a solid approved design-token surface and no public
media. This lets the contrast engine evaluate the real reading background while
unapproved photographs remain outside the public profile.

## Human checks still required

Automation is a release gate, not a screen-reader certification. Repeat the
suite whenever approved facts or media are added, and complete manual checks
with keyboard-only navigation, NVDA or VoiceOver, browser zoom at 200%, and
content order on representative phones and desktops.
