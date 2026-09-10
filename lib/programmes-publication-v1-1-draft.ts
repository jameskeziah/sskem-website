import {
  PROGRAMME_ID_BY_ROUTE,
  PROGRAMMES_PUBLICATION_ROUTES,
  type ProgrammesPublicationRoute,
} from "./programmes-publication-routes.ts";

export const PROGRAMMES_PUBLICATION_V11_DRAFT_VERSION = "1.1.0-draft";
export const PROGRAMMES_PUBLICATION_V11_DRAFT_PACKAGE_TYPE = "programmes-publication-draft-supplement";
export const PROGRAMMES_PUBLICATION_V1_SCHEMA_SHA256 = "6d5a72a61a06bfdec060b3fe4266dfc02b7940bd5de531296174b49dd4f04bd3";

export const PROGRAMMES_PUBLICATION_V11_DRAFT_COLLECTIONS = [
  {
    id: "publicDocuments",
    label: "Programme documents",
    purpose: "References guarded brochures, timetables, fee circulars and affiliation documents without granting file approval.",
  },
  {
    id: "admissionsActions",
    label: "Admissions CTA and contact",
    purpose: "Records approved action wording, a safe destination, a public contact route and the applicable admissions window.",
  },
  {
    id: "programmeGovernance",
    label: "Programme governance",
    purpose: "Assigns operation, enrolment, fee collection, teaching, coaching and certification responsibilities without inventing organisation relationships.",
  },
  {
    id: "organisationRelationships",
    label: "Institutional relationships",
    purpose: "States who operates or delivers a programme and binds that wording to claims and evidence.",
  },
  {
    id: "boardAndStatus",
    label: "Board and institutional status",
    purpose: "Makes board, affiliation, recognition or programme-approval status explicit rather than inferred.",
  },
  {
    id: "institutionalIdentifiers",
    label: "Institutional identifiers",
    purpose: "Keeps affiliation, school and UDISE identifiers separate, typed and evidence-bound.",
  },
  {
    id: "campusAvailability",
    label: "Campus and academic-year availability",
    purpose: "Records where and when a programme is actually available, including delivery, duration, batches and capacity.",
  },
] as const;

export type ProgrammesPublicationV11DraftCollectionId = (typeof PROGRAMMES_PUBLICATION_V11_DRAFT_COLLECTIONS)[number]["id"];

export type ProgrammesPublicationV11DraftIssue = Readonly<{
  code:
    | "INVALID_STRUCTURE"
    | "UNKNOWN_FIELD"
    | "INVALID_CONSTANT"
    | "BASE_CONTRACT_MISMATCH"
    | "INVALID_ACADEMIC_YEAR"
    | "INVALID_RECORD"
    | "DUPLICATE_ID"
    | "ROUTE_PROGRAMME_MISMATCH"
    | "UNSAFE_DESTINATION"
    | "INVALID_DATE_RANGE"
    | "UNCONFIRMED_FACT"
    | "MISSING_EVIDENCE"
    | "DOCUMENT_CATALOGUE_MISMATCH"
    | "PUBLICATION_STATUS_FORBIDDEN"
    | "INVALID_GUARDRAILS";
  path: string;
  message: string;
}>;

type JsonRecord = Record<string, unknown>;

const topLevelKeys = new Set([
  "schemaVersion",
  "packageType",
  "status",
  "basePackage",
  "academicYear",
  ...PROGRAMMES_PUBLICATION_V11_DRAFT_COLLECTIONS.map((collection) => collection.id),
  "guardrails",
]);
const basePackageKeys = new Set(["schemaVersion", "schemaSha256", "packageId", "packageSha256"]);
const guardrailKeys = new Set([
  "draftOnly",
  "v1SchemaModified",
  "approvalGranted",
  "approvalManifestUpdated",
  "publicContentPublished",
  "navigationActivated",
  "documentApprovalGranted",
  "schemaActivated",
  "deploymentPerformed",
  "privateEvidenceIncluded",
]);
const documentKeys = new Set([
  "id", "programmeId", "route", "kind", "catalogueStatus", "publicDocumentId", "pipelineRecordId",
  "evidenceIds", "claimIds", "reviewStatus",
]);
const admissionsKeys = new Set([
  "id", "programmeId", "route", "purpose", "label", "destination", "publicContactRoute", "windowState",
  "opensOn", "closesOn", "decisionBy", "evidenceIds", "claimIds", "factState", "reviewStatus",
]);
const programmeGovernanceKeys = new Set([
  "id", "programmeId", "route", "academicYear", "responsibilityType", "organisationId", "publicWording",
  "claimIds", "evidenceIds", "factState", "validFrom", "validUntil", "reviewStatus",
]);
const relationshipKeys = new Set([
  "id", "fromOrganisationId", "toOrganisationId", "programmeIds", "relationshipType", "publicWording",
  "termDecisions", "claimId", "evidenceIds", "factState", "validFrom", "validUntil", "reviewStatus",
]);
const relationshipTermDecisionKeys = new Set(["academicWing", "coachingWing", "partner", "integrated"]);
const boardStatusKeys = new Set([
  "id", "programmeId", "organisationId", "route", "boardType", "boardName", "institutionalStatus",
  "officialRecognisedInstitutionName", "publicStatusWording", "claimId", "evidenceIds", "factState", "validFrom", "validUntil",
  "reviewStatus",
]);
const institutionalIdentifierKeys = new Set([
  "id", "programmeId", "organisationId", "route", "identifierType", "publicValue", "claimId", "evidenceIds",
  "factState", "validFrom", "validUntil", "reviewStatus",
]);
const campusKeys = new Set([
  "id", "campusId", "programmeId", "route", "academicYear", "availability", "deliveryMode", "durationSummary",
  "batchCount", "intakeCapacity", "publicAvailabilityWording", "evidenceIds", "claimIds", "factState", "validFrom",
  "validUntil", "reviewStatus",
]);

const routeSet = new Set<string>(PROGRAMMES_PUBLICATION_ROUTES);
const programmeIds = new Set<string>(Object.values(PROGRAMME_ID_BY_ROUTE));
const programmeRoute = new Map<string, ProgrammesPublicationRoute>(
  Object.entries(PROGRAMME_ID_BY_ROUTE).map(([route, programmeId]) => [programmeId, route as ProgrammesPublicationRoute]),
);
const documentKinds = new Set(["brochure", "timetable", "fee-circular", "affiliation-document"]);
const catalogueStatuses = new Set(["registered", "catalogue-extension-required"]);
const reviewStatuses = new Set(["draft", "review-required", "withdrawn"]);
const factStates = new Set(["confirmed", "not-confirmed"]);
const admissionsPurposes = new Set(["admissions-enquiry", "application-guidance", "document-checklist", "visit-request"]);
const windowStates = new Set(["dated", "year-round", "not-confirmed"]);
const relationshipTypes = new Set(["operated-by", "delivered-by", "academic-partner", "part-of", "separate-institution", "no-current-relationship"]);
const responsibilityTypes = new Set(["official-operator", "student-enrolment", "fee-collection", "academic-delivery", "entrance-exam-coaching", "certification-or-awarding"]);
const termDecisions = new Set(["yes", "no", "not-confirmed"]);
const boardTypes = new Set(["cbse", "state-board", "other-approved-board", "not-confirmed"]);
const institutionalStatuses = new Set(["affiliated", "recognized", "programme-approved", "not-confirmed"]);
const identifierTypes = new Set(["affiliation-or-recognition-number", "institution-or-school-code", "udise-or-official-code"]);
const availabilityStates = new Set(["available", "not-available", "not-confirmed"]);
const deliveryModes = new Set(["on-campus", "hybrid", "online", "not-confirmed"]);
const idPattern = /^[A-Z][A-Z0-9-]{2,79}$/;
const documentReferenceIdPattern = /^DOCREF-[A-Z0-9-]{2,72}$/;
const ctaIdPattern = /^CTA-[A-Z0-9-]{2,75}$/;
const relationshipIdPattern = /^REL-[A-Z0-9-]{2,75}$/;
const governanceIdPattern = /^GOV-[A-Z0-9-]{2,75}$/;
const statusIdPattern = /^STATUS-[A-Z0-9-]{2,72}$/;
const identifierIdPattern = /^IDENT-[A-Z0-9-]{2,73}$/;
const campusAvailabilityIdPattern = /^CAMPUS-AVAIL-[A-Z0-9-]{2,66}$/;
const campusIdPattern = /^CMP-[A-Z0-9-]{2,75}$/;
const organisationIdPattern = /^ORG-[A-Z0-9-]{2,75}$/;
const publicDocumentIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pipelineRecordIdPattern = /^document-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const basePackageIdPattern = /^programmes-20\d{2}-20\d{2}-v[1-9]\d*$/;
const academicYearPattern = /^(20\d{2})-(20\d{2})$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as JsonRecord)) deepFreeze(child);
  }
  return value;
}

function exactKeys(value: unknown, allowed: ReadonlySet<string>, path: string, add: (issue: ProgrammesPublicationV11DraftIssue) => void) {
  if (!isRecord(value)) {
    add({ code: "INVALID_STRUCTURE", path, message: `${path} must be an object.` });
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) add({ code: "UNKNOWN_FIELD", path: `${path}.${key}`, message: `Unknown field ${key}.` });
  }
  for (const key of allowed) {
    if (!(key in value)) add({ code: "INVALID_STRUCTURE", path: `${path}.${key}`, message: `Required field ${key} is missing.` });
  }
  return true;
}

function validAcademicYear(value: unknown) {
  if (typeof value !== "string") return false;
  const match = academicYearPattern.exec(value);
  return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
}

function validDate(value: unknown) {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validNullableDate(value: unknown) {
  return value === null || validDate(value);
}

function validText(value: unknown, min: number, max: number) {
  return typeof value === "string" && value.trim() === value && value.length >= min && value.length <= max;
}

function validNullableText(value: unknown, min: number, max: number) {
  return value === null || validText(value, min, max);
}

function validIdList(value: unknown, minItems = 0) {
  return Array.isArray(value)
    && value.length >= minItems
    && value.length <= 30
    && value.every((item) => typeof item === "string" && idPattern.test(item))
    && new Set(value).size === value.length;
}

function validInternalPath(value: string) {
  return /^\/(?!\/)[a-z0-9]+(?:[\/_-][a-z0-9]+)*\/?$/.test(value) && !value.includes("..");
}

function validHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash;
  } catch {
    return false;
  }
}

function routeMatches(programmeId: unknown, route: unknown) {
  return typeof programmeId === "string"
    && programmeIds.has(programmeId)
    && typeof route === "string"
    && routeSet.has(route)
    && programmeRoute.get(programmeId) === route;
}

function validReviewStatus(value: unknown) {
  return typeof value === "string" && reviewStatuses.has(value);
}

function checkDates(record: JsonRecord, path: string, add: (issue: ProgrammesPublicationV11DraftIssue) => void) {
  if (!validNullableDate(record.validFrom) || !validNullableDate(record.validUntil)) {
    add({ code: "INVALID_RECORD", path, message: "Validity dates must be null or real YYYY-MM-DD dates." });
    return;
  }
  if (typeof record.validFrom === "string" && typeof record.validUntil === "string" && record.validFrom > record.validUntil) {
    add({ code: "INVALID_DATE_RANGE", path, message: "validFrom must not be later than validUntil." });
  }
}

function validateCollection(
  value: unknown,
  path: string,
  maxItems: number,
  validateRecord: (record: JsonRecord, recordPath: string, add: (issue: ProgrammesPublicationV11DraftIssue) => void) => void,
  add: (issue: ProgrammesPublicationV11DraftIssue) => void,
  seenIds: Set<string>,
) {
  if (!Array.isArray(value) || value.length > maxItems) {
    add({ code: "INVALID_STRUCTURE", path, message: `${path} must be an array containing at most ${maxItems} records.` });
    return;
  }
  value.forEach((candidate, index) => {
    const recordPath = `${path}[${index}]`;
    if (!isRecord(candidate)) {
      add({ code: "INVALID_RECORD", path: recordPath, message: "Each collection entry must be an object." });
      return;
    }
    validateRecord(candidate, recordPath, add);
    if (typeof candidate.id === "string") {
      if (seenIds.has(candidate.id)) add({ code: "DUPLICATE_ID", path: `${recordPath}.id`, message: `ID ${candidate.id} is duplicated.` });
      else seenIds.add(candidate.id);
    }
  });
}

function validateDocument(record: JsonRecord, path: string, add: (issue: ProgrammesPublicationV11DraftIssue) => void) {
  if (!exactKeys(record, documentKeys, path, add)) return;
  if (typeof record.id !== "string" || !documentReferenceIdPattern.test(record.id)
    || typeof record.kind !== "string" || !documentKinds.has(record.kind)
    || typeof record.catalogueStatus !== "string" || !catalogueStatuses.has(record.catalogueStatus)
    || !validIdList(record.evidenceIds) || !validIdList(record.claimIds) || !validReviewStatus(record.reviewStatus)) {
    add({ code: "INVALID_RECORD", path, message: "The document reference contains an invalid ID, enum, reference list or review status." });
  }
  if (!routeMatches(record.programmeId, record.route)) add({ code: "ROUTE_PROGRAMME_MISMATCH", path, message: "The document route does not match its programme ID." });
  const registered = record.catalogueStatus === "registered";
  const hasDocumentId = typeof record.publicDocumentId === "string" && publicDocumentIdPattern.test(record.publicDocumentId);
  const hasPipelineId = typeof record.pipelineRecordId === "string" && pipelineRecordIdPattern.test(record.pipelineRecordId);
  if ((registered && (!hasDocumentId || !hasPipelineId)) || (!registered && (record.publicDocumentId !== null || record.pipelineRecordId !== null))) {
    add({ code: "DOCUMENT_CATALOGUE_MISMATCH", path, message: "Registered documents require both guarded IDs; catalogue-extension-required records must keep both IDs null." });
  }
}

function validateAdmissions(record: JsonRecord, path: string, add: (issue: ProgrammesPublicationV11DraftIssue) => void) {
  if (!exactKeys(record, admissionsKeys, path, add)) return;
  if (typeof record.id !== "string" || !ctaIdPattern.test(record.id)
    || typeof record.purpose !== "string" || !admissionsPurposes.has(record.purpose)
    || !validNullableText(record.label, 2, 80)
    || typeof record.windowState !== "string" || !windowStates.has(record.windowState)
    || !validNullableDate(record.opensOn) || !validNullableDate(record.closesOn) || !validNullableDate(record.decisionBy)
    || typeof record.factState !== "string" || !factStates.has(record.factState)
    || !validIdList(record.evidenceIds) || !validIdList(record.claimIds) || !validReviewStatus(record.reviewStatus)) {
    add({ code: "INVALID_RECORD", path, message: "The admissions action contains an invalid field, enum, date, reference list or review status." });
  }
  if (!routeMatches(record.programmeId, record.route)) add({ code: "ROUTE_PROGRAMME_MISMATCH", path, message: "The admissions route does not match its programme ID." });
  const destinationSafe = record.destination === null
    || (typeof record.destination === "string" && (validInternalPath(record.destination) || validHttpsUrl(record.destination)));
  const contactSafe = record.publicContactRoute === null
    || (typeof record.publicContactRoute === "string" && validInternalPath(record.publicContactRoute));
  if (!destinationSafe || !contactSafe) add({ code: "UNSAFE_DESTINATION", path, message: "Use an internal public route or HTTPS destination; contact must be an internal public route." });
  if (record.windowState === "dated") {
    if (!validDate(record.opensOn) || !validDate(record.closesOn)) add({ code: "INVALID_DATE_RANGE", path, message: "A dated admissions window requires opening and closing dates." });
    else if (String(record.opensOn) > String(record.closesOn)) add({ code: "INVALID_DATE_RANGE", path, message: "Admissions opening date must not be later than closing date." });
  } else if (record.windowState === "year-round" && (record.opensOn !== null || record.closesOn !== null)) {
    add({ code: "INVALID_DATE_RANGE", path, message: "Year-round admissions must not carry an artificial opening or closing date." });
  }
  if (record.factState === "confirmed" && (record.label === null || record.destination === null || record.publicContactRoute === null)) {
    add({ code: "UNCONFIRMED_FACT", path, message: "A confirmed admissions action requires its label, destination and public contact route." });
  }
  if (record.factState === "confirmed" && !validIdList(record.evidenceIds, 1)) add({ code: "MISSING_EVIDENCE", path, message: "A confirmed admissions action requires current evidence." });
}

function validateProgrammeGovernance(record: JsonRecord, path: string, add: (issue: ProgrammesPublicationV11DraftIssue) => void) {
  if (!exactKeys(record, programmeGovernanceKeys, path, add)) return;
  if (typeof record.id !== "string" || !governanceIdPattern.test(record.id)
    || !validAcademicYear(record.academicYear)
    || typeof record.responsibilityType !== "string" || !responsibilityTypes.has(record.responsibilityType)
    || typeof record.organisationId !== "string" || !organisationIdPattern.test(record.organisationId)
    || !validNullableText(record.publicWording, 2, 300)
    || !validIdList(record.claimIds) || !validIdList(record.evidenceIds)
    || typeof record.factState !== "string" || !factStates.has(record.factState)
    || !validReviewStatus(record.reviewStatus)) {
    add({ code: "INVALID_RECORD", path, message: "The governance record contains an invalid ID, year, responsibility, organisation, wording, references or status." });
  }
  if (!routeMatches(record.programmeId, record.route)) add({ code: "ROUTE_PROGRAMME_MISMATCH", path, message: "The governance route does not match its programme ID." });
  checkDates(record, path, add);
  if (record.factState === "confirmed" && !validIdList(record.evidenceIds, 1)) add({ code: "MISSING_EVIDENCE", path, message: "A confirmed governance responsibility requires current evidence." });
}

function validateRelationship(record: JsonRecord, path: string, add: (issue: ProgrammesPublicationV11DraftIssue) => void) {
  if (!exactKeys(record, relationshipKeys, path, add)) return;
  const termDecisionRecord = record.termDecisions;
  if (typeof record.id !== "string" || !relationshipIdPattern.test(record.id)
    || typeof record.fromOrganisationId !== "string" || !organisationIdPattern.test(record.fromOrganisationId)
    || typeof record.toOrganisationId !== "string" || !organisationIdPattern.test(record.toOrganisationId)
    || record.fromOrganisationId === record.toOrganisationId
    || !Array.isArray(record.programmeIds) || record.programmeIds.length < 1 || record.programmeIds.length > 3
    || record.programmeIds.some((id) => typeof id !== "string" || !programmeIds.has(id)) || new Set(record.programmeIds).size !== record.programmeIds.length
    || typeof record.relationshipType !== "string" || !relationshipTypes.has(record.relationshipType)
    || !validNullableText(record.publicWording, 2, 300)
    || !isRecord(termDecisionRecord)
    || (record.claimId !== null && (typeof record.claimId !== "string" || !idPattern.test(record.claimId)))
    || !validIdList(record.evidenceIds)
    || typeof record.factState !== "string" || !factStates.has(record.factState)
    || !validReviewStatus(record.reviewStatus)) {
    add({ code: "INVALID_RECORD", path, message: "The relationship contains an invalid organisation, programme, type, wording, term, claim or status." });
  }
  if (isRecord(termDecisionRecord)) {
    exactKeys(termDecisionRecord, relationshipTermDecisionKeys, `${path}.termDecisions`, add);
    if ([...relationshipTermDecisionKeys].some((key) => typeof termDecisionRecord[key] !== "string" || !termDecisions.has(String(termDecisionRecord[key])))) {
      add({ code: "INVALID_RECORD", path: `${path}.termDecisions`, message: "Every relationship term requires yes, no or not-confirmed." });
    }
  }
  checkDates(record, path, add);
  const noCurrentRelationship = record.relationshipType === "no-current-relationship";
  if (record.factState === "confirmed" && !noCurrentRelationship && (record.publicWording === null || record.claimId === null)) add({ code: "UNCONFIRMED_FACT", path, message: "A confirmed current relationship requires exact public wording and a claim ID." });
  if (record.factState === "confirmed" && noCurrentRelationship && (record.publicWording !== null || record.claimId !== null)) add({ code: "INVALID_RECORD", path, message: "A no-current-relationship restriction must not manufacture public relationship wording or a claim." });
  if (record.factState === "confirmed" && noCurrentRelationship && isRecord(termDecisionRecord)
    && [...relationshipTermDecisionKeys].some((key) => termDecisionRecord[key] !== "no")) {
    add({ code: "INVALID_RECORD", path: `${path}.termDecisions`, message: "A confirmed no-current-relationship decision requires every relationship term to remain prohibited." });
  }
  if (record.factState === "confirmed" && !validIdList(record.evidenceIds, 1)) add({ code: "MISSING_EVIDENCE", path, message: "A confirmed relationship requires current relationship evidence." });
  if (isRecord(termDecisionRecord) && termDecisionRecord.integrated === "yes" && (record.claimId === null || !validIdList(record.evidenceIds, 1))) {
    add({ code: "MISSING_EVIDENCE", path, message: "Use of integrated requires a claim ID and current relationship evidence." });
  }
}

function validateBoardStatus(record: JsonRecord, path: string, add: (issue: ProgrammesPublicationV11DraftIssue) => void) {
  if (!exactKeys(record, boardStatusKeys, path, add)) return;
  if (typeof record.id !== "string" || !statusIdPattern.test(record.id)
    || typeof record.organisationId !== "string" || !organisationIdPattern.test(record.organisationId)
    || typeof record.boardType !== "string" || !boardTypes.has(record.boardType)
    || !validNullableText(record.boardName, 2, 120)
    || typeof record.institutionalStatus !== "string" || !institutionalStatuses.has(record.institutionalStatus)
    || !validNullableText(record.officialRecognisedInstitutionName, 2, 180)
    || !validNullableText(record.publicStatusWording, 2, 300)
    || (record.claimId !== null && (typeof record.claimId !== "string" || !idPattern.test(record.claimId)))
    || !validIdList(record.evidenceIds)
    || typeof record.factState !== "string" || !factStates.has(record.factState)
    || !validReviewStatus(record.reviewStatus)) {
    add({ code: "INVALID_RECORD", path, message: "The board/status record contains an invalid ID, enum, wording, claim, evidence list or review status." });
  }
  if (!routeMatches(record.programmeId, record.route)) add({ code: "ROUTE_PROGRAMME_MISMATCH", path, message: "The board/status route does not match its programme ID." });
  checkDates(record, path, add);
  if (record.factState === "confirmed" && (record.boardType === "not-confirmed" || record.institutionalStatus === "not-confirmed" || record.boardName === null || record.officialRecognisedInstitutionName === null || record.publicStatusWording === null || record.claimId === null)) {
    add({ code: "UNCONFIRMED_FACT", path, message: "A confirmed board/status record requires the recognised institution name, board, status, exact public wording and a claim ID." });
  }
  if (record.factState === "confirmed" && !validIdList(record.evidenceIds, 1)) add({ code: "MISSING_EVIDENCE", path, message: "A confirmed board/status record requires current evidence." });
}

function validateInstitutionalIdentifier(record: JsonRecord, path: string, add: (issue: ProgrammesPublicationV11DraftIssue) => void) {
  if (!exactKeys(record, institutionalIdentifierKeys, path, add)) return;
  if (typeof record.id !== "string" || !identifierIdPattern.test(record.id)
    || typeof record.organisationId !== "string" || !organisationIdPattern.test(record.organisationId)
    || typeof record.identifierType !== "string" || !identifierTypes.has(record.identifierType)
    || !validNullableText(record.publicValue, 2, 80)
    || (record.claimId !== null && (typeof record.claimId !== "string" || !idPattern.test(record.claimId)))
    || !validIdList(record.evidenceIds)
    || typeof record.factState !== "string" || !factStates.has(record.factState)
    || !validReviewStatus(record.reviewStatus)) {
    add({ code: "INVALID_RECORD", path, message: "The institutional identifier contains an invalid ID, organisation, type, public value, claim, evidence list or status." });
  }
  if (!routeMatches(record.programmeId, record.route)) add({ code: "ROUTE_PROGRAMME_MISMATCH", path, message: "The identifier route does not match its programme ID." });
  checkDates(record, path, add);
  if (record.factState === "confirmed" && (record.publicValue === null || record.claimId === null)) add({ code: "UNCONFIRMED_FACT", path, message: "A confirmed institutional identifier requires its exact public value and a claim ID." });
  if (record.factState === "confirmed" && !validIdList(record.evidenceIds, 1)) add({ code: "MISSING_EVIDENCE", path, message: "A confirmed institutional identifier requires current evidence." });
}

function validateCampus(record: JsonRecord, path: string, add: (issue: ProgrammesPublicationV11DraftIssue) => void) {
  if (!exactKeys(record, campusKeys, path, add)) return;
  if (typeof record.id !== "string" || !campusAvailabilityIdPattern.test(record.id)
    || typeof record.campusId !== "string" || !campusIdPattern.test(record.campusId)
    || !validAcademicYear(record.academicYear)
    || typeof record.availability !== "string" || !availabilityStates.has(record.availability)
    || typeof record.deliveryMode !== "string" || !deliveryModes.has(record.deliveryMode)
    || !validNullableText(record.durationSummary, 2, 120)
    || (record.batchCount !== null && (!Number.isInteger(record.batchCount) || Number(record.batchCount) < 0 || Number(record.batchCount) > 100))
    || (record.intakeCapacity !== null && (!Number.isInteger(record.intakeCapacity) || Number(record.intakeCapacity) < 0 || Number(record.intakeCapacity) > 10000))
    || !validNullableText(record.publicAvailabilityWording, 2, 300)
    || !validIdList(record.evidenceIds) || !validIdList(record.claimIds)
    || typeof record.factState !== "string" || !factStates.has(record.factState)
    || !validReviewStatus(record.reviewStatus)) {
    add({ code: "INVALID_RECORD", path, message: "The campus availability record contains an invalid campus, year, enum, capacity, reference list or status." });
  }
  if (!routeMatches(record.programmeId, record.route)) add({ code: "ROUTE_PROGRAMME_MISMATCH", path, message: "The campus route does not match its programme ID." });
  checkDates(record, path, add);
  if (record.factState === "confirmed" && (record.availability === "not-confirmed" || record.deliveryMode === "not-confirmed" || record.publicAvailabilityWording === null)) {
    add({ code: "UNCONFIRMED_FACT", path, message: "Confirmed campus availability requires an availability decision, delivery mode and public wording." });
  }
  if (record.factState === "confirmed" && !validIdList(record.evidenceIds, 1)) add({ code: "MISSING_EVIDENCE", path, message: "Confirmed campus availability requires current evidence." });
}

export function validateProgrammesPublicationV11DraftSupplement(value: unknown) {
  const issues: ProgrammesPublicationV11DraftIssue[] = [];
  const add = (issue: ProgrammesPublicationV11DraftIssue) => issues.push(Object.freeze(issue));

  if (!exactKeys(value, topLevelKeys, "package", add)) {
    return deepFreeze({ valid: false as const, status: "draft-only" as const, publicationAuthorized: false as const, issues });
  }
  const packageData = value as JsonRecord;
  if (packageData.schemaVersion !== PROGRAMMES_PUBLICATION_V11_DRAFT_VERSION
    || packageData.packageType !== PROGRAMMES_PUBLICATION_V11_DRAFT_PACKAGE_TYPE
    || packageData.status !== "draft-not-activated") {
    add({ code: "INVALID_CONSTANT", path: "package", message: "The draft version, package type and non-activated status are fixed." });
  }
  if (!validAcademicYear(packageData.academicYear)) add({ code: "INVALID_ACADEMIC_YEAR", path: "package.academicYear", message: "Use a consecutive YYYY-YYYY academic year." });

  if (exactKeys(packageData.basePackage, basePackageKeys, "package.basePackage", add)) {
    const base = packageData.basePackage as JsonRecord;
    if (base.schemaVersion !== "1.0.0"
      || base.schemaSha256 !== PROGRAMMES_PUBLICATION_V1_SCHEMA_SHA256
      || typeof base.packageId !== "string" || !basePackageIdPattern.test(base.packageId)
      || typeof base.packageSha256 !== "string" || !sha256Pattern.test(base.packageSha256)) {
      add({ code: "BASE_CONTRACT_MISMATCH", path: "package.basePackage", message: "The supplement must bind an exact v1.0 package and the frozen v1.0 schema digest." });
    }
  }

  const seenIds = new Set<string>();
  validateCollection(packageData.publicDocuments, "package.publicDocuments", 36, validateDocument, add, seenIds);
  validateCollection(packageData.admissionsActions, "package.admissionsActions", 12, validateAdmissions, add, seenIds);
  validateCollection(packageData.programmeGovernance, "package.programmeGovernance", 36, validateProgrammeGovernance, add, seenIds);
  validateCollection(packageData.organisationRelationships, "package.organisationRelationships", 12, validateRelationship, add, seenIds);
  validateCollection(packageData.boardAndStatus, "package.boardAndStatus", 12, validateBoardStatus, add, seenIds);
  validateCollection(packageData.institutionalIdentifiers, "package.institutionalIdentifiers", 36, validateInstitutionalIdentifier, add, seenIds);
  validateCollection(packageData.campusAvailability, "package.campusAvailability", 36, validateCampus, add, seenIds);

  for (const collectionId of ["programmeGovernance", "campusAvailability"] as const) {
    const records = packageData[collectionId];
    if (!Array.isArray(records)) continue;
    records.forEach((record, index) => {
      if (isRecord(record) && record.academicYear !== packageData.academicYear) {
        add({ code: "INVALID_ACADEMIC_YEAR", path: `package.${collectionId}[${index}].academicYear`, message: "The record academic year must match the supplement academic year." });
      }
    });
  }

  if (exactKeys(packageData.guardrails, guardrailKeys, "package.guardrails", add)) {
    const guardrails = packageData.guardrails as JsonRecord;
    const invalid = guardrails.draftOnly !== true
      || [...guardrailKeys].filter((key) => key !== "draftOnly").some((key) => guardrails[key] !== false);
    if (invalid) add({ code: "INVALID_GUARDRAILS", path: "package.guardrails", message: "The v1.1 draft cannot modify v1, approve, publish, activate, deploy or include private evidence." });
  }

  for (const collection of PROGRAMMES_PUBLICATION_V11_DRAFT_COLLECTIONS) {
    const records = packageData[collection.id];
    if (Array.isArray(records) && records.some((record) => isRecord(record) && record.reviewStatus === "approved")) {
      add({ code: "PUBLICATION_STATUS_FORBIDDEN", path: `package.${collection.id}`, message: "Approved is not a valid status in the non-activated draft contract." });
    }
  }

  return deepFreeze({
    valid: issues.length === 0,
    status: "draft-only" as const,
    publicationAuthorized: false as const,
    issues,
  });
}

export function programmesPublicationV11DraftSummary() {
  return deepFreeze({
    version: PROGRAMMES_PUBLICATION_V11_DRAFT_VERSION,
    status: "draft-not-activated" as const,
    baseVersion: "1.0.0" as const,
    baseSchemaSha256: PROGRAMMES_PUBLICATION_V1_SCHEMA_SHA256,
    collections: PROGRAMMES_PUBLICATION_V11_DRAFT_COLLECTIONS,
    publicationAuthorized: false as const,
  });
}
