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

1. Inspect the master without writing derivatives:
   `npm run media:inspect -- --record media-campus-main --input "CONTROLLED_PATH"`.
2. After the inspection passes, prepare a non-public staging set:
   `npm run media:prepare -- --record media-campus-main --input "CONTROLLED_PATH"`.
3. Review the generated receipt and responsive variants under
   `work/media-intake/RECORD_ID`. This directory is ignored by Git.
4. Complete the record's accuracy, rights, privacy and management-approval
   checks, add opaque evidence references, and set the manifest decision to
   `approved`.
5. Only then may the content owner run
   `npm run media:publish -- --record RECORD_ID --input "CONTROLLED_PATH"`.

Public generation is refused unless the canonical manifest record is approved.
Staging output is restricted to `work/media-intake`; public output is restricted
to `public/media/home/production`. Existing derivative sets are preserved unless
the operator explicitly supplies `--replace`, and replacement is prepared and
verified before the existing set is swapped.

## Receipt and privacy contract

`intake-receipt.json` contains only the media record ID, source hash,
non-sensitive technical metadata and derivative hashes. It never stores the
source filename or path, guardian consent, approver identity or private
evidence.

Every derivative is reopened after encoding and rejected if EXIF, XMP or IPTC
metadata remains. The pipeline preserves the source aspect ratio; focal-point
selection and any crop require a separate, explicitly approved art-direction
decision.
