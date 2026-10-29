# SARAS 7.0 Appendix IX disclosure import — review notes (29 October 2026)

Source: six-page school-supplied PDF named "Mandatory Disclosure Details _ SARAS 7.0.pdf", supplied in the ChatGPT work request. This branch transcribes the source without asserting that every statement, website URL or certificate is currently valid.

## Implemented on this draft branch

- Section A: eight source-reported general-information fields (preserving the PDF's contact number **7219819805** without overwriting site-wide contact values).
- Section B: the eight original WordPress document URLs captured in `app/data/saras7-disclosure.ts` in source order.
- Section C: five original academic-document URLs captured; two 2026 Class X/XII result rows rendered using the printed numbers and percentages.
- Section D: teacher totals, PGT/TGT/PRT counts, teacher–section ratio, special educator and wellness counts, all explicitly flagged for school sign-off.
- Section E: campus area, classroom/lab count-and-size notation, internet, toilets and the source-reported YouTube inspection URL.
- Section F: full, numbered 58-person source staff list, including NTT, wellness and OTHER entries, with no private employee information.
- Existing mandatory-document approval/asset hashes and the noindex review posture **remain unchanged**. A URL in the source file is **not** a public-document activation.

## Required owner reconciliation before merging or publication

1. **Staff totals:** Section D reports 47 teachers, PGT 15, TGT 10, PRT 15 and wellness 2. Section F lists 58 personnel including 10 OTHER, PGT 15, TGT 10, **PRT 13**, **WELLNESS TEACHER 3**, NTT 5, special educator 1 and principal 1. Do not silently change either source.
2. **Results:** Section D prints Class X: 2026, 18 registered, 17 passed, **94.44%**; Class XII: 28 registered, 26 passed, **92.85%**. The latter conventionally rounds to **92.86%**. Source figure is displayed without alteration. Prior-year results are not individually provided in the PDF, despite the linked three-year document.
3. **Contact/principal:** Section A lists **7219819805** and **Dr SYED SHAHED ALI**; site contact data contains other official numbers and Section F lists the full name **SYED SHAHED ALI MUJAHED ALI**. Validate public contact and naming conventions.
4. **Room areas:** PDF prints **36 & 603** for classrooms, **7 & 603** for laboratories. The basis of 603 sq m (aggregate/per room) is not specified; the UI preserves the notation and flags ambiguity.
5. **Certificates/files:** Download each of the 13 linked legacy PDFs from an authorised machine; verify HTTP availability, authority, date, expiry, self-attestation, content, accessibility, privacy and malware evidence. Publish each approved document only through the existing `public-document-publication-bindings.json` workflow (do not hand-mark approvals in source).
6. **Inspection video:** Confirm `https://www.youtube.com/watch?v=76KJnCZviLk` belongs to the school, actually shows a suitable inspection and is permanent. Confirm inspection date and signatory. The review page links to it without embedding.
7. **Privacy and publication:** School management must explicitly approve public employee names, role spelling and qualifications, and content reviewer must sign off all data before merge. The source PDF does not itself establish the project's required management-approval receipt.
8. **Quality assurance:** Execute `npm ci`, `npm run lint`, `npx tsc --noEmit --incremental false`, `node --test tests/saras7-disclosure-source.test.mjs`, existing disclosure regression tests and Vercel preview build. Validate desktop/mobile, keyboard and print output. CI and the deployed page have **not** been independently tested by this import process.

This is a **draft PR for review**, not a live deployment or CBSE compliance certificate.
