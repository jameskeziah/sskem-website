# Site-wide finishing controls

## Status

The shared public shell now has complete not-found, loading and error recovery
states; two keyboard skip targets; stronger forced-colour focus treatment;
site-wide print behavior; one canonical footer navigation source; and a safer
mobile navigation drawer.

This work does not approve or publish Programme content, result statistics,
faculty names, fee information, affiliation claims or Programme navigation.
The governed routes remain unavailable outside authenticated private review and
remain absent from the public header, footer and sitemap.

## Implemented behavior

### Not found

- `app/not-found.tsx` returns a branded but factual 404 page.
- It has one heading, a focusable main landmark and links only to established
  public destinations.
- It is explicitly `noindex`/`nofollow`.
- Governed Programme routes use generic public metadata before returning 404,
  so private route names and draft descriptions do not leak into public page
  metadata.

### Loading and errors

- `app/loading.tsx` keeps the shared shell visible and announces loading through
  an accessible polite status.
- The loading placeholder is static and contains no speculative content.
- `app/error.tsx` provides a retry action and stable public escape routes without
  exposing exception messages, stack traces or digests.
- `app/global-error.tsx` provides a minimal recovery surface if the root layout
  itself fails.

### Skip and focus access

- The first focus stop exposes both `Skip to main content` and `Skip to footer`.
- Both targets are programmatically focusable without showing an unnecessary
  outline after the jump.
- Interactive elements retain the global visible focus ring.
- Forced-colour mode uses the system highlight colour instead of relying on the
  normal palette.

### Mobile navigation

- The drawer retains its focus trap, Escape handling, background inert state,
  scroll lock and focus restoration.
- Opening the drawer expands the section containing the current page.
- Expand/collapse controls announce their current action.
- Selecting a destination closes the drawer.
- The drawer uses dynamic viewport height, safe-area padding, a sticky close
  row, touch scrolling and a full-width layout on very narrow screens.
- The non-JavaScript navigation fallback remains available.

### Footer

- Header/footer links are sourced from the central navigation module.
- The footer has one stable skip target on every normal page.
- The previous public institutional-pathway status strip has been removed.
- Governed Programme routes are filtered from footer navigation at the central
  data boundary.

### Print

- Print output uses A4 margins, readable type and white backgrounds.
- Menus, dialogs, skip controls, action controls, video and embedded frames are
  removed.
- School identity, public contact details and the legal footer remain.
- Headings, rows, tables, figures and articles avoid inappropriate page breaks.
- Motion-owned content is forced to its readable final state.

## Remaining acceptance

Before a public cutover:

1. run the complete browser accessibility/navigation suite against the release
   candidate;
2. manually check keyboard use, VoiceOver/NVDA, 200% zoom and Windows high-
   contrast mode;
3. print-preview representative home, admissions, disclosure, document and 404
   pages in current Chrome and Edge;
4. repeat mobile drawer checks on iOS Safari and Android Chrome; and
5. rerun all checks after approved Programme routes are wired.

Additional decorative animation remains lower priority than these acceptance
checks and the outstanding management content/evidence gates.
