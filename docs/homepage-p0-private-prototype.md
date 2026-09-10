# Homepage P0 private prototype

The P0 homepage refinement is a private art-direction prototype. It strengthens
the first visit without changing the approval rules that determine what the
public site may claim.

## Built scope

1. **Live desktop arrival in private review.** The private build uses the
   existing campus-main prototype with live HTML typography. The public-mode
   desktop poster remains unchanged. The image and three masked heading lines
   share one bounded GSAP timeline and resolve to static final states for
   reduced motion.
2. **Verified identity strip.** Affiliation number, campus location and the
   direct Mandatory Public Disclosure link are immediately readable and stay
   outside all animation timelines. No affiliation-validity claim is inferred.
3. **Publication-aware institutional pathways.** The homepage enumerates the
   governed Programme routes and calls `getPublicProgrammeProfile()` for each
   one. A public render omits missing or expired profiles. Private review may
   show a neutral pending card, without exposing controlled evidence or blocked
   draft copy.
4. **Admissions 2026–27 feature.** The feature consumes the sanitized homepage
   admissions cycle and publishes its current status and message verbatim. It
   offers enquiry and process routes without claiming that admissions are open.

## Reference boundary

The two supplied animation repositories were used only as interaction research:
masked headings, coordinated transform timelines and an asymmetric editorial
grid. No repository source, fonts, game imagery, video or brand assets were
copied. The SSKEMS implementation uses the existing React, GSAP, CSS tokens,
approval data and campus prototype media.

## Public-release boundary

`HOMEPAGE_REVIEW_MODE=private` enables the desktop campus-art-direction variant.
It is not an authorization or authentication mechanism. Public release remains
subject to the composite release audit, exact media bindings, performance,
accessibility and the private Sites access policy used for review.

The next implementation priority is to make primary navigation, footer links
and sitemap generation consume the same current-profile selector. That prevents
an expired Programme profile from disappearing on its page while leaving a
stale site-wide link behind.
