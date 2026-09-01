export const PROGRAMMES_CONTENT_PACKAGE_ID = "sskem-programmes-content-package";
export const PROGRAMMES_CONTENT_PACKAGE_CONFIRMATION = "confirm-management-approved-programmes-content-package";

export const institutionalModelValues = [
  "cbse-senior-secondary-only",
  "separate-junior-college-only",
  "both",
  "neither-current",
] as const;

export const examPreparationOperatorValues = [
  "not-offered",
  "cbse-school",
  "junior-college",
  "separate-institute",
  "external-partner",
] as const;

export const resultPublicationValues = [
  "no-results-published",
  "verified-results-approved",
] as const;

export const juniorCollegeNavigationValues = ["hidden", "primary", "secondary"] as const;
export const examPreparationNavigationValues = [
  "hidden",
  "primary",
  "secondary",
  "under-junior-college",
  "under-institute",
] as const;

export const programmeMediaRecordIds = [
  "media-campus-main",
  "media-campus-grounds",
  "media-xii-science-2025-26",
  "media-result-admissions-2025-26",
] as const;

export const programmeClaimRecordIds = [
  "claim-junior-college-status",
  "claim-xii-science-results-2025-26",
  "claim-engineering-medical-guidance",
] as const;

type InstitutionalModel = (typeof institutionalModelValues)[number];
type ExamPreparationOperator = (typeof examPreparationOperatorValues)[number];
type ResultPublication = (typeof resultPublicationValues)[number];
type JuniorCollegeNavigation = (typeof juniorCollegeNavigationValues)[number];
type ExamPreparationNavigation = (typeof examPreparationNavigationValues)[number];
type ProgrammeMediaRecordId = (typeof programmeMediaRecordIds)[number];

type ProgrammeDetailsInput = {
  officialName?: unknown;
  board?: unknown;
  affiliationOrRecognition?: unknown;
  classes?: unknown;
  streams?: unknown;
  subjects?: unknown;
  eligibility?: unknown;
  feeSummary?: unknown;
  admissionProcedure?: unknown;
  publicSummary?: unknown;
};

type ExamPreparationInput = {
  operator?: unknown;
  operatorName?: unknown;
  programmes?: unknown;
  studentGroups?: unknown;
  curriculum?: unknown;
  timetable?: unknown;
  facultySummary?: unknown;
  feeSummary?: unknown;
  facilitiesSummary?: unknown;
  resultsPublication?: unknown;
  verifiedResultsSummary?: unknown;
  publicSummary?: unknown;
};

export type ProgrammesContentPackageInput = {
  academicYear?: unknown;
  institutionalModel?: unknown;
  cbseSeniorSecondary?: ProgrammeDetailsInput;
  juniorCollege?: ProgrammeDetailsInput;
  examPreparation?: ExamPreparationInput;
  publication?: {
    juniorCollegeNavigation?: unknown;
    examPreparationNavigation?: unknown;
    approvedMediaRecordIds?: unknown;
    approvedPublicClaims?: unknown;
  };
  controlledEvidenceReferences?: unknown;
  approvedByRole?: unknown;
  approvedOn?: unknown;
  expiresOn?: unknown;
  managementConfirmation?: unknown;
};

const OPAQUE_REFERENCE = /^[A-Z0-9][A-Z0-9._/-]{2,79}$/;
const ROLE = /^[a-z][a-z0-9-]{2,63}$/;
const ACADEMIC_YEAR = /^(20\d{2})-(20\d{2})$/;

function requiredText(value: unknown, label: string, maximum = 2400) {
  if (typeof value !== "string" || value.trim().length < 2) throw new Error(`${label} is required.`);
  const normalized = value.trim().replace(/\r\n/g, "\n");
  if (normalized.length > maximum) throw new Error(`${label} is too long.`);
  return normalized;
}

function optionalText(value: unknown, label: string, maximum = 2400) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const normalized = value.trim().replace(/\r\n/g, "\n");
  if (normalized.length > maximum) throw new Error(`${label} is too long.`);
  return normalized;
}

function enumValue<T extends readonly string[]>(value: unknown, values: T, label: string): T[number] {
  if (typeof value !== "string" || !values.includes(value)) throw new Error(`${label} is required.`);
  return value as T[number];
}

function stringList(value: unknown, label: string, options: { minimum?: number; maximum?: number } = {}) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n|,/) : [];
  const normalized = source.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean);
  const unique = [...new Set(normalized)];
  if (unique.length !== normalized.length) throw new Error(`${label} must not contain duplicates.`);
  if (unique.some((item) => item.length > 180)) throw new Error(`${label} contains an item that is too long.`);
  if (unique.length < (options.minimum ?? 0)) throw new Error(`${label} requires at least ${options.minimum} item(s).`);
  if (unique.length > (options.maximum ?? 30)) throw new Error(`${label} contains too many items.`);
  return unique;
}

function evidenceReferences(value: unknown) {
  const references = stringList(value, "Controlled evidence references", { minimum: 2, maximum: 30 });
  for (const reference of references) {
    if (!OPAQUE_REFERENCE.test(reference)
      || /^(?:[A-Za-z]:[\\/]|file:|https?:|\\\\)/i.test(reference)
      || /(?:^|\/)\.\.?($|\/)/.test(reference)) {
      throw new Error("Controlled evidence references must be opaque IDs, never paths or URLs.");
    }
  }
  return references;
}

function validDate(value: unknown, label: string, required = true) {
  if (!required && (value === undefined || value === null || value === "")) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must be a valid date.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`${label} must be a valid date.`);
  return value;
}

function programmeDetails(input: ProgrammeDetailsInput | undefined, label: string) {
  return {
    officialName: requiredText(input?.officialName, `${label} official name`, 180),
    board: requiredText(input?.board, `${label} board`, 120),
    affiliationOrRecognition: requiredText(input?.affiliationOrRecognition, `${label} affiliation or recognition`, 240),
    classes: stringList(input?.classes, `${label} classes`, { minimum: 1, maximum: 4 }),
    streams: stringList(input?.streams, `${label} streams`, { minimum: 1, maximum: 8 }),
    subjects: stringList(input?.subjects, `${label} subjects`, { minimum: 1, maximum: 40 }),
    eligibility: requiredText(input?.eligibility, `${label} eligibility`),
    feeSummary: requiredText(input?.feeSummary, `${label} fee summary`),
    admissionProcedure: requiredText(input?.admissionProcedure, `${label} admission procedure`),
    publicSummary: requiredText(input?.publicSummary, `${label} public summary`),
  };
}

function includesCbseSeniorSecondary(model: InstitutionalModel) {
  return model === "cbse-senior-secondary-only" || model === "both";
}

function includesJuniorCollege(model: InstitutionalModel) {
  return model === "separate-junior-college-only" || model === "both";
}

function normalizedExamPreparation(input: ExamPreparationInput | undefined, model: InstitutionalModel) {
  const operator = enumValue(input?.operator, examPreparationOperatorValues, "JEE/NEET operating model") as ExamPreparationOperator;
  if (operator === "cbse-school" && !includesCbseSeniorSecondary(model)) {
    throw new Error("JEE/NEET cannot be assigned to the CBSE school when that pathway is not current.");
  }
  if (operator === "junior-college" && !includesJuniorCollege(model)) {
    throw new Error("JEE/NEET cannot be assigned to Junior College when that pathway is not current.");
  }
  if (operator === "not-offered") {
    return {
      operator,
      operatorName: "",
      programmes: [] as string[],
      studentGroups: [] as string[],
      curriculum: "",
      timetable: "",
      facultySummary: "",
      feeSummary: "",
      facilitiesSummary: "",
      resultsPublication: "no-results-published" as ResultPublication,
      verifiedResultsSummary: "",
      publicSummary: requiredText(input?.publicSummary, "JEE/NEET public summary"),
    };
  }
  const resultsPublication = enumValue(input?.resultsPublication, resultPublicationValues, "JEE/NEET results publication") as ResultPublication;
  const operatorName = operator === "cbse-school"
    ? optionalText(input?.operatorName, "JEE/NEET operator name", 180)
    : requiredText(input?.operatorName, "JEE/NEET operator name", 180);
  const verifiedResultsSummary = resultsPublication === "verified-results-approved"
    ? requiredText(input?.verifiedResultsSummary, "Verified JEE/NEET results summary")
    : "";
  return {
    operator,
    operatorName,
    programmes: stringList(input?.programmes, "JEE/NEET programmes", { minimum: 1, maximum: 8 }),
    studentGroups: stringList(input?.studentGroups, "JEE/NEET student groups", { minimum: 1, maximum: 12 }),
    curriculum: requiredText(input?.curriculum, "JEE/NEET curriculum"),
    timetable: requiredText(input?.timetable, "JEE/NEET timetable"),
    facultySummary: requiredText(input?.facultySummary, "JEE/NEET faculty summary"),
    feeSummary: requiredText(input?.feeSummary, "JEE/NEET fee summary"),
    facilitiesSummary: requiredText(input?.facilitiesSummary, "JEE/NEET facilities summary"),
    resultsPublication,
    verifiedResultsSummary,
    publicSummary: requiredText(input?.publicSummary, "JEE/NEET public summary"),
  };
}

export function createProgrammesContentPackage(options: {
  input: ProgrammesContentPackageInput;
  now?: Date | string | number;
}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  if (Number.isNaN(now.getTime())) throw new Error("Programmes content-package completion requires a valid time.");
  if (options.input.managementConfirmation !== PROGRAMMES_CONTENT_PACKAGE_CONFIRMATION) {
    throw new Error("Explicit management confirmation is required for the complete Programmes content package.");
  }

  const academicYear = requiredText(options.input.academicYear, "Academic year", 9);
  const yearMatch = academicYear.match(ACADEMIC_YEAR);
  if (!yearMatch || Number(yearMatch[2]) !== Number(yearMatch[1]) + 1) {
    throw new Error("Academic year must use a consecutive YYYY-YYYY range.");
  }
  const institutionalModel = enumValue(options.input.institutionalModel, institutionalModelValues, "Institutional model") as InstitutionalModel;
  const cbseSeniorSecondary = includesCbseSeniorSecondary(institutionalModel)
    ? programmeDetails(options.input.cbseSeniorSecondary, "CBSE Senior Secondary")
    : null;
  const juniorCollege = includesJuniorCollege(institutionalModel)
    ? programmeDetails(options.input.juniorCollege, "Junior College")
    : null;
  const examPreparation = normalizedExamPreparation(options.input.examPreparation, institutionalModel);

  const juniorCollegeNavigation = enumValue(
    options.input.publication?.juniorCollegeNavigation,
    juniorCollegeNavigationValues,
    "Junior College navigation placement",
  ) as JuniorCollegeNavigation;
  if (!includesJuniorCollege(institutionalModel) && juniorCollegeNavigation !== "hidden") {
    throw new Error("Junior College navigation must remain hidden when no separate Junior College is current.");
  }
  if (includesJuniorCollege(institutionalModel) && juniorCollegeNavigation === "hidden") {
    throw new Error("Choose a visible navigation placement for the approved Junior College pathway.");
  }

  const examPreparationNavigation = enumValue(
    options.input.publication?.examPreparationNavigation,
    examPreparationNavigationValues,
    "JEE/NEET navigation placement",
  ) as ExamPreparationNavigation;
  if (examPreparation.operator === "not-offered" && examPreparationNavigation !== "hidden") {
    throw new Error("JEE/NEET navigation must remain hidden when preparation is not offered.");
  }
  if (examPreparation.operator !== "not-offered" && examPreparationNavigation === "hidden") {
    throw new Error("Choose a visible navigation placement for the approved JEE/NEET offering.");
  }
  if (examPreparationNavigation === "under-junior-college" && !includesJuniorCollege(institutionalModel)) {
    throw new Error("JEE/NEET cannot be placed under Junior College when that pathway is not current.");
  }
  if (examPreparationNavigation === "under-institute"
    && !["separate-institute", "external-partner"].includes(examPreparation.operator)) {
    throw new Error("JEE/NEET can be placed under Institute only when a separate operator is confirmed.");
  }

  const selectedMedia = stringList(options.input.publication?.approvedMediaRecordIds, "Programme media records", { maximum: programmeMediaRecordIds.length });
  if (selectedMedia.some((recordId) => !programmeMediaRecordIds.includes(recordId as ProgrammeMediaRecordId))) {
    throw new Error("Programme media selection contains a non-canonical record.");
  }
  if (examPreparation.operator === "not-offered" && selectedMedia.includes("media-result-admissions-2025-26")) {
    throw new Error("The engineering and medical guidance artwork cannot be selected when JEE/NEET preparation is not offered.");
  }
  if (examPreparation.resultsPublication !== "verified-results-approved" && selectedMedia.includes("media-xii-science-2025-26")) {
    throw new Error("The XII Science results artwork requires an approved verified-results summary.");
  }

  const approvedPublicClaims = stringList(options.input.publication?.approvedPublicClaims, "Approved public claims", { minimum: 1, maximum: 20 });
  const controlledEvidenceReferences = evidenceReferences(options.input.controlledEvidenceReferences);
  const approvedByRole = requiredText(options.input.approvedByRole, "Approving role", 64);
  if (!ROLE.test(approvedByRole)) throw new Error("Approving role must be a role slug, never a person or email address.");
  const approvedOn = validDate(options.input.approvedOn, "Approval date") as string;
  const expiresOn = validDate(options.input.expiresOn, "Expiry date", false);
  const today = now.toISOString().slice(0, 10);
  if (approvedOn > today) throw new Error("Approval date cannot be in the future.");
  if (expiresOn !== null && expiresOn <= approvedOn) throw new Error("Expiry date must be after the approval date.");

  const generatedAt = now.toISOString();
  const contentPackage = {
    packageVersion: 1,
    packageId: PROGRAMMES_CONTENT_PACKAGE_ID,
    generatedAt,
    academicYear,
    institutionalModel,
    programmes: {
      cbseSeniorSecondary,
      juniorCollege,
      examPreparation,
    },
    publication: {
      routes: {
        cbseSeniorSecondary: "/school/academics",
        juniorCollege: "/junior-college",
        examPreparation: "/programmes/jee-neet",
      },
      navigation: {
        juniorCollege: juniorCollegeNavigation,
        examPreparation: examPreparationNavigation,
      },
      requestedMediaRecordIds: selectedMedia,
      approvedPublicClaims,
      relatedClaimRecordIds: [...programmeClaimRecordIds],
    },
    approval: {
      controlledEvidenceReferences,
      approvedByRole,
      approvedOn,
      expiresOn,
      confirmation: PROGRAMMES_CONTENT_PACKAGE_CONFIRMATION,
    },
    guardrails: {
      networkRequestPerformed: false,
      serverPersistencePerformed: false,
      repositoryWritePerformed: false,
      approvalManifestUpdated: false,
      publicContentPublished: false,
      navigationActivated: false,
      mediaApprovalGrantedByPackage: false,
      documentApprovalGrantedByPackage: false,
      privateEvidenceIncluded: false,
      approverIdentityIncluded: false,
    },
  } as const;

  return {
    filename: `sskem-programmes-content-package-${academicYear}-${generatedAt.slice(0, 10)}.json`,
    body: `${JSON.stringify(contentPackage, null, 2)}\n`,
    package: contentPackage,
    validation: {
      status: "ready-for-controlled-review-and-publication-planning",
      evidenceReferenceCount: controlledEvidenceReferences.length,
      publicClaimCount: approvedPublicClaims.length,
      requestedMediaCount: selectedMedia.length,
    },
  } as const;
}
