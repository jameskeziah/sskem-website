import Link from "next/link";
import type { ReactNode } from "react";

import type { DisclosureFact } from "@/app/data/disclosure";
import {
  documentStatusLabels,
  type PublicDocument,
  type PublicDocumentStatus,
} from "@/app/data/documents";

export function ComplianceStatus({ status }: { status: PublicDocumentStatus }) {
  return (
    <span className={`compliance-status compliance-status--${status}`}>
      {documentStatusLabels[status]}
    </span>
  );
}

export function VerificationState({ state }: { state: DisclosureFact["state"] }) {
  return (
    <span className={`verification-state verification-state--${state}`}>
      {state === "verified" ? "Source checked" : "Approval required"}
    </span>
  );
}

export function ComplianceSectionHeading({
  letter,
  title,
  children,
  id,
}: {
  letter: string;
  title: string;
  children?: ReactNode;
  id: string;
}) {
  return (
    <div className="compliance-section-heading">
      <span className="compliance-section-heading__letter" aria-hidden="true">{letter}</span>
      <div>
        <p className="eyebrow">Appendix IX · Section {letter}</p>
        <h2 className="heading heading--page" id={id}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function DisclosureFactTable({ rows, caption }: { rows: DisclosureFact[]; caption: string }) {
  return (
    <div className="compliance-table-wrap">
      <table className="compliance-table compliance-table--facts">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Information</th>
            <th scope="col">SSKEMS public value</th>
            <th scope="col">Review status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td data-label="SSKEMS public value">
                <strong>{row.value}</strong>
                {row.note ? <small>{row.note}</small> : null}
              </td>
              <td data-label="Review status"><VerificationState state={row.state} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApprovedFileActions({ document }: { document: PublicDocument }) {
  const version = document.currentVersion;
  if (!version?.publicUrl) {
    return (
      <div className="document-actions document-actions--pending">
        <span>Approved public PDF pending</span>
        <Link href={`/documents/${document.slug}`}>Record details</Link>
        <Link href={`/documents/${document.slug}/versions`}>Version history</Link>
      </div>
    );
  }

  return (
    <div className="document-actions">
      <a href={version.publicUrl} target="_blank" rel="noreferrer">View PDF <span className="visually-hidden">(opens in a new tab)</span></a>
      <a href={version.publicUrl} download>Download PDF</a>
      <Link href={`/documents/${document.slug}/versions`}>Version history</Link>
    </div>
  );
}

export function MandatoryDocumentTable({ documents }: { documents: PublicDocument[] }) {
  return (
    <div className="compliance-table-wrap">
      <table className="compliance-table compliance-table--documents">
        <caption>Section B required documents in Appendix IX row order</caption>
        <thead>
          <tr>
            <th scope="col">No.</th>
            <th scope="col">Required document</th>
            <th scope="col">Document metadata</th>
            <th scope="col">Current status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <th scope="row">{document.appendixRow}</th>
              <td data-label="Required document">
                <strong>{document.title}</strong>
                <small>{document.publicNote}</small>
              </td>
              <td data-label="Document metadata">
                <dl className="compact-metadata">
                  <div><dt>Authority</dt><dd>{document.issuingAuthority ?? "Verification required"}</dd></div>
                  <div><dt>Issue date</dt><dd>{document.issueDate ?? "Verification required"}</dd></div>
                  <div><dt>Valid until</dt><dd>{document.expiryDate ?? "Verification required"}</dd></div>
                  <div><dt>File</dt><dd>{document.currentVersion ? `${document.currentVersion.fileType} · ${document.currentVersion.fileSize ?? "Size pending"}` : "Approved file required"}</dd></div>
                  <div><dt>Accessibility</dt><dd>{document.currentVersion?.accessibilityStatus ?? "Assessment pending"}</dd></div>
                </dl>
              </td>
              <td data-label="Current status"><ComplianceStatus status={document.status} /></td>
              <td data-label="Actions"><ApprovedFileActions document={document} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocumentArchiveCard({ document }: { document: PublicDocument }) {
  const categoryName = document.categorySlug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return (
    <article className="archive-card">
      <div className="archive-card__topline">
        <span>{categoryName}</span>
        <ComplianceStatus status={document.status} />
      </div>
      <h2><Link href={`/documents/${document.slug}`}>{document.title}</Link></h2>
      <p>{document.publicNote}</p>
      <dl className="archive-card__metadata">
        <div><dt>Academic year</dt><dd>{document.academicYear ?? "Metadata approval required"}</dd></div>
        <div><dt>Issue date</dt><dd>{document.issueDate ?? "Verification required"}</dd></div>
        <div><dt>Expiry date</dt><dd>{document.expiryDate ?? "Verification required"}</dd></div>
        <div><dt>Language</dt><dd>{document.language}</dd></div>
        <div><dt>File type</dt><dd>{document.currentVersion?.fileType ?? "Approved PDF pending"}</dd></div>
        <div><dt>File size</dt><dd>{document.currentVersion?.fileSize ?? "Pending"}</dd></div>
        <div><dt>Last reviewed</dt><dd>{document.lastReviewed}</dd></div>
      </dl>
      <div className="archive-card__actions">
        <Link className="button button--secondary" href={`/documents/${document.slug}`}>View record</Link>
        {document.currentVersion?.publicUrl ? <a className="button button--quiet" href={document.currentVersion.publicUrl} download>Download PDF</a> : <span className="archive-card__unavailable">Public PDF awaiting approval</span>}
      </div>
    </article>
  );
}
