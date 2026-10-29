import { mandatoryDocuments } from "./documents";
import {
  saras7GeneralInformation,
  saras7Infrastructure,
  saras7Results,
  saras7Source,
  saras7TeachingSummary,
} from "./saras7-disclosure";
import { siteFacts } from "./site";

export type VerificationState = "verified" | "approval-required";

export type DisclosureFact = {
  label: string;
  value: string;
  state: VerificationState;
  note?: string;
};

export const disclosureReview = {
  reviewedOn: saras7Source.receivedOn,
  approvalState: saras7Source.status,
  reportEmail: siteFacts.principalEmail,
};

const corroboratedFields = new Set(["Affiliation number", "School code", "School email"]);

export const generalInformation: DisclosureFact[] = saras7GeneralInformation.map((entry) => ({
  label: entry.label,
  value: entry.value,
  state: corroboratedFields.has(entry.label) ? "verified" : "approval-required",
  note: entry.label === "Contact number"
    ? "The supplied SARAS PDF records 7219819805; existing SSKEMS site contact records use other numbers. Confirm the official disclosure contact before approval."
    : entry.label === "Principal name"
      ? "Section A uses the abbreviated name; Section F supplies the full name. Confirm the approved public spelling."
      : "Transcribed from the school-supplied SARAS 7.0 Appendix IX PDF. School approval still required.",
}));

export const academicLinks = [
  { label: "Current fee structure", href: "/documents/current-fee-structure" },
  { label: "Annual academic calendar", href: "/documents/annual-academic-calendar" },
  { label: "School Management Committee", href: "/documents/school-management-committee-list" },
  { label: "Parent Teacher Association", href: "/documents/parent-teacher-association-list" },
] as const;

export const resultRows = saras7Results.map((entry) => ({
  classLevel: entry.classLevel,
  year: entry.year,
  registered: entry.registered,
  passed: entry.passed,
  percentage: entry.reportedPercentage,
  remarks: "As reported in supplied SARAS 7.0 PDF; awaiting academic-office verification",
}));

export const teachingStaffSummary: DisclosureFact[] = saras7TeachingSummary.map((entry) => ({
  label: entry.label,
  value: entry.value,
  state: "approval-required" as const,
  note: entry.label === "PRT" ? "The detailed Section F list contains 13 PRT-labelled entries, not 15."
    : entry.label === "Counsellor and wellness teacher" ? "The detailed Section F list contains 3 WELLNESS TEACHER entries, not 2."
    : "Reported in SARAS 7.0 PDF; pending signed staffing reconciliation.",
}));

export const infrastructureFacts = [
  ...saras7Infrastructure.map((entry) => ({
    label: entry.label,
    value: entry.value,
    note: entry.label.includes("count and size")
      ? "Original PDF uses this combined notation. Whether 603 sq m means per room or total area is unspecified."
      : "Reported in school-supplied SARAS 7.0 PDF; physical and documentary verification pending.",
  })),
  {
    label: "CWSN-accessible toilets",
    value: "Not specified in supplied PDF",
    note: "An accessibility verification is required; no quantity has been inferred.",
  },
  {
    label: "Library count and size",
    value: "Not specified in supplied PDF",
    note: "Retained as a separate outstanding verification item.",
  },
] as const;

export const appendixSections = [
  { id: "section-a", letter: "A", title: "General information" },
  { id: "section-b", letter: "B", title: "Documents and information", count: mandatoryDocuments.length },
  { id: "section-c", letter: "C", title: "Results and academics" },
  { id: "section-d", letter: "D", title: "Teaching staff" },
  { id: "section-e", letter: "E", title: "School infrastructure" },
  { id: "section-f", letter: "F", title: "Teacher details" },
] as const;
