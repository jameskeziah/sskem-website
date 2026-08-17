# Appendix IX document ingestion

The guarded document pipeline prepares candidate PDFs for controlled review and
publishes only the exact file that completed the approval process. It applies to
the twelve `document-*` records in `content/approval-manifest.json`.

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
