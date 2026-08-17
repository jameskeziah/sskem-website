import {
  createPublicDocumentPublicationIndex,
  publicDocumentUrl,
  type PublicDocumentId,
} from "../../lib/public-document-publication.ts";

export type PublicDocumentStatus =
  | "current"
  | "expiring-soon"
  | "expired"
  | "superseded"
  | "not-applicable"
  | "pending-renewal"
  | "action-required";

export type AccessibilityStatus =
  | "Tagged and accessible"
  | "Text-readable"
  | "Scanned but partially readable"
  | "Remediation required"
  | "Assessment pending";

export type PublicDocumentVersion = {
  label: string;
  revisionDate: string;
  status: PublicDocumentStatus;
  publicUrl: string | null;
  fileName: string | null;
  fileType: "PDF";
  fileSize: string | null;
  accessibilityStatus: AccessibilityStatus;
};

export type PublicDocument = {
  id: string;
  title: string;
  slug: string;
  categorySlug: string;
  academicYear: string | null;
  publicationYear: string | null;
  institution: "SSKEMS CBSE School";
  issuingAuthority: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  status: PublicDocumentStatus;
  language: "English" | "Marathi" | "English and Marathi";
  lastReviewed: string;
  mandatoryDisclosure: boolean;
  appendixSection: "B" | "C" | null;
  appendixRow: number | null;
  publicNote: string;
  currentVersion: PublicDocumentVersion | null;
  versions: PublicDocumentVersion[];
};

export const documentCategories = [
  { name: "Mandatory Public Disclosure", slug: "mandatory-public-disclosure" },
  { name: "Affiliation and Recognition", slug: "affiliation-and-recognition" },
  { name: "Safety and Statutory Certificates", slug: "safety-certificates" },
  { name: "Academic Calendars", slug: "academic-calendars" },
  { name: "Fee Structures", slug: "fee-structures" },
  { name: "Board Results", slug: "board-results" },
  { name: "Policies", slug: "policies" },
  { name: "Circulars and Notices", slug: "circulars-and-notices" },
  { name: "Admission Documents", slug: "admission-documents" },
  { name: "Forms and Applications", slug: "forms-and-applications" },
  { name: "School Management Committee", slug: "school-management-committee" },
  { name: "Parent Teacher Association", slug: "parent-teacher-association" },
  { name: "Annual Reports", slug: "annual-reports" },
  { name: "Prescribed Books and Declarations", slug: "prescribed-books-and-declarations" },
  { name: "Prospectuses and Handbooks", slug: "prospectuses-and-handbooks" },
] as const;

const reviewDate = "2 August 2026";

function requiredDocument(input: {
  id: string;
  title: string;
  slug: string;
  categorySlug: string;
  row: number;
  authority: string;
  note: string;
}): PublicDocument {
  return {
    id: input.id,
    title: input.title,
    slug: input.slug,
    categorySlug: input.categorySlug,
    academicYear: null,
    publicationYear: null,
    institution: "SSKEMS CBSE School",
    issuingAuthority: input.authority,
    issueDate: null,
    expiryDate: null,
    status: "action-required",
    language: "English",
    lastReviewed: reviewDate,
    mandatoryDisclosure: true,
    appendixSection: "B",
    appendixRow: input.row,
    publicNote: input.note,
    currentVersion: null,
    versions: [],
  };
}

const mandatoryDocumentRequirements: PublicDocument[] = [
  requiredDocument({
    id: "mpd-b-1",
    title: "Affiliation/upgradation letter and latest extension",
    slug: "affiliation-upgradation-and-extension-letter",
    categorySlug: "affiliation-and-recognition",
    row: 1,
    authority: "Central Board of Secondary Education",
    note: "The current approved extension letter must be reconciled with the public affiliation period before a PDF is enabled.",
  }),
  requiredDocument({
    id: "mpd-b-2",
    title: "Society, trust or company registration and renewal",
    slug: "trust-registration-and-renewal",
    categorySlug: "affiliation-and-recognition",
    row: 2,
    authority: "Issuing authority awaiting record review",
    note: "A current, public-safe and self-attested copy has not yet been approved for this rebuild.",
  }),
  requiredDocument({
    id: "mpd-b-3",
    title: "State NOC, where applicable",
    slug: "state-no-objection-certificate",
    categorySlug: "affiliation-and-recognition",
    row: 3,
    authority: "Government of Maharashtra",
    note: "Applicability and the current approved public copy require compliance review.",
  }),
  requiredDocument({
    id: "mpd-b-4",
    title: "RTE recognition certificate and renewal",
    slug: "rte-recognition-certificate",
    categorySlug: "affiliation-and-recognition",
    row: 4,
    authority: "Education authority awaiting record review",
    note: "Issue, renewal and expiry metadata must be verified from the signed certificate.",
  }),
  requiredDocument({
    id: "mpd-b-5",
    title: "Valid building-safety certificate",
    slug: "building-safety-certificate",
    categorySlug: "safety-certificates",
    row: 5,
    authority: "Competent authority awaiting record review",
    note: "No certificate is labelled current until the issuing authority, issue date and validity are checked.",
  }),
  requiredDocument({
    id: "mpd-b-6",
    title: "Valid fire-safety certificate",
    slug: "fire-safety-certificate",
    categorySlug: "safety-certificates",
    row: 6,
    authority: "Fire authority awaiting record review",
    note: "The current public copy and renewal status require compliance approval.",
  }),
  requiredDocument({
    id: "mpd-b-7",
    title: "DEO certificate or school self-certification",
    slug: "deo-certificate-or-self-certification",
    categorySlug: "mandatory-public-disclosure",
    row: 7,
    authority: "District Education Officer or authorised school signatory",
    note: "The applicable approved instrument has not yet been supplied to the rebuild.",
  }),
  requiredDocument({
    id: "mpd-b-8",
    title: "Drinking-water, health, sanitation and water-testing documents",
    slug: "water-health-sanitation-certificates",
    categorySlug: "safety-certificates",
    row: 8,
    authority: "Relevant health, sanitation and testing authorities",
    note: "This Appendix IX row may contain several approved PDFs while remaining one disclosure row.",
  }),
];

const academicRequirements: PublicDocument[] = [
  requiredDocument({ id: "mpd-c-1", title: "Current fee structure", slug: "current-fee-structure", categorySlug: "fee-structures", row: 1, authority: "SSKEMS authorised approver", note: "Academic year, approving authority and effective date are awaiting confirmation." }),
  requiredDocument({ id: "mpd-c-2", title: "Annual academic calendar", slug: "annual-academic-calendar", categorySlug: "academic-calendars", row: 2, authority: "SSKEMS academic office", note: "The current approved academic calendar has not yet been supplied." }),
  requiredDocument({ id: "mpd-c-3", title: "School Management Committee", slug: "school-management-committee-list", categorySlug: "school-management-committee", row: 3, authority: "SSKEMS authorised approver", note: "The public list must be current and must exclude unnecessary personal addresses." }),
  requiredDocument({ id: "mpd-c-4", title: "Parent Teacher Association", slug: "parent-teacher-association-list", categorySlug: "parent-teacher-association", row: 4, authority: "SSKEMS authorised approver", note: "The current approved public list has not yet been supplied." }),
].map((document) => ({ ...document, appendixSection: "C" as const }));

const publicationIndex = createPublicDocumentPublicationIndex();

function readableDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${day} ${months[month - 1]} ${year}`;
}

function readableFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function activateApprovedVersion(document: PublicDocument): PublicDocument {
  const binding = publicationIndex.get(document.id as PublicDocumentId);
  if (!binding) return document;
  const version: PublicDocumentVersion = {
    label: binding.metadata.label,
    revisionDate: readableDate(binding.metadata.issueDate),
    status: binding.metadata.status,
    publicUrl: publicDocumentUrl(binding),
    fileName: binding.publicFilename,
    fileType: "PDF",
    fileSize: readableFileSize(binding.bytes),
    accessibilityStatus: binding.accessibilityStatus,
  };
  return {
    ...document,
    academicYear: binding.metadata.academicYear,
    publicationYear: binding.metadata.publicationYear,
    issuingAuthority: binding.metadata.issuingAuthority,
    issueDate: readableDate(binding.metadata.issueDate),
    expiryDate: binding.metadata.expiryDate ? readableDate(binding.metadata.expiryDate) : null,
    status: binding.metadata.status,
    language: binding.metadata.language,
    lastReviewed: readableDate(binding.publishedOn),
    publicNote: binding.metadata.publicNote,
    currentVersion: version,
    versions: [version],
  };
}

export const mandatoryDocuments: PublicDocument[] = mandatoryDocumentRequirements.map(activateApprovedVersion);
export const publicDocuments: PublicDocument[] = [...mandatoryDocuments, ...academicRequirements.map(activateApprovedVersion)];

export const documentStatusLabels: Record<PublicDocumentStatus, string> = {
  current: "Current",
  "expiring-soon": "Expiring soon",
  expired: "Expired",
  superseded: "Superseded",
  "not-applicable": "Not applicable",
  "pending-renewal": "Pending renewal",
  "action-required": "Compliance action required",
};

export function categoryBySlug(slug: string) {
  return documentCategories.find((category) => category.slug === slug);
}

export function documentBySlug(slug: string) {
  return publicDocuments.find((document) => document.slug === slug);
}
