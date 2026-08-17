# Homepage poster optimization

This workflow measures and prepares a lossless review candidate for the approved
homepage/social poster without changing its composition, pixels, public file,
approval state or performance budget.

## Verified current result

`public/og.png` is a 1200 × 630 PNG. The exact-composition lossless profile
reduces it from 1,446,077 bytes to 1,004,872 bytes while preserving the decoded
RGBA pixels exactly and removing EXIF, XMP and IPTC metadata.

The candidate is still 604,872 bytes above the 400,000-byte public-release
ceiling. This means lossless PNG compression alone cannot close the blocker.
The release budget remains unchanged and the public build must remain blocked.

## Commands

```powershell
npm run poster:inspect
npm run poster:prepare
```

`poster:inspect` is read-only. `poster:prepare` writes only to the ignored
`work/homepage-poster-optimization/` directory:

- `og.lossless.png` — the pixel-identical review candidate.
- `optimization-receipt.json` — hashes, dimensions, byte comparison, metadata
  checks and the explicit decision state. It contains no local source path,
  approver identity or private evidence reference.

Preparation refuses to replace a non-empty staging directory. After reviewing
the exact target, an intentional refresh can use:

```powershell
npm run poster:prepare -- --replace
```

No command in this workflow writes to `public/og.png`, changes
`content/homepage-media-performance-budget.json`, activates a candidate or marks
it approved.

## Decision boundary

Meeting the current byte ceiling now requires at least one new art-direction
decision: allow a different delivery format, allow pixel-level encoding changes,
or revise the artwork/placement. Each option changes an approved constraint and
therefore needs separate management approval before implementation. Do not
silently raise the performance budget or substitute the staged file into public
output.

Once that decision is recorded, the next implementation should add a
format-specific, quality-reviewed derivative contract and bind it through the
existing publication and performance gates.
