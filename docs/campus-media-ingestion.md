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
2. Open the authenticated campus master preflight at
   `/publication-review/campus-master-preflight`, select one local file for each
   of the four fixed campus roles and run the browser check. The file bytes stay
   in the tab; nothing is uploaded, persisted, renamed, cropped or rewritten.
   Download the hash-only report for the controlled handoff. A blocked report
   is still useful evidence of what the photographer must replace.
3. Run the authoritative four-master inspection without writing derivatives:

   ```text
   npm run media:inspect-batch -- --report "CONTROLLED_PREFLIGHT_PATH" --input "media-campus-main=CONTROLLED_MASTER_PATH" --input "media-campus-grounds=CONTROLLED_MASTER_PATH" --input "media-campus-entrance=CONTROLLED_MASTER_PATH" --input "media-campus-courtyard=CONTROLLED_MASTER_PATH"
   ```

   The command first requires every local file's SHA-256 and byte count to match
   the browser report, then inspects all four actual formats, dimensions, colour
   spaces, animation/multipage state and embedded-metadata indicators. One
   mismatch fails the entire batch. Its JSON output stores no filename or path,
   writes nothing and grants no approval. TIFF files may require this step
   because the browser may not decode their dimensions. The single-record
   `npm run media:inspect -- --record RECORD_ID --input "CONTROLLED_PATH"`
   remains available for isolated diagnosis.
4. After the inspection passes, plan the complete non-public staging batch with
   the same `--report` and four `--input` arguments, replacing the command name
   with `npm run media:stage-batch`. The default mode reinspects exact bytes and
   writes nothing. When it reports `ready-for-explicit-write`, repeat it with:

   ```text
   --apply --acknowledge-local-write=stage-four-verified-campus-masters
   ```

   All 60 derivatives and five receipts are prepared under a temporary ignored
   directory first. Only a complete verified set is renamed into
   `work/media-intake/campus-batch`; one failure removes the whole temporary
   batch. An existing staging batch is preserved unless `--replace` is
   explicitly reviewed and supplied. This is private staging only: no manifest,
   public asset or binding changes.
5. Review `work/media-intake/campus-batch/batch-intake-receipt.json`, each of the
   four nested `intake-receipt.json` files and all responsive variants. The
   complete directory is ignored by Git. The single-record
   `npm run media:prepare -- --record RECORD_ID --input "CONTROLLED_PATH"`
   remains available for isolated diagnosis, not the normal four-master handoff.
6. Complete the record's accuracy, rights, privacy and management-approval
   checks in the controlled system. Generate a digest-bound request with
   `npm run approvals:update -- --record RECORD_ID`, fill only the reviewed
   outcomes and opaque references, then review and explicitly apply it through
   the guarded commands in the capture packet. The updater records the supplied
   decision but never grants approval.
7. Only after all four media records are currently approved, run
   `npm run media:publish-batch-plan`. The permanently read-only first-publication
   planner reopens all 60 staged derivatives, checks their hashes, dimensions,
   formats, colour spaces and metadata state, requires the complete production
   root and all bindings to be absent, and calculates the exact proposed
   four-binding registry. It accepts neither `--apply` nor `--replace`.
8. A `ready-for-explicit-first-publication` plan is evidence that the initial
   four-record switch is technically ready; it is not permission and does not
   write public files. Review its `publicationBatchId`, then rerun the guarded
   executor with that exact ID:

   ```text
   npm run media:publish-batch -- --publication-batch-id=PLAN_ID --apply --acknowledge-local-write=publish-four-approved-campus-media-records
   ```

   The command replans first, so stale IDs cannot authorize changed bytes. It
   copies only the 60 reviewed derivatives and four public-safe receipts into a
   temporary sibling root, reopens every derivative, rechecks staging and the
   registry, then exposes the complete root before one exact registry switch.
   A failure before that registry switch rolls the new root back. Staging is
   preserved, and the executor cannot replace media, grant approval or deploy.
   Do not perform the first homepage campus switch as four independent commands.
   The existing single-record `npm run media:publish -- --record RECORD_ID
   --input "CONTROLLED_PATH"` remains available for isolated pipeline diagnosis.

The single-record publish command prints a public-safe `bindingProposal` generated from the
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
