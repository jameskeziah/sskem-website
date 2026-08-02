export const allowedAccessibilityStatuses = [
  "tagged-and-accessible",
  "text-readable",
  "scanned-partially-readable",
  "remediation-required",
] as const;

export type PublicationCandidate = {
  id: string;
  publicTitle: string;
  categorySlug: string;
  issueDate: string | null;
  expiryDate: string | null;
  isRenewable: boolean;
  isMandatoryDisclosure: boolean;
  appendixSection: string | null;
  appendixRow: number | null;
  replacementDocumentId: string | null;
  status: string;
};

export type VersionCandidate = {
  fileName: string;
  mimeType: string;
  extension: string;
  passwordProtected: boolean;
  malwareScanPassed: boolean;
  embeddedScriptsDetected: boolean;
  privacyReviewPassed: boolean;
  redactionStatus: string;
  accessibilityStatus: (typeof allowedAccessibilityStatuses)[number];
  approvedBy: string | null;
  approvedAt: string | null;
  uploaderId: string;
};

export type PublicationIssue = {
  code: string;
  message: string;
};

const genericFileNamePattern = /(?:^|[-_\s])(scan|document|new\d*|final(?:[-_\s]*final)+)(?:[-_\s.]|$)/i;

export function calculatePassPercentage(registered: number, passed: number) {
  if (!Number.isInteger(registered) || registered < 0) {
    throw new Error("Registered students must be a non-negative whole number.");
  }
  if (!Number.isInteger(passed) || passed < 0) {
    throw new Error("Passed students must be a non-negative whole number.");
  }
  if (passed > registered) {
    throw new Error("Passed students cannot exceed registered students.");
  }
  if (registered === 0) return 0;
  return Math.round((passed / registered) * 10_000) / 100;
}

export function hasCircularReplacement(
  candidateId: string,
  replacementDocumentId: string | null,
  documents: Pick<PublicationCandidate, "id" | "replacementDocumentId">[],
) {
  let cursor = replacementDocumentId;
  const visited = new Set<string>([candidateId]);
  while (cursor) {
    if (visited.has(cursor)) return true;
    visited.add(cursor);
    cursor = documents.find((document) => document.id === cursor)?.replacementDocumentId ?? null;
  }
  return false;
}

export function validatePublication(
  document: PublicationCandidate,
  version: VersionCandidate,
  allDocuments: PublicationCandidate[],
) {
  const issues: PublicationIssue[] = [];
  const add = (code: string, message: string) => issues.push({ code, message });

  if (!document.publicTitle.trim()) add("missing-title", "A public title is required.");
  if (!document.categorySlug.trim()) add("missing-category", "A controlled document category is required.");
  if (document.isMandatoryDisclosure && !document.issueDate) add("missing-issue-date", "A mandatory document requires an issue date.");
  if (document.isRenewable && !document.expiryDate) add("missing-expiry-date", "A renewable certificate requires an expiry date.");
  if (version.mimeType !== "application/pdf" || version.extension.toLowerCase() !== ".pdf") add("invalid-file-type", "The public file must be a verified PDF.");
  if (version.passwordProtected) add("password-protected", "Password-protected PDFs cannot be published.");
  if (!version.malwareScanPassed) add("malware-scan", "A passing malware scan is required.");
  if (version.embeddedScriptsDetected) add("embedded-script", "PDFs containing embedded scripts cannot be published.");
  if (!version.privacyReviewPassed || version.redactionStatus === "review-required") add("privacy-review", "The public copy requires a completed personal-data and redaction review.");
  if (!version.approvedBy || !version.approvedAt) add("missing-approval", "An authorised approval is required.");
  if (version.approvedBy && version.approvedBy === version.uploaderId) add("separation-of-duties", "The uploader cannot approve the same version without a recorded exception.");
  if (genericFileNamePattern.test(version.fileName)) add("generic-file-name", "Use a stable, descriptive public filename.");

  if (document.isMandatoryDisclosure && document.appendixSection && document.appendixRow !== null) {
    const duplicate = allDocuments.some((other) =>
      other.id !== document.id &&
      other.isMandatoryDisclosure &&
      other.appendixSection === document.appendixSection &&
      other.appendixRow === document.appendixRow,
    );
    if (duplicate) add("duplicate-appendix-row", "The Appendix IX position is already assigned.");
  }

  if (hasCircularReplacement(document.id, document.replacementDocumentId, allDocuments)) {
    add("circular-replacement", "The replacement relationship creates a circular reference.");
  }

  return issues;
}

export function validateBoardResult(input: {
  classLevel: "X" | "XII";
  academicYear: string;
  registered: number;
  passed: number;
  suppliedPercentage: number;
  remarks: string;
  existing: Array<{ classLevel: string; academicYear: string }>;
}) {
  const issues: PublicationIssue[] = [];
  let calculated = 0;
  try {
    calculated = calculatePassPercentage(input.registered, input.passed);
  } catch (error) {
    issues.push({ code: "invalid-counts", message: error instanceof Error ? error.message : "Invalid result counts." });
  }
  if (Math.abs(calculated - input.suppliedPercentage) > 0.01) {
    issues.push({ code: "percentage-mismatch", message: "Pass percentage must match the registered and passed counts." });
  }
  if (input.existing.some((row) => row.classLevel === input.classLevel && row.academicYear === input.academicYear)) {
    issues.push({ code: "duplicate-result", message: "The class and academic year already exist." });
  }
  if (input.registered === 0 && !input.remarks.trim()) {
    issues.push({ code: "missing-zero-result-remarks", message: "A zero or non-applicable result requires remarks." });
  }
  return issues;
}
