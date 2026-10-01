# SSKEMS complete homepage — editorial go-ahead and publication evidence

Updated 2026-10-01. Release branch: `release/complete-homepage-approval-gated-20261001`. Review PR #10.

## Editorial direction received

The site operator has expressly asked to approve and prepare **all details, media and documents previously supplied** for the full redesigned homepage. Treat this as approval of the *editorial direction and requested release scope*. It is not, without the relevant records, independent evidence of copyright ownership, guardian consent, current certificate validity, or authorisation to act as the school's official designated approver. Do not populate `approvedAt`, `approvedByRole`, evidence IDs or SHA-256 values by inference.

Only the approved projection may be activated publicly. The private seven-scene assets remain in gitignored `public/media/home/hero-drafts/`. Never set `HOMEPAGE_REVIEW_MODE=private` on production as a shortcut.

## Seven-scene Zentry hero evidence queue

Each scene needs an approved real SSKEMS full image, its preview derivative, exact SHA-256 hashes, verified school-specific alt text, final desktop/tablet/mobile crop sign-off, a controlled derivative receipt, and a corresponding approved media record with homepage target. Identifiable pupils additionally need applicable documented guardian consent.

| Scene | Public record ID | Existing draft status | Public full/preview pair |
|---|---|---|---|
| Campus | `media-hero-campus` | Private source; approval unrecorded | Not registered |
| Entrance | `media-hero-entrance` | Private source; approval unrecorded | Not registered |
| Science | `media-hero-science` | Private student photos; consent unverified | Not registered |
| Skating | `media-hero-skating` | Private student photos; consent unverified | Not registered |
| Digital | `media-hero-digital` | Private student photos; consent unverified | Not registered |
| Culture | `media-hero-culture` | Private student photos; consent unverified | Not registered |
| Sports | `media-hero-sports` | Private student photos; consent unverified | Not registered |

The four existing campus gallery records (`media-campus-main`, `media-campus-grounds`, `media-campus-entrance`, `media-campus-courtyard`) also remain `review-required` in the approval manifest. Their existence in the repository is **not** proof of rights, privacy review or activation. Do not fabricate media release records.

## Document evidence queue: Appendix IX

Source URLs were recorded in the user-provided `SSKEMS_Content_Governance_Master_2026-09-09.xlsx` evidence register. An authenticated **read-only** WordPress REST media inventory on 2026-10-01 additionally located plausible attachments for **every** Appendix IX category; attachment IDs, file names and upload dates are listed below. These are leads for ingesting *exact* PDFs, not SHA-256-bound approved archive documents. Direct public-PDF fetches returned HTTP 403, and WordPress REST metadata does not include the underlying PDF bytes or prove current certificate validity. Obtain original PDFs through the controlled school document handoff, inspect dates/issuer/signatures and match authority; run the repository's guarded `documents:inspect`, `documents:prepare`, `documents:publish`, and `documents:activate` workflows only after authorised review.

| Appendix IX record | Source lead or evidence gap | Publication gate |
|---|---|---|
| `document-mpd-b-1` affiliation/extension | WordPress media **7761** (Aug 2026), `Affiliation.pdf`; older **7405** | Exact signed PDF, period/current authority and reviewed derivative |
| `document-mpd-b-2` trust registration/renewal | WordPress media **7413** (May 2025), trust renewal certificate | Exact current version and reviewed derivative |
| `document-mpd-b-3` state NOC | WordPress media **7409** (May 2025), state NOC candidate | Current, applicable authoritative original or documented non-applicable determination |
| `document-mpd-b-4` RTE certificate | WordPress media **7628** (May 2026), RTE Act and renewal; older **7411** | Exact current version and reviewed derivative |
| `document-mpd-b-5` building safety | WordPress media **7585** (Jun 2025), building safety; older **7404** | Validate issue date, expiry and competent-authority certificate |
| `document-mpd-b-6` fire safety | WordPress media **7602**, **7586** (Jun 2025), fire-safety candidates | Designate signed current version and verify validity |
| `document-mpd-b-7` DEO certificate/self-certification | WordPress **7765** (Aug 2026), **7758** (Aug 2026), or DEO certificate **7590** (Jun 2025) | Designate accepted canonical document; verify authority and exact PDF |
| `document-mpd-b-8` water/health/sanitation | WordPress media **7414** (May 2025), combined certificate | Verify applicable current certificates and validity |
| `document-mpd-c-1` fees | WordPress media **7429** (May 2025) | Confirm 2026–27 applicability/current fee schedule before activation |
| `document-mpd-c-2` annual academic calendar | WordPress media **7638** (May 2026), academic calendar; older **7443** | Confirm 2026–27 dates and current approved version |
| `document-mpd-c-3` school management committee | WordPress media **7424**, **7417**, **7412** (May 2025), SMC candidates | Confirm current roster and approved public fields |
| `document-mpd-c-4` PTA members | WordPress media **7627** (May 2026), PTA candidate; older **7410** | Confirm current roster and approved public fields |

Avoid replacing current school-issued documents with screenshots, index pages or old versions, and do not route the site's public archive to an inaccessible or disappearing legacy-domain asset.

## Public institutional facts verified independently

Primary CBSE SARAS record `https://saras.cbse.gov.in/SARAS/AffiliatedList/AfflicationDetails/1130851`: official school name, CBSE affiliation 1130851, Senior Secondary status, principal **SYED SHAHED ALI MUJAHED ALI**, Veral/Ratnagiri address, next SARAS period 01/04/2027–31/03/2032. This is a *future* period; existing school disclosure identifies 31/03/2027 as the current period end. The school's public SARAS/disclosure page corroborates school code 30780 and published mobile 7219819806. These sources support the revised principal/public-school-contact display in this branch; they do not independently approve unrelated pupil/result claims or the ProTrack legal relationship.

## Engineering and release gates

- Main release CI validates lint, TypeScript, current-framework contracts, media safety, dependency audit, and an access-controlled build.
- Private synthetic-image Playwright checks validate seven-slide interaction without publishing pupils' photos; separate current-framework browser checks cover disclosures and admissions.
- Earlier Stage 2/3 tests that import a removed `dist/server/index.js` worker are incompatible with the current Vinext stack. Coverage must come from maintained browser tests; do not count them as passing legacy tests. The earlier document pipeline failures were due to Poppler missing on the runner; current main CI installs Poppler.
- Keep `HOMEPAGE_PUBLIC_ZENTRY_HERO` unset/false until the seven exact approved pairs, manifest, active campus/media bindings and all existing school-wide public-release gates pass. A successful *private* Vercel build is not public release approval.
- Do not merge or redirect `www.sskemschool.com` before final current-document approval, responsive QA, school management sign-off and release check completion.
