# Appendix IX document ingestion

The guarded document pipeline prepares candidate PDFs for controlled review and
publishes only the exact file that completed the approval process. It applies to
the twelve `document-*` records in `content/approval-manifest.json`.

Programme pages consume this same pipeline through
`lib/programmes-document-integration.ts`. An active disclosure binding is not
automatically authorised for a Programme page: the approval record must also
name that exact Programme route in `publicTargets`. Brochures require a new
canonical document record before use; an existing Appendix IX record must not
be repurposed or relabelled.

Candidate PDFs and rendered pages contain school records, so the staging root
`work/document-intake` is ignored by Git. Never copy staging content into the
repository, a ticket, email or chat. The intake receipt is deliberately
privacy-safe: it never stores the source filename or path, extracted document
text, approver identity or controlled evidence.

## What the pipeline checks

- the input is a parseable `.pdf` within the size and page limits;
- the PDF is not encrypted or password protected;
- scripts, launch actions, embedded files, rich media, XFA and forms are absent;
- Poppler can identify the page count and PDF version;
- a temporary text extraction can assess whether a usable text layer exists;
- every page renders to a numbered PNG preview for visual review;
- the candidate PDF and staged receipt share an exact SHA-256 hash.

Sparse or absent text does not destroy a legitimate scanned certificate. It
marks the candidate `remediation-required`, so OCR, reading order, document
title, language and other accessibility work can be completed before approval.
Extracted text is deleted immediately and is never written to the receipt.

This local pipeline does not perform malware scanning and never describes a PDF
as malware-clean. An authorised scanner must run in the school's controlled
system. Its opaque evidence reference and the exact candidate hash must be
reconciled there before the manifest's `malware-scan` check is marked verified.

## Operating sequence

1. Copy the candidate from the controlled record system to an authorised local
   review location. Do not rename or edit it after review begins.
2. Inspect it with the matching approval record:

   ```powershell
   npm.cmd run documents:inspect -- --record document-mpd-b-1 --input "C:\controlled\candidate.pdf"
   ```

3. If the static safety checks pass, prepare the ignored review bundle:

   ```powershell
   npm.cmd run documents:prepare -- --record document-mpd-b-1 --input "C:\controlled\candidate.pdf"
   ```

4. Review every `page-*.png`, reconcile page count and validity metadata against
   the signed source, complete privacy/accessibility work, and run the external
   malware scan. Record only opaque evidence IDs in the manifest.
5. Set the record to `approved` only after all six document checks pass and the
   uploader/approver separation of duties is evidenced in the controlled system.
6. Publish with a stable descriptive filename:

   ```powershell
   npm.cmd run documents:publish -- --record document-mpd-b-1 --input "C:\controlled\candidate.pdf" --public-filename affiliation-extension-2026.pdf
   ```

Publication is refused unless the exact SHA-256 hash matches the staged receipt,
the matching manifest record is approved and its malware-scan check is verified.
Public output contains only the approved PDF; the staging receipt and page
previews are never copied into `public`.

Use `--replace` only after confirming that the target record and stable filename
are correct. Use `SSKEM_POPPLER_BIN` when Poppler is installed outside the normal
system location. The current configuration is in
`content/document-ingestion-pipeline.json`.

## Activate an approved public PDF

Publishing the PDF does not make it downloadable. Prepare one controlled
public-metadata JSON object that conforms to
`content/public-document-activation-metadata.schema.json`. Keep that working
file outside the repository. It contains only public values: the approval
record ID, stable public filename, version label, current status, academic and
publication years where applicable, issuing authority, issue and expiry dates,
language, public note and non-sensitive notes.

Review the read-only activation plan first:

```powershell
npm.cmd run documents:activate -- --record RECORD_ID --metadata "CONTROLLED_METADATA.json"
```

After the plan reports `ready-for-explicit-write`, activate the exact binding:

```powershell
npm.cmd run documents:activate -- --record RECORD_ID --metadata "CONTROLLED_METADATA.json" --apply --acknowledge-local-write=activate-approved-public-document
```

Use `--replace` only after reviewing a changed staged receipt, public PDF and
public metadata. The write is atomic and refused if the registry or PDF changes
after planning. The activator never grants approval and never stores controlled
metadata paths, source paths, private evidence or approver identities. Run
`npm.cmd run documents:bindings:audit` after activation. A public build requires
all 12 Appendix IX records to have exact valid bindings; private review reports
the remaining count without exposing any unbound file.

## Plan the complete Appendix IX activation

Before the first twelve-document activation, combine the twelve public metadata
objects into one controlled batch that conforms to
`content/public-document-activation-batch.schema.json`. It must contain every
canonical document record exactly once, use twelve unique stable filenames and
retain the explicit complete-batch confirmation. Keep this working file in the
controlled system.

The authenticated private-review route
`/publication-review/document-metadata-batch` provides a browser-only worksheet
for this bundle. Every field starts blank. It validates each record, nullable
date/year choices, unique filenames and the final twelve-record confirmation,
then downloads JSON without a network request or server persistence. It reads
no PDF, stores no evidence and grants no approval. Verify every value against
the controlled reviewed source and retain the download in that controlled
system.

Run the permanently read-only planner:

```powershell
npm.cmd run documents:activate-batch-plan -- --metadata-batch "CONTROLLED_METADATA_BATCH.json"
```

The planner fails the whole set if any metadata record, current approval,
external malware-scan check, staged receipt or public PDF is missing, stale or
hash-invalid. It proposes one exact twelve-binding registry and a stable batch
ID only when every record passes. It accepts neither `--apply` nor `--replace`,
performs no write, grants no approval and does not run a malware scan. The
single-record activator remains available for isolated diagnosis; do not use
twelve independent writes for the first complete Appendix IX switch.

The guarded executor is also read-only by default:

```powershell
npm.cmd run documents:activate-batch -- --metadata-batch "CONTROLLED_METADATA_BATCH.json"
```

After reviewing a ready plan, apply only that exact batch ID:

```powershell
npm.cmd run documents:activate-batch -- --metadata-batch "CONTROLLED_METADATA_BATCH.json" --activation-batch-id=PLAN_ID --apply --acknowledge-local-write=activate-complete-appendix-ix-document-batch
```

The ID binds the complete metadata batch, all staged-receipt and PDF hashes, and
the registry baseline. The executor replans and rechecks all twelve records
immediately before one atomic local registry switch. It refuses replacement and
changes neither the public PDFs nor private staging. It grants no approval,
performs no malware scan and does not deploy.

## Visual and accessibility review checklist

- rendered page count matches the signed source and receipt;
- no page is blank, clipped, rotated incorrectly, unreadable or duplicated;
- seals, signatures and validity dates are legible without exposing data that
  is unnecessary for the public disclosure purpose;
- document title, issuing authority, issue date and expiry date agree with the
  public metadata;
- OCR text is accurate, selectable and ordered correctly when remediation was
  required;
- sensitive personal addresses, phone numbers, signatures or identifiers have
  an explicit public-purpose/privacy decision;
- the controlled malware-scan record names the same SHA-256 candidate hash.
