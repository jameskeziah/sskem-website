# Campus media ingestion

This workflow turns an approved high-resolution campus master into responsive
AVIF, WebP and JPEG derivatives without cropping or enlarging it. It strips
EXIF, XMP and IPTC metadata from every derivative, records hashes and dimensions
in an intake receipt, and enforces output size ceilings.

Private source masters may live anywhere in the school's controlled media
system. Do not copy original masters, consent evidence, photographer identity
records or private metadata into this repository.

## Required master

- JPEG, PNG or TIFF;
- sRGB/RGB colour space;
- at least 2400 px on the long edge and 1350 px on the short edge;
- one still frame, not an animation or multi-page file;
- an approval-manifest media record that identifies the intended public use.

The current 1400 x 500 supplied photographs remain suitable for the private
art-direction prototype but intentionally fail the production-master dimension
gate. They must not be enlarged to imitate missing detail.

## Workflow

1. From the owner-only review page, download the campus capture packet and use
   its four ordered exterior-shot records as the photographer/content-owner
   handoff.
2. Inspect the master without writing derivatives:
   `npm run media:inspect -- --record media-campus-main --input "CONTROLLED_PATH"`.
3. After the inspection passes, prepare a non-public staging set:
   `npm run media:prepare -- --record media-campus-main --input "CONTROLLED_PATH"`.
4. Review the generated receipt and responsive variants under
   `work/media-intake/RECORD_ID`. This directory is ignored by Git.
5. Complete the record's accuracy, rights, privacy and management-approval
   checks, add opaque evidence references, and set the manifest decision to
   `approved`.
6. Only then may the content owner run
   `npm run media:publish -- --record RECORD_ID --input "CONTROLLED_PATH"`.

The publish command prints a public-safe `bindingProposal` generated from the
exact public receipt. Do not copy that object into the registry by hand. Review
the read-only activation plan first:

`npm run media:activate -- --record RECORD_ID`

When the plan reports `ready-for-explicit-write`, activate the exact set with:

`npm run media:activate -- --record RECORD_ID --apply --acknowledge-local-write=activate-approved-campus-media`

The write is atomic and refused if the registry changes after planning. An
existing, different binding is preserved unless the content owner reviews the
new receipt and explicitly adds `--replace`. The activator never grants manifest
approval and never stores private evidence, approver identity or a source path.
Run `npm run media:bindings:audit` after activation. The audit reopens the
receipt and all 15 derivatives, verifies exact byte sizes, SHA-256 hashes and
dimensions, and rejects embedded EXIF, XMP or IPTC metadata.

Public generation is refused unless the canonical manifest record is approved.
Staging output is restricted to `work/media-intake`; public output is restricted
to `public/media/home/production`. Existing derivative sets are preserved unless
the operator explicitly supplies `--replace`, and replacement is prepared and
verified before the existing set is swapped.

## Homepage activation

The homepage uses `components/campus-picture.tsx` for the four campus roles. It
continues showing the supplied prototype JPEGs in private review while the
binding registry is empty. A production AVIF/WebP/JPEG `<picture>` source set is
activated only when all of these are true:

- the exact campus media record is currently approved in the canonical manifest;
- the record has one unique role-correct binding;
- the binding contains the complete 480, 768, 1200, 1600 and 2000 pixel profile
  in AVIF, WebP and JPEG;
- the binding exactly matches the public intake receipt; and
- every derivative exists and passes its recorded hash, dimensions, byte budget
  and embedded-metadata check.

Any missing, malformed, duplicated, expired, unapproved or mismatched binding
fails closed to the private prototype source. The public release gate still
blocks those prototype assets from becoming an accidental substitute for an
approved production library.

Run `npm run performance:audit` after activating all four records. The public
build also runs this read-only audit automatically and remains blocked until the
tracked homepage files meet their byte budgets and all four exact bindings are
valid. In private review, known release blockers are reported without changing
the supplied artwork. Asset drift, missing files, wrong dimensions or wrong
formats fail in both modes.

## Receipt and privacy contract

`intake-receipt.json` contains only the media record ID, source hash,
non-sensitive technical metadata and derivative hashes. It never stores the
source filename or path, guardian consent, approver identity or private
evidence.

Every derivative is reopened after encoding and rejected if EXIF, XMP or IPTC
metadata remains. The pipeline preserves the source aspect ratio; focal-point
selection and any crop require a separate, explicitly approved art-direction
decision.
