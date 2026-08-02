import type { AdmissionClassOption } from "@/app/data/admissions";

export type AgeRuleRecord = {
  academicYear: string;
  cutoffDate: string | null;
  minimumAgeYears?: number | null;
  minimumAgeMonths?: number | null;
  maximumAgeYears?: number | null;
  governmentOrderReference: string | null;
  governmentOrderDocumentId: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
};

export type AgeEligibilityResult = {
  code: "appears-eligible" | "too-young" | "manual-review" | "prior-class-required";
  title:
    | "Appears age-eligible"
    | "Too young under the current rule"
    | "Requires manual review"
    | "Age-eligible, but previous-class eligibility is also required";
  message: string;
};

const completeRuleFields: (keyof AgeRuleRecord)[] = [
  "cutoffDate",
  "governmentOrderReference",
  "governmentOrderDocumentId",
  "verifiedBy",
  "verifiedAt",
];

export function isAgeRulePublishable(rule: AgeRuleRecord) {
  return completeRuleFields.every((field) => Boolean(rule[field]));
}

function ageInMonthsOn(dateOfBirth: Date, cutoff: Date) {
  let months = (cutoff.getUTCFullYear() - dateOfBirth.getUTCFullYear()) * 12;
  months += cutoff.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (cutoff.getUTCDate() < dateOfBirth.getUTCDate()) months -= 1;
  return months;
}

export function evaluateAgeEligibility({
  dateOfBirth,
  rule,
  classOption,
}: {
  dateOfBirth: string;
  rule: AgeRuleRecord;
  classOption?: AdmissionClassOption;
}): AgeEligibilityResult {
  if (!dateOfBirth || !classOption || !isAgeRulePublishable(rule)) {
    return {
      code: "manual-review",
      title: "Requires manual review",
      message:
        "The current Maharashtra cut-off date and source order have not yet been approved in the admissions register. Please ask the school to check the child’s details against the official rule.",
    };
  }

  if (classOption.pathway !== "standard") {
    return {
      code: "manual-review",
      title: "Requires manual review",
      message:
        "This class uses a special transfer or programme review. Age alone cannot establish eligibility.",
    };
  }

  const dob = new Date(`${dateOfBirth}T00:00:00.000Z`);
  const cutoff = new Date(`${rule.cutoffDate}T00:00:00.000Z`);
  if (Number.isNaN(dob.getTime()) || Number.isNaN(cutoff.getTime())) {
    return {
      code: "manual-review",
      title: "Requires manual review",
      message: "The supplied date could not be checked. Confirm the date of birth with the admissions office.",
    };
  }

  const minimumMonths = (rule.minimumAgeYears ?? 0) * 12 + (rule.minimumAgeMonths ?? 0);
  const maximumMonths = rule.maximumAgeYears == null ? null : rule.maximumAgeYears * 12;
  const ageMonths = ageInMonthsOn(dob, cutoff);

  if (minimumMonths && ageMonths < minimumMonths) {
    return {
      code: "too-young",
      title: "Too young under the current rule",
      message: "The child does not meet the configured minimum age on the official cut-off date.",
    };
  }

  if (maximumMonths != null && ageMonths > maximumMonths) {
    return {
      code: "manual-review",
      title: "Requires manual review",
      message: "The configured rule requires an authorised review of this age result.",
    };
  }

  if (!classOption.value.match(/^(nursery|junior-kg|senior-kg|class-1)$/)) {
    return {
      code: "prior-class-required",
      title: "Age-eligible, but previous-class eligibility is also required",
      message: "The school must verify the child’s completed class, previous school and applicable transfer rule.",
    };
  }

  return {
    code: "appears-eligible",
    title: "Appears age-eligible",
    message: "This result is eligibility guidance only. Availability, documents and the full admission review still apply.",
  };
}

export const prohibitedEnquiryFields = [
  "aadhaar",
  "birthCertificate",
  "casteCertificate",
  "incomeCertificate",
  "detailedMedicalHistory",
  "previousMarksheets",
  "parentOccupationDocuments",
  "bankDetails",
] as const;

export const parentFacingStatuses = {
  draft: "Application not yet submitted",
  submitted: "Application received",
  documents_pending: "Additional documents required",
  under_review: "Eligibility and documents being reviewed",
  visit_scheduled: "School visit scheduled",
  decision_pending: "Review in progress",
  waitlisted: "Currently on waiting list",
  provisional_offer: "Admission offered subject to conditions",
  fee_pending: "Awaiting admission-fee completion",
  admitted: "Admission confirmed",
  closed: "Application closed",
} as const;

export function parentFacingStatus(status: string) {
  return parentFacingStatuses[status as keyof typeof parentFacingStatuses] ?? "Review in progress";
}

export function requiresSpecialAdmissionReview(classValue: string, submittedOn?: string) {
  if (["class-10", "class-12"].includes(classValue)) return true;
  if (!submittedOn || !["class-9", "class-10", "class-11", "class-12"].includes(classValue)) return false;
  const submitted = new Date(`${submittedOn}T00:00:00.000Z`);
  return submitted.getUTCMonth() > 7 || (submitted.getUTCMonth() === 7 && submitted.getUTCDate() > 31);
}
