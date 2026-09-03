import { Heading, Text } from "@/components/typography";
import {
  isPipelineApprovedProgrammeDocument,
  type ApprovedProgrammeDocument,
  type ProgrammeDocumentKind,
} from "@/lib/programmes-document-integration";
import {
  isApprovedProgrammeRenderGate,
  type ApprovedProgrammeRenderGate,
} from "@/lib/programmes-render-gate";

type ProgrammeDocumentGroupProps = Readonly<{
  gate: ApprovedProgrammeRenderGate;
  documents: readonly ApprovedProgrammeDocument[];
}>;

const groupContent = {
  brochure: {
    kicker: "Programme overview",
    title: "Brochures",
    summary: "Approved programme brochures and prospectuses from the guarded public-document pipeline.",
    mark: "BR",
  },
  timetable: {
    kicker: "Academic schedule",
    title: "Timetables and calendars",
    summary: "Current approved timetable or academic-calendar files for this programme.",
    mark: "TT",
  },
  "fee-circular": {
    kicker: "Current charges",
    title: "Fee circulars",
    summary: "Current approved fee publications; page summaries never replace the signed circular.",
    mark: "FE",
  },
  "affiliation-document": {
    kicker: "Institutional record",
    title: "Affiliation and recognition",
    summary: "Current affiliation, recognition or no-objection records approved for this programme route.",
    mark: "AF",
  },
} as const satisfies Record<ProgrammeDocumentKind, Readonly<{
  kicker: string;
  title: string;
  summary: string;
  mark: string;
}>>;

function groupId(gate: ApprovedProgrammeRenderGate, kind: ProgrammeDocumentKind) {
  return `${gate.route.replace(/^\//, "").replaceAll("/", "-")}-documents-${kind}`;
}

function documentPeriod(document: ApprovedProgrammeDocument) {
  return document.academicYear ?? document.publicationYear ?? "Current approved edition";
}

function ProgrammeDocumentCard({
  document,
  mark,
}: {
  document: ApprovedProgrammeDocument;
  mark: string;
}) {
  return (
    <article className="programme-document-card" data-document-status={document.status}>
      <header className="programme-document-card__header">
        <span className="programme-document-card__mark" aria-hidden="true">{mark}</span>
        <span className="programme-document-card__status">
          {document.status === "expiring-soon" ? "Expiring soon" : "Current"}
        </span>
      </header>
      <div className="programme-document-card__copy">
        <Heading as="h4" level="subsection">{document.title}</Heading>
        <Text>{document.description}</Text>
      </div>
      <dl className="programme-document-card__metadata">
        <div><dt>Period</dt><dd>{documentPeriod(document)}</dd></div>
        <div><dt>Issued by</dt><dd>{document.issuingAuthority}</dd></div>
        <div><dt>Issue date</dt><dd><time dateTime={document.issueDate}>{document.issueDate}</time></dd></div>
        {document.expiryDate ? <div><dt>Valid until</dt><dd><time dateTime={document.expiryDate}>{document.expiryDate}</time></dd></div> : null}
        <div><dt>File</dt><dd>{document.format} · {document.pages} {document.pages === 1 ? "page" : "pages"} · {document.size}</dd></div>
        <div><dt>Accessibility</dt><dd>{document.accessibilityStatus}</dd></div>
        <div><dt>Language</dt><dd>{document.language}</dd></div>
      </dl>
      <div className="programme-document-card__actions">
        <a href={document.href} target="_blank" rel="noreferrer">
          View PDF<span className="visually-hidden">: {document.title} (opens in a new tab)</span>
        </a>
        <a href={document.href} download>
          Download PDF<span className="visually-hidden">: {document.title}</span>
        </a>
      </div>
    </article>
  );
}

function ProgrammeDocumentGroup({
  gate,
  documents,
  kind,
}: ProgrammeDocumentGroupProps & { kind: ProgrammeDocumentKind }) {
  if (
    !isApprovedProgrammeRenderGate(gate)
    || !documents.length
    || documents.some((document) => !isPipelineApprovedProgrammeDocument(document) || document.kind !== kind)
  ) return null;

  const content = groupContent[kind];
  const titleId = groupId(gate, kind);
  return (
    <section className="programme-document-group" aria-labelledby={titleId} data-document-kind={kind}>
      <header className="programme-document-group__heading">
        <div>
          <p>{content.kicker}</p>
          <Heading as="h3" id={titleId} level="subsection">{content.title}</Heading>
        </div>
        <Text>{content.summary}</Text>
      </header>
      <div className="programme-document-grid">
        {documents.map((document) => <ProgrammeDocumentCard document={document} key={document.id} mark={content.mark} />)}
      </div>
    </section>
  );
}

export function ProgrammeBrochures(props: ProgrammeDocumentGroupProps) {
  return <ProgrammeDocumentGroup {...props} kind="brochure" />;
}

export function ProgrammeTimetables(props: ProgrammeDocumentGroupProps) {
  return <ProgrammeDocumentGroup {...props} kind="timetable" />;
}

export function ProgrammeFeeCirculars(props: ProgrammeDocumentGroupProps) {
  return <ProgrammeDocumentGroup {...props} kind="fee-circular" />;
}

export function ProgrammeAffiliationDocuments(props: ProgrammeDocumentGroupProps) {
  return <ProgrammeDocumentGroup {...props} kind="affiliation-document" />;
}
