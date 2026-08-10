# SSKEMS homepage art direction and campus-media brief

Status: final private-review prototype  
Owner: school management and the website content owner  
Public release: blocked until the approval register below is complete

## 1. Creative direction

The homepage should feel cinematic because the school is shown with confidence,
scale and rhythm—not because essential information is delayed. Its story is:

**Arrive → Discover → Learn → Belong → Achieve → Apply**

The visual signature is the real Veral campus: the pink-and-white architecture,
open grounds, Konkan light, classrooms in use and genuine school activity. The
reference quality is Zentry's decisive framing and editorial pacing, adapted for
a school: readable copy, immediate admissions and disclosure access, restrained
motion, no scroll trapping and no audio-led experience.

## 2. Publication rules

- Campus photographs without identifiable pupils may be published after the
  location, date, photographer/source and management approval are recorded.
- Any identifiable pupil requires a current parent or guardian media consent
  that covers website publication. School possession of an image is not proof
  of publication consent.
- Names, photographs, marks, ranks, awards, batch labels and academic year must
  be checked against an approved school record before release.
- The Class XII Science and engineering/medical material also requires explicit
  confirmation that the Junior College/institutional status and claims may be
  published; that pathway remains pending in the current site policy.
- Do not publish phone numbers, signatures, IDs or document details merely
  because they are visible inside supplied artwork.
- Retain the current `data-publication-review="required"` gate until every
  relevant row in the approval register is signed off.
- That attribute and the visible approval message are review markers, not access
  control. A build containing unapproved pupil artwork must remain private; a
  public build must omit those assets until the evidence is complete.
- Use `npm run build:review` only inside an access-controlled review environment.
  The normal `npm run build` is deliberately blocked while this gate is active.
  Its `noindex, nofollow` metadata reduces accidental discovery but does not
  replace authentication or private hosting.

## 3. Supplied-media inventory and homepage role

| Supplied file | Controlled web asset | Intended role | Release decision |
| --- | --- | --- | --- |
| `6.jpeg` | `/media/home/campus-main.jpeg` | Desktop poster source and mobile hero image | Management/source approval |
| `7.jpeg` | `/media/home/campus-grounds.jpeg` | Campus chapter, wide establishing view | Management/source approval |
| `5.jpeg` | `/media/home/campus-entrance.jpeg` | Campus chapter, arrival/entrance detail | Management/source approval |
| `8.jpeg` | `/media/home/campus-courtyard.jpeg` | Campus chapter, shaded perspective | Management/source approval |
| `3.jpeg` | `/media/home/class-x-results-2025-26.jpeg` | Publication-review gallery | Consent and results verification |
| `4.jpeg` | `/media/home/xii-science-2025-26.jpeg` | Publication-review gallery | Consent, results and institutional-status verification |
| `9.jpeg` | `/media/home/rangotsav-2025-26.jpeg` | Publication-review gallery | Consent and award verification |
| `2.jpg` | `/media/home/result-and-admissions-2025-26.jpg` | Publication-review gallery | Consent, results, contact and admissions-claim verification |
| Derived artwork | `/og.png` | Approved 1200 × 630 desktop hero/social poster | Reapprove after any copy or source-image change |

The supplied files are 1400 × 500 and useful for this prototype, but they are
not a complete long-term campus library. Do not enlarge or AI-invent missing
campus detail. Replace them progressively with the capture plan below.

## 4. Homepage placement contract

1. **Desktop arrival:** show `/og.png` in full, without cropping, overlaid copy or
   parallax. The school name, affiliation facts and actions remain live HTML in
   the dock below it.
2. **Mobile arrival:** use live heading text and `/media/home/campus-main.jpeg`;
   never shrink the poster until its text becomes unreadable.
3. **Campus chapter:** use three distinct, truthful views. Motion may reveal the
   authored frames once but may not pin, scrub or obscure the captions.
4. **Essential access:** Admissions, Mandatory Public Disclosure and Documents
   remain immediately operable and outside reveal timelines.
5. **Achievement artwork:** private review only until approval. The visible gate
   is part of the prototype, not wording to remove before evidence is collected.

## 5. Capture-day shot list

Capture landscape and portrait versions where practical. Avoid staging pupils
solely for spectacle; show ordinary school life with consent.

1. Dawn or early-morning exterior from the clean front approach.
2. Wide grounds view with the whole building and uncluttered sight lines.
3. Entrance arrival with signage readable and power lines minimized by angle.
4. Classroom wide shot showing learning, teacher interaction and daylight.
5. Close learning detail: hands, books or equipment without sensitive data.
6. Science laboratory activity with correct protective practice.
7. Library or reading moment with strong depth and natural expressions.
8. Sports/action sequence on the grounds, including one wide and one close shot.
9. Art, music or club activity that broadens the academic story.
10. Teacher–pupil guidance moment with both participants' consent.
11. Inclusive group moment representing actual school life, not token casting.
12. Empty-campus architectural details for safe backgrounds and transitions.

For every take, record: asset ID, capture date, photographer, location, people
shown, consent reference, programme/year, caption, approver and expiry/withdrawal
notes. Do not store consent evidence in the public web repository.

## 6. Motion and video brief

- Optional homepage film: 20–30 seconds, 16:9 master plus 9:16 selects, composed
  from 6–8 calm shots with natural movement and no compulsory narration.
- The first frame must work as a poster. Video is enhancement only; never make it
  the sole source of a fact, instruction or call to action.
- No autoplay sound. If muted autoplay is later approved, provide pause/play,
  captions for meaningful speech and a static fallback.
- Avoid drone footage unless permissions, operator compliance, privacy and a
  genuinely useful establishing view are confirmed.
- Reduced-motion mode is zero-duration and uses the same final readable layout.

## 7. Delivery specification

- Photography master: original full-resolution JPEG or lossless source, sRGB,
  without embedded phone location metadata in the public derivative.
- Web derivatives: AVIF/WebP plus JPEG fallback where the stack supports them;
  preserve a useful focal point for 16:9, 4:3 and portrait crops.
- Aim for ≤ 250 KB for most responsive image candidates and ≤ 500 KB for the
  largest non-hero candidate. Keep the initial desktop hero transfer within the
  agreed performance budget; current `/og.png` should be optimized before public
  launch if it remains above that budget.
- Target LCP ≤ 2.5 seconds at the 75th percentile on representative mobile
  traffic. Lazy-load below-fold media and provide explicit dimensions.
- Filenames use a stable subject/date/sequence convention; captions and alt text
  describe the actual scene rather than repeating promotional copy.

## 8. Approval register

The machine-readable release register is `content/approval-manifest.json`; its
operating procedure is in `docs/approval-manifest.md`. The content owner should
attach actual evidence only in the school's controlled approval system and put
its opaque record reference in the manifest. The table below remains a human
capture checklist, not the release source of truth.

| Asset group | Accuracy | Consent | Rights/source | Institutional claim | Management approval | Publish |
| --- | --- | --- | --- | --- | --- | --- |
| Campus exteriors | ☐ | N/A unless people identifiable | ☐ | ☐ | ☐ | Blocked |
| Class X results | ☐ | ☐ | ☐ | ☐ | ☐ | Blocked |
| XII Science results | ☐ | ☐ | ☐ | ☐ | ☐ | Blocked |
| Rangotsav awards | ☐ | ☐ | ☐ | ☐ | ☐ | Blocked |
| Results/admissions composite | ☐ | ☐ | ☐ | ☐ | ☐ | Blocked |
| `/og.png` poster | ☐ | N/A unless source changes | ☐ | ☐ | ☐ | Blocked |

Withdrawal requests must identify every derivative and page placement so the
content owner can remove the public asset, rebuild and verify caches/social
previews. Approval is reversible; the source record remains private.
