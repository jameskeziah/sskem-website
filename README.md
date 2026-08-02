# SSKEMS School Website

Stages 1 and 2 of the SSKEMS website rebuild: the verified design-system and
navigation foundation plus an accessible Mandatory Public Disclosure and
structured document-archive review module.

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
the Phase 1 and Stage 2 contracts, validates document-publication safeguards,
and runs accessibility, keyboard, responsive, archive-filter and visual tests.

## Current content policy

- CBSE School is the only verified primary pathway.
- Junior College and Institute remain available as clearly labelled pending
  routes until management confirms their status and navigation placement.
- Public contact details are centralized in `app/data/site.ts`.
- Design tokens are authored in `app/design-tokens.json` and generated into
  `app/tokens.css`.
- `/mandatory-public-disclosure` follows the revised five-section Appendix IX
  HTML structure without exposing unapproved PDFs.
- `/documents` provides controlled taxonomy, native GET filters and stable
  document/version routes.
- The compliance schema and validation layer are foundations only; official
  document ingestion, approvals, scanning and public-domain cutover remain
  blocked until the school supplies approved records and operating decisions.

## Technology

- Next.js-compatible vinext runtime on Cloudflare Workers
- React and TypeScript
- Tailwind CSS with project-owned design tokens
- Playwright and axe-core for browser verification
