# SSKEMS School Website

Phase 1 of the SSKEMS website rebuild: a verified design-token foundation,
shared interface components, responsive global navigation, footer, and a
review catalogue for desktop and mobile.

## Local development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm test
```

The test command regenerates design tokens, creates a production build, checks
the Phase 1 contracts, and runs accessibility, keyboard, responsive, and visual
browser tests.

## Current content policy

- CBSE School is the only verified primary pathway.
- Junior College and Institute remain available as clearly labelled pending
  routes until management confirms their status and navigation placement.
- Public contact details are centralized in `app/data/site.ts`.
- Design tokens are authored in `app/design-tokens.json` and generated into
  `app/tokens.css`.

## Technology

- Next.js-compatible vinext runtime on Cloudflare Workers
- React and TypeScript
- Tailwind CSS with project-owned design tokens
- Playwright and axe-core for browser verification
