import { mandatoryDocuments } from "./documents";
import { siteFacts } from "./site";

export type VerificationState = "verified" | "approval-required";

export type DisclosureFact = {
  label: string;
  value: string;
  state: VerificationState;
  note?: string;
};

export const disclosureReview = {
  reviewedOn: "2 August 2026",
  approvalState: "Compliance approval pending",
  reportEmail: siteFacts.principalEmail,
};

export const generalInformation: DisclosureFact[] = [
  { label: "School name", value: siteFacts.name, state: "verified" },
  { label: "CBSE affiliation number", value: siteFacts.affiliationNumber, state: "verified" },
  { label: "Affiliation validity", value: "1 April 2022–31 March 2027", state: "approval-required", note: "CBSE SARAS and the CBSE-issued upgradation letter agree; school approver sign-off is still required before public cutover." },
  { label: "School code", value: "30780", state: "verified", note: "Checked against the CBSE-issued upgradation letter." },
  { label: "Complete address", value: siteFacts.location, state: "approval-required", note: "Street-level wording and postal PIN require management approval." },
  { label: "Principal", value: "Official name reconciliation required", state: "approval-required", note: "The legacy school page and SARAS use different forms of the name." },
  { label: "Principal’s qualification", value: "M.Sc., M.Ed., Ph.D.", state: "verified", note: "Checked against the current CBSE SARAS record." },
  { label: "Official email", value: siteFacts.principalEmail, state: "verified" },
  { label: "Landline", value: siteFacts.phone, state: "verified" },
  { label: "Authorised public mobile", value: "Verification required", state: "approval-required" },
];

export const academicLinks = [
  { label: "Current fee structure", href: "/documents/current-fee-structure" },
  { label: "Annual academic calendar", href: "/documents/annual-academic-calendar" },
  { label: "School Management Committee", href: "/documents/school-management-committee-list" },
  { label: "Parent Teacher Association", href: "/documents/parent-teacher-association-list" },
] as const;

export const resultRows = ["2025–26", "2024–25", "2023–24"].flatMap((year) => [
  { classLevel: "Class X", year, registered: null, passed: null, percentage: null, remarks: "Approved result record required" },
  { classLevel: "Class XII", year, registered: null, passed: null, percentage: null, remarks: "Applicability and approved result record required" },
]);

export const teachingStaffSummary = [
  "Principal",
  "Vice-principal",
  "Headmaster or headmistress",
  "Total number of teachers",
  "PGT count",
  "TGT count",
  "PRT count",
  "Teacher–section ratio",
  "Special educator",
  "Counsellor and wellness teacher",
].map((label) => ({ label, value: "Approved staff record required", state: "approval-required" as const }));

export const infrastructureFacts = [
  { label: "Campus area", value: "Documentary and physical verification required", note: "The legacy page records 12,100 square metres; it is not carried forward as approved fact." },
  { label: "Classroom count and size", value: "Physical verification required", note: "The legacy room count must not be treated automatically as classroom count." },
  { label: "Laboratory count and size", value: "Physical verification required" },
  { label: "Computer-laboratory details", value: "Physical verification required" },
  { label: "Library count and size", value: "Physical verification required" },
  { label: "Internet availability", value: "Verification required" },
  { label: "Girls’ toilets", value: "Physical verification required" },
  { label: "Boys’ toilets", value: "Physical verification required" },
  { label: "CWSN-accessible toilets", value: "Accessibility verification required" },
  { label: "Permanent inspection-video link", value: "Approved permanent video required" },
];

export const appendixSections = [
  { id: "section-a", letter: "A", title: "General information" },
  { id: "section-b", letter: "B", title: "Documents and information", count: mandatoryDocuments.length },
  { id: "section-c", letter: "C", title: "Results and academics" },
  { id: "section-d", letter: "D", title: "Teaching staff" },
  { id: "section-e", letter: "E", title: "School infrastructure" },
] as const;
