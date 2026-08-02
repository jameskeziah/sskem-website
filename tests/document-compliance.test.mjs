import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePassPercentage,
  hasCircularReplacement,
  validateBoardResult,
  validatePublication,
} from "../lib/document-compliance.ts";

test("calculates board-result percentages from approved counts", () => {
  assert.equal(calculatePassPercentage(40, 38), 95);
  assert.equal(calculatePassPercentage(0, 0), 0);
  assert.throws(() => calculatePassPercentage(20, 21), /cannot exceed/i);
});

test("blocks duplicate, inconsistent and unexplained board results", () => {
  const issues = validateBoardResult({
    classLevel: "X",
    academicYear: "2025–26",
    registered: 20,
    passed: 18,
    suppliedPercentage: 95,
    remarks: "",
    existing: [{ classLevel: "X", academicYear: "2025–26" }],
  });
  assert.deepEqual(issues.map((issue) => issue.code).sort(), ["duplicate-result", "percentage-mismatch"]);
});

test("detects circular document replacements", () => {
  assert.equal(hasCircularReplacement("a", "b", [
    { id: "a", replacementDocumentId: "b" },
    { id: "b", replacementDocumentId: "a" },
  ]), true);
});

test("publication validation blocks unsafe or unapproved PDFs", () => {
  const document = {
    id: "building-safety",
    publicTitle: "Building safety certificate",
    categorySlug: "safety-certificates",
    issueDate: null,
    expiryDate: null,
    isRenewable: true,
    isMandatoryDisclosure: true,
    appendixSection: "B",
    appendixRow: 5,
    replacementDocumentId: null,
    status: "draft",
  };
  const issues = validatePublication(document, {
    fileName: "scan-final-final.pdf",
    mimeType: "application/pdf",
    extension: ".pdf",
    passwordProtected: true,
    malwareScanPassed: false,
    embeddedScriptsDetected: true,
    privacyReviewPassed: false,
    redactionStatus: "review-required",
    accessibilityStatus: "remediation-required",
    approvedBy: null,
    approvedAt: null,
    uploaderId: "uploader-1",
  }, [document]);
  const codes = new Set(issues.map((issue) => issue.code));
  for (const code of [
    "missing-issue-date",
    "missing-expiry-date",
    "password-protected",
    "malware-scan",
    "embedded-script",
    "privacy-review",
    "missing-approval",
    "generic-file-name",
  ]) assert.ok(codes.has(code), `Expected ${code}`);
});

test("publication validation enforces separation of duties", () => {
  const document = {
    id: "affiliation",
    publicTitle: "Affiliation letter",
    categorySlug: "affiliation-and-recognition",
    issueDate: "2026-04-01",
    expiryDate: "2027-03-31",
    isRenewable: true,
    isMandatoryDisclosure: true,
    appendixSection: "B",
    appendixRow: 1,
    replacementDocumentId: null,
    status: "approved",
  };
  const issues = validatePublication(document, {
    fileName: "cbse-affiliation-extension-2026-2027.pdf",
    mimeType: "application/pdf",
    extension: ".pdf",
    passwordProtected: false,
    malwareScanPassed: true,
    embeddedScriptsDetected: false,
    privacyReviewPassed: true,
    redactionStatus: "approved",
    accessibilityStatus: "text-readable",
    approvedBy: "same-user",
    approvedAt: "2026-08-02T10:00:00Z",
    uploaderId: "same-user",
  }, [document]);
  assert.ok(issues.some((issue) => issue.code === "separation-of-duties"));
});
