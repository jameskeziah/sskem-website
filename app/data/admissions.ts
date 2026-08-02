export type AdmissionClassOption = {
  value: string;
  label: string;
  pathway: "standard" | "special-review" | "state-process-review";
};

export const admissionsCycle = {
  academicYear: "2026–27",
  institution: "SSKEMS CBSE School",
  publicStatus: "Availability awaiting school approval",
  publicMessage:
    "Class-wise openings, closing dates and seat availability have not yet been approved for publication. Families can still use the school contact channels for current guidance.",
  verifiedAt: null,
} as const;

export const admissionsActions = [
  {
    label: "Make an Enquiry",
    href: "/admissions/enquire",
    description: "Ask a short question without uploading documents.",
  },
  {
    label: "Start an Application",
    href: "/admissions/apply",
    description: "Review the formal application journey and readiness status.",
  },
  {
    label: "Check Application Status",
    href: "/admissions/application-status",
    description: "See how secure parent tracking will work.",
  },
] as const;

export const admissionClassOptions: AdmissionClassOption[] = [
  { value: "nursery", label: "Nursery / Balvatika 1", pathway: "standard" },
  { value: "junior-kg", label: "Junior KG / Balvatika 2", pathway: "standard" },
  { value: "senior-kg", label: "Senior KG / Balvatika 3", pathway: "standard" },
  { value: "class-1", label: "Class I", pathway: "standard" },
  { value: "class-2", label: "Class II", pathway: "standard" },
  { value: "class-3", label: "Class III", pathway: "standard" },
  { value: "class-4", label: "Class IV", pathway: "standard" },
  { value: "class-5", label: "Class V", pathway: "standard" },
  { value: "class-6", label: "Class VI", pathway: "standard" },
  { value: "class-7", label: "Class VII", pathway: "standard" },
  { value: "class-8", label: "Class VIII", pathway: "standard" },
  { value: "class-9", label: "Class IX", pathway: "special-review" },
  { value: "class-10", label: "Class X — restricted transfer review", pathway: "special-review" },
  { value: "class-11", label: "Class XI — programme confirmation required", pathway: "state-process-review" },
  { value: "class-12", label: "Class XII — restricted transfer review", pathway: "special-review" },
];

export const ageRule = {
  academicYear: admissionsCycle.academicYear,
  authority: "Government of Maharashtra",
  cutoffDate: null,
  governmentOrderReference: null,
  governmentOrderDocumentId: null,
  verifiedBy: null,
  verifiedAt: null,
  status: "verification-required",
} as const;

export const provisionalAgeBaselines = [
  { entryClass: "Nursery / Balvatika 1", minimumAge: "3 years" },
  { entryClass: "Junior KG / Balvatika 2", minimumAge: "4 years" },
  { entryClass: "Senior KG / Balvatika 3", minimumAge: "5 years" },
  { entryClass: "Class I", minimumAge: "6 years" },
] as const;

export const admissionsProcess = [
  {
    title: "Check eligibility",
    description:
      "Choose the academic year, institution and class, then review age, previous-class, availability and transfer requirements.",
  },
  {
    title: "Make an enquiry",
    description:
      "Send a short question about availability, fees, curriculum, transport, accessibility or the right next step.",
  },
  {
    title: "Speak with admissions or visit the school",
    description:
      "Request a callback, accessibility assistance or a school visit before committing to a formal application.",
  },
  {
    title: "Start the formal application",
    description:
      "Complete the staged application, review the information and provide a declaration when the secure service is active.",
  },
  {
    title: "Application review",
    description:
      "Authorised staff check age, class eligibility, previous school, required documents and available places.",
  },
  {
    title: "Interaction or orientation",
    description:
      "Any elementary-stage interaction must be non-selective and is not a selection test or parental screening interview.",
  },
  {
    title: "Provisional offer",
    description:
      "A parent receives the class, conditions, outstanding documents, approved fee schedule and response deadline.",
  },
  {
    title: "Admission confirmation",
    description:
      "Confirmation follows authorised approval, document verification and recording of any applicable fees and admission-register entry.",
  },
] as const;

export const admissionStatusExamples = [
  ["Started", "Application not yet submitted"],
  ["Submitted", "Application received"],
  ["Documents pending", "Additional documents required"],
  ["Under review", "Eligibility and documents being reviewed"],
  ["Visit scheduled", "School visit scheduled"],
  ["Decision pending", "Review in progress"],
  ["Waitlisted", "Currently on waiting list"],
  ["Provisional offer", "Admission offered subject to conditions"],
  ["Fee pending", "Awaiting admission-fee completion"],
  ["Admitted", "Admission confirmed"],
  ["Closed", "Application closed"],
] as const;

export const applicationSteps = [
  {
    title: "Application context",
    fields: "Academic year, institution, class, category, new admission or transfer, and current board",
  },
  {
    title: "Student information",
    fields: "Legal and preferred names, date of birth, address, current class and school",
  },
  {
    title: "Parents and guardians",
    fields: "Responsible adults, contact details, emergency contact and authorised pickup status",
  },
  {
    title: "Academic history",
    fields: "Previous school and board, completed class, subjects, languages and transfer reason",
  },
  {
    title: "Support and safety",
    fields: "Only the accessibility, learning, allergy, emergency and transport information needed for safe planning",
  },
  {
    title: "Documents",
    fields: "A conditional checklist; files remain private and are never placed in public media folders",
  },
  {
    title: "Declaration and review",
    fields: "Review every answer, read the privacy notice and confirm the submission declaration",
  },
] as const;

export const documentChecklist = [
  {
    title: "Age or birth evidence",
    note: "The permitted evidence must be confirmed for the selected class and category.",
  },
  { title: "Recent student photograph", note: "Requested only in the formal application, not at enquiry stage." },
  { title: "Address evidence", note: "The approved document types and recency rules still require school confirmation." },
  { title: "Previous report card", note: "Applicable to transfer and prior-class eligibility review." },
  { title: "Transfer certificate", note: "Required only where the applicable admission rule calls for it." },
  { title: "Board or migration documents", note: "Conditional for relevant board-change and senior-class cases." },
  { title: "Parent transfer order", note: "Conditional evidence for specified Class IX–XII transfer cases." },
] as const;

export const admissionsFaq = [
  {
    question: "Are applications for 2026–27 open?",
    answer:
      "The cycle is being prepared, but class-wise availability has not been approved for public display. Contact the admissions office for the current position.",
  },
  {
    question: "Does the age checker confirm admission?",
    answer:
      "No. It is an eligibility aid only. The current Maharashtra order, previous-class eligibility, documents and availability must also be checked.",
  },
  {
    question: "Should I upload certificates with an enquiry?",
    answer:
      "No. The enquiry is intentionally short and does not request certificates, marksheets, detailed medical records or bank information.",
  },
  {
    question: "Can I apply directly to Class X or XII?",
    answer:
      "These are not ordinary open-admission classes. Any permitted transfer requires restricted manual review under the applicable CBSE rules.",
  },
  {
    question: "Is the school form the official RTE 25% application?",
    answer:
      "No. Maharashtra RTE applications use the official state process. The school handles only authorised post-allotment verification.",
  },
  {
    question: "Can I complete the process in Marathi?",
    answer:
      "The production service is planned in English and Marathi. Approved Marathi form copy and end-to-end testing are still required before launch.",
  },
] as const;

export const admissionsSectionLinks = [
  { label: "Admissions overview", href: "/admissions" },
  { label: "Process", href: "/admissions/process" },
  { label: "Age criteria", href: "/admissions/age-criteria" },
  { label: "Documents required", href: "/admissions/documents-required" },
  { label: "Fees", href: "/admissions/fees" },
  { label: "Visit", href: "/admissions/visit" },
  { label: "FAQ", href: "/admissions/faq" },
  { label: "Contact", href: "/admissions/contact" },
] as const;

export const officialAdmissionsSources = {
  cbseDirectAdmission: "https://www.cbse.gov.in/cbsenew/admission.html",
  cbseExaminationByelaws: "https://www.cbse.gov.in/Byelawsenglish.pdf",
  cbseSaras: "https://saras.cbse.gov.in/SARAS/AffiliatedList/AfflicationDetails/1130851",
  ministryGradeOneAge: "https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1901251&lang=2&reg=48",
  maharashtraClassEleven: "https://mahafyjcadmissions.in/",
  maharashtraRte: "https://student.maharashtra.gov.in/adm_portal/Users/rte_index_new",
} as const;
