import { createHash } from "node:crypto";

import {
  PROGRAMME_ID_BY_ROUTE,
  PROGRAMMES_PUBLICATION_ROUTES,
  type ProgrammesPublicationRoute,
} from "./programmes-publication-routes.ts";

export const PROGRAMMES_PUBLICATION_SCHEMA_VERSION = "1.0.0";
export const PROGRAMMES_PUBLICATION_PACKAGE_TYPE = "programmes-publication";

const issuedImplementationPlans = new WeakSet<object>();

const packageKeys = new Set([
  "schemaVersion", "packageType", "packageId", "academicYear", "generatedAt", "approval",
  "evidenceRegistry", "organisations", "faculty", "facilities", "results", "fees",
  "scholarships", "media", "claims", "programmes", "navigation", "seo",
]);
const approvalKeys = new Set(["status", "approvalId", "approvedByRole", "approvedAt", "validFrom", "validUntil"]);
const evidenceKeys = new Set(["id", "type", "status", "controlledReference", "validFrom", "validUntil", "programmeIds"]);
const organisationKeys = new Set(["id", "officialName", "type", "status", "evidenceIds", "claimIds"]);
const facultyKeys = new Set(["id", "publicDisplayName", "publicRole", "publicQualificationSummary", "subjectsOrFunctions", "programmeIds", "evidenceIds", "claimIds", "publicationStatus", "consentStatus"]);
const facilityKeys = new Set(["id", "publicName", "publicSummary", "programmeIds", "evidenceIds", "mediaIds", "status"]);
const resultKeys = new Set(["id", "programmeId", "exam", "year", "cohortDefinition", "aggregateMetric", "aggregateValue", "claimId", "verification", "publicationStatus"]);
const verificationKeys = new Set(["status", "evidenceIds"]);
const feeKeys = new Set(["id", "programmeId", "academicYear", "category", "approvedPublicWording", "currency", "amount", "evidenceIds", "claimIds", "status"]);
const scholarshipKeys = new Set(["id", "programmeId", "academicYear", "publicName", "eligibilitySummary", "benefitSummary", "evidenceIds", "claimIds", "status"]);
const mediaKeys = new Set(["id", "type", "role", "status", "manifestRecordId", "programmeIds", "alt", "containsPeople", "rights", "consent"]);
const mediaDecisionKeys = new Set(["status", "evidenceIds"]);
const claimKeys = new Set(["id", "type", "text", "status", "manifestRecordId", "programmeIds", "organisationIds", "evidenceIds", "validFrom", "validUntil"]);
const programmeKeys = new Set(["id", "route", "status", "approvalStatus", "academicYear", "organisationId", "identity", "academic", "eligibility", "schedule", "admission", "resultsPublication", "feeIds", "facultyIds", "facilityIds", "resultIds", "scholarshipIds", "mediaIds", "evidenceIds", "claimIds", "relatedProgrammeIds", "navigationId", "seoId"]);
const identityKeys = new Set(["eyebrow", "title", "summary"]);
const academicKeys = new Set(["levels", "streams", "subjects", "exams", "curriculumSummary", "teachingMethodology", "testingAndAssessment", "studentSupport", "deliveryModel", "operatorSummary", "studyMaterial"]);
const currentSummaryKeys = new Set(["academicYear", "summary", "evidenceIds"]);
const navigationKeys = new Set(["id", "programmeId", "label", "parent", "order", "status"]);
const seoKeys = new Set(["id", "programmeId", "title", "description", "canonicalPath", "index", "follow", "ogMediaId", "status"]);

const evidenceTypes = new Set([
  "affiliation", "recognition", "programme-approval", "fee-circular", "schedule",
  "scholarship", "aggregate-result", "faculty-qualification", "facility", "award",
  "partnership", "media-rights", "media-consent",
]);
const claimTypes = new Set(["informational", "academic", "performance", "comparative", "regulatory", "financial"]);
const approvalStatuses = new Set(["draft", "approved", "withdrawn"]);
const publicationStatuses = new Set(["draft", "approved", "withdrawn"]);
const evidenceStatuses = new Set(["pending", "verified", "expired", "withdrawn"]);
const mediaDecisionStatuses = new Set(["not-applicable", "pending", "verified", "failed"]);
const resultVerificationStatuses = new Set(["pending", "verified", "failed"]);
const resultsPublicationStatuses = new Set(["no-results-published", "verified-results-approved"]);
const evidenceReferencePattern = /^[A-Z0-9][A-Z0-9._/-]{2,79}$/;
const privateLocationPattern = /^(?:[a-z]:[\\/]|file:|https?:\/\/|\\\\)|(?:^|\/)\.\.?($|\/)/i;
const academicYearPattern = /^(20\d{2})-(20\d{2})$/;
const rolePattern = /^[a-z][a-z0-9-]{2,63}$/;

export type ProgrammesPublicationGate =
  | "schema"
  | "schemaVersion"
  | "academicYear"
  | "approval"
  | "references"
  | "evidence"
  | "results"
  | "claims"
  | "media"
  | "content"
  | "seo"
  | "navigation";

export type ProgrammesPublicationIssue = {
  code: string;
  gate: ProgrammesPublicationGate;
  path: string;
  message: string;
  route?: ProgrammesPublicationRoute;
};

type JsonObject = Record<string, unknown>;

export type ApprovalManifestLike = {
  records?: Array<{
    id?: unknown;
    kind?: unknown;
    decision?: unknown;
    publicTargets?: unknown;
    approvedAt?: unknown;
    expiresAt?: unknown;
  }>;
};

export function isIssuedProgrammesImplementationPlan(value: unknown): boolean {
  return value !== null && typeof value === "object" && issuedImplementationPlans.has(value);
}

type ValidationOptions = {
  packageData: unknown;
  manifest?: ApprovalManifestLike;
  now?: string | Date;
};

type RecordMaps = ReturnType<typeof buildRecordMaps>;

function object(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, minimum = 1, maximum = Number.POSITIVE_INFINITY) {
  return typeof value === "string" && value.trim().length >= minimum && value.trim().length <= maximum;
}

function validDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function validDateTime(value: unknown) {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function currentDate(now: Date) {
  return now.toISOString().slice(0, 10);
}

function validAcademicYear(value: unknown) {
  if (typeof value !== "string") return false;
  const match = academicYearPattern.exec(value);
  return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
}

function uniqueStrings(value: unknown) {
  return Array.isArray(value)
    && value.every((item) => typeof item === "string" && item.length > 0)
    && new Set(value).size === value.length;
}

function strictKeys(
  value: unknown,
  allowed: Set<string>,
  path: string,
  add: (code: string, gate: ProgrammesPublicationGate, path: string, message: string, route?: ProgrammesPublicationRoute) => void,
  route?: ProgrammesPublicationRoute,
) {
  if (!object(value)) {
    add("INVALID_OBJECT", "schema", path, "Expected a JSON object.", route);
    return;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) add("UNKNOWN_FIELD", "schema", `${path}.${key}`, "Unknown fields are rejected.", route);
  }
}

function requireKeys(
  value: unknown,
  required: Set<string>,
  path: string,
  add: (code: string, gate: ProgrammesPublicationGate, path: string, message: string, route?: ProgrammesPublicationRoute) => void,
  route?: ProgrammesPublicationRoute,
) {
  if (!object(value)) return;
  for (const key of required) {
    if (!(key in value)) add("MISSING_REQUIRED_FIELD", "schema", `${path}.${key}`, "Required field is missing.", route);
  }
}

function cloneAndFreeze<T>(value: T): T {
  const clone = structuredClone(value);
  const freeze = (candidate: unknown) => {
    if (!candidate || typeof candidate !== "object" || Object.isFrozen(candidate)) return;
    Object.freeze(candidate);
    for (const child of Object.values(candidate)) freeze(child);
  };
  freeze(clone);
  return clone;
}

function list(packageData: JsonObject, key: string) {
  return Array.isArray(packageData[key]) ? packageData[key] as unknown[] : [];
}

function mapRecords(records: unknown[], key: string) {
  const map = new Map<string, JsonObject>();
  for (const record of records) {
    if (object(record) && typeof record[key] === "string" && !map.has(record[key] as string)) {
      map.set(record[key] as string, record);
    }
  }
  return map;
}

function buildRecordMaps(packageData: JsonObject) {
  return {
    evidence: mapRecords(list(packageData, "evidenceRegistry"), "id"),
    organisations: mapRecords(list(packageData, "organisations"), "id"),
    faculty: mapRecords(list(packageData, "faculty"), "id"),
    facilities: mapRecords(list(packageData, "facilities"), "id"),
    results: mapRecords(list(packageData, "results"), "id"),
    fees: mapRecords(list(packageData, "fees"), "id"),
    scholarships: mapRecords(list(packageData, "scholarships"), "id"),
    media: mapRecords(list(packageData, "media"), "id"),
    claims: mapRecords(list(packageData, "claims"), "id"),
    programmes: mapRecords(list(packageData, "programmes"), "id"),
    navigation: mapRecords(list(packageData, "navigation"), "id"),
    seo: mapRecords(list(packageData, "seo"), "id"),
  };
}

function validateRecordCollection(
  records: unknown[],
  options: {
    name: string;
    idPattern: RegExp;
    allowedKeys: Set<string>;
    requiredKeys?: Set<string>;
  },
  add: (code: string, gate: ProgrammesPublicationGate, path: string, message: string, route?: ProgrammesPublicationRoute) => void,
) {
  const ids = new Set<string>();
  records.forEach((record, index) => {
    const path = `${options.name}[${index}]`;
    strictKeys(record, options.allowedKeys, path, add);
    requireKeys(record, options.requiredKeys ?? options.allowedKeys, path, add);
    if (!object(record) || typeof record.id !== "string" || !options.idPattern.test(record.id)) {
      add("MALFORMED_ID", "schema", `${path}.id`, `Invalid ${options.name} ID.`);
      return;
    }
    if (ids.has(record.id)) add("DUPLICATE_ID", "schema", `${path}.id`, `Duplicate ID ${record.id}.`);
    ids.add(record.id);
  });
}

function routeForProgramme(programme: JsonObject): ProgrammesPublicationRoute | undefined {
  return typeof programme.route === "string"
    && PROGRAMMES_PUBLICATION_ROUTES.includes(programme.route as ProgrammesPublicationRoute)
    ? programme.route as ProgrammesPublicationRoute
    : undefined;
}

function validateShape(
  packageData: JsonObject,
  add: (code: string, gate: ProgrammesPublicationGate, path: string, message: string, route?: ProgrammesPublicationRoute) => void,
) {
  strictKeys(packageData, packageKeys, "$", add);
  requireKeys(packageData, packageKeys, "$", add);

  for (const key of ["evidenceRegistry", "organisations", "faculty", "facilities", "results", "fees", "scholarships", "media", "claims", "programmes", "navigation", "seo"]) {
    if (!Array.isArray(packageData[key])) add("INVALID_ARRAY", "schema", key, "Expected an array.");
  }

  validateRecordCollection(list(packageData, "evidenceRegistry"), { name: "evidenceRegistry", idPattern: /^EVD-[A-Z0-9-]{2,79}$/, allowedKeys: evidenceKeys }, add);
  validateRecordCollection(list(packageData, "organisations"), { name: "organisations", idPattern: /^ORG-[A-Z0-9-]{2,79}$/, allowedKeys: organisationKeys }, add);
  validateRecordCollection(list(packageData, "faculty"), { name: "faculty", idPattern: /^FAC-[A-Z0-9-]{2,79}$/, allowedKeys: facultyKeys }, add);
  validateRecordCollection(list(packageData, "facilities"), { name: "facilities", idPattern: /^FACILITY-[A-Z0-9-]{2,79}$/, allowedKeys: facilityKeys }, add);
  validateRecordCollection(list(packageData, "results"), { name: "results", idPattern: /^RESULT-[A-Z0-9-]{2,79}$/, allowedKeys: resultKeys }, add);
  validateRecordCollection(list(packageData, "fees"), { name: "fees", idPattern: /^FEE-[A-Z0-9-]{2,79}$/, allowedKeys: feeKeys }, add);
  validateRecordCollection(list(packageData, "scholarships"), { name: "scholarships", idPattern: /^SCH-[A-Z0-9-]{2,79}$/, allowedKeys: scholarshipKeys }, add);
  validateRecordCollection(list(packageData, "media"), { name: "media", idPattern: /^MEDIA-[A-Z0-9-]{2,79}$/, allowedKeys: mediaKeys }, add);
  validateRecordCollection(list(packageData, "claims"), { name: "claims", idPattern: /^CLAIM-[A-Z0-9-]{2,79}$/, allowedKeys: claimKeys }, add);
  validateRecordCollection(list(packageData, "programmes"), { name: "programmes", idPattern: /^(?:school-academics|junior-college|jee-neet)$/, allowedKeys: programmeKeys }, add);
  validateRecordCollection(list(packageData, "navigation"), { name: "navigation", idPattern: /^NAV-[A-Z0-9-]{2,79}$/, allowedKeys: navigationKeys }, add);
  validateRecordCollection(list(packageData, "seo"), { name: "seo", idPattern: /^SEO-[A-Z0-9-]{2,79}$/, allowedKeys: seoKeys }, add);

  strictKeys(packageData.approval, approvalKeys, "approval", add);
  requireKeys(packageData.approval, approvalKeys, "approval", add);

  list(packageData, "programmes").forEach((candidate, index) => {
    if (!object(candidate)) return;
    const route = routeForProgramme(candidate);
    strictKeys(candidate.identity, identityKeys, `programmes[${index}].identity`, add, route);
    requireKeys(candidate.identity, identityKeys, `programmes[${index}].identity`, add, route);
    strictKeys(candidate.academic, academicKeys, `programmes[${index}].academic`, add, route);
    requireKeys(candidate.academic, academicKeys, `programmes[${index}].academic`, add, route);
    for (const key of ["eligibility", "schedule", "admission"]) {
      strictKeys(candidate[key], currentSummaryKeys, `programmes[${index}].${key}`, add, route);
      requireKeys(candidate[key], currentSummaryKeys, `programmes[${index}].${key}`, add, route);
    }
  });

  list(packageData, "results").forEach((candidate, index) => {
    if (!object(candidate)) return;
    strictKeys(candidate.verification, verificationKeys, `results[${index}].verification`, add);
    requireKeys(candidate.verification, verificationKeys, `results[${index}].verification`, add);
  });

  list(packageData, "media").forEach((candidate, index) => {
    if (!object(candidate)) return;
    strictKeys(candidate.rights, mediaDecisionKeys, `media[${index}].rights`, add);
    requireKeys(candidate.rights, mediaDecisionKeys, `media[${index}].rights`, add);
    strictKeys(candidate.consent, mediaDecisionKeys, `media[${index}].consent`, add);
    requireKeys(candidate.consent, mediaDecisionKeys, `media[${index}].consent`, add);
  });
}

function validatePrimitiveFields(
  packageData: JsonObject,
  add: (code: string, gate: ProgrammesPublicationGate, path: string, message: string, route?: ProgrammesPublicationRoute) => void,
) {
  if (packageData.schemaVersion !== PROGRAMMES_PUBLICATION_SCHEMA_VERSION) add("UNSUPPORTED_SCHEMA_VERSION", "schemaVersion", "schemaVersion", "Only schema version 1.0.0 is supported.");
  if (packageData.packageType !== PROGRAMMES_PUBLICATION_PACKAGE_TYPE) add("INVALID_PACKAGE_TYPE", "schema", "packageType", "Package type must be programmes-publication.");
  if (typeof packageData.packageId !== "string" || !/^programmes-20\d{2}-20\d{2}-v[1-9]\d*$/.test(packageData.packageId)) add("INVALID_PACKAGE_ID", "schema", "packageId", "Package ID must bind an academic year and positive version.");
  if (!validDateTime(packageData.generatedAt)) add("INVALID_GENERATED_AT", "schema", "generatedAt", "A valid ISO date-time is required.");
  if (!validAcademicYear(packageData.academicYear)) add("INVALID_ACADEMIC_YEAR", "academicYear", "academicYear", "Use a consecutive YYYY-YYYY academic year.");

  const approval = object(packageData.approval) ? packageData.approval : {};
  if (!approvalStatuses.has(String(approval.status))) add("INVALID_APPROVAL_STATUS", "approval", "approval.status", "Approval status must be draft, approved or withdrawn.");
  if (typeof approval.approvalId !== "string" || !/^APR-[A-Z0-9-]{3,79}$/.test(approval.approvalId)) add("INVALID_APPROVAL_ID", "approval", "approval.approvalId", "A stable approval ID is required.");
  if (!rolePattern.test(String(approval.approvedByRole ?? ""))) add("INVALID_APPROVING_ROLE", "approval", "approval.approvedByRole", "Use a role slug, never an approver identity.");
  if (!validDateTime(approval.approvedAt)) add("INVALID_APPROVED_AT", "approval", "approval.approvedAt", "A valid approval date-time is required.");
  if (!validDate(approval.validFrom) || !validDate(approval.validUntil)) add("INVALID_APPROVAL_WINDOW", "approval", "approval", "Approval validity requires exact YYYY-MM-DD boundaries.");

  for (const [index, record] of list(packageData, "evidenceRegistry").entries()) {
    if (!object(record)) continue;
    if (!evidenceTypes.has(String(record.type))) add("INVALID_EVIDENCE_TYPE", "schema", `evidenceRegistry[${index}].type`, "Unknown evidence type.");
    if (!evidenceStatuses.has(String(record.status))) add("INVALID_EVIDENCE_STATUS", "schema", `evidenceRegistry[${index}].status`, "Unknown evidence status.");
    if (typeof record.controlledReference !== "string" || !evidenceReferencePattern.test(record.controlledReference) || privateLocationPattern.test(record.controlledReference)) {
      add("UNSAFE_EVIDENCE_REFERENCE", "evidence", `evidenceRegistry[${index}].controlledReference`, "Evidence must use an opaque controlled-system ID, never a path or URL.");
    }
    if (record.validFrom !== null && !validDate(record.validFrom)) add("INVALID_EVIDENCE_DATE", "schema", `evidenceRegistry[${index}].validFrom`, "Evidence validity must be null or YYYY-MM-DD.");
    if (record.validUntil !== null && !validDate(record.validUntil)) add("INVALID_EVIDENCE_DATE", "schema", `evidenceRegistry[${index}].validUntil`, "Evidence validity must be null or YYYY-MM-DD.");
    if (!uniqueStrings(record.programmeIds)) add("INVALID_REFERENCE_LIST", "schema", `evidenceRegistry[${index}].programmeIds`, "Programme IDs must be unique strings.");
  }

  for (const collection of ["organisations", "faculty", "facilities", "fees", "scholarships", "media", "claims", "programmes", "navigation", "seo"]) {
    for (const [index, record] of list(packageData, collection).entries()) {
      if (!object(record)) continue;
      const statusKey = collection === "faculty" ? "publicationStatus" : "status";
      if (statusKey in record && !publicationStatuses.has(String(record[statusKey]))) add("INVALID_PUBLICATION_STATUS", "schema", `${collection}[${index}].${statusKey}`, "Unknown publication status.");
    }
  }

  for (const [index, claim] of list(packageData, "claims").entries()) {
    if (!object(claim)) continue;
    if (!claimTypes.has(String(claim.type))) add("INVALID_CLAIM_TYPE", "schema", `claims[${index}].type`, "Unknown claim risk class.");
    if (!text(claim.text, 2, 180)) add("INVALID_CLAIM_TEXT", "schema", `claims[${index}].text`, "Claim text must be 2-180 characters.");
    for (const key of ["programmeIds", "organisationIds", "evidenceIds"]) if (!uniqueStrings(claim[key])) add("INVALID_REFERENCE_LIST", "schema", `claims[${index}].${key}`, "References must be unique strings.");
  }

  for (const [index, programme] of list(packageData, "programmes").entries()) {
    if (!object(programme)) continue;
    const route = routeForProgramme(programme);
    if (!route) add("INVALID_ROUTE", "schema", `programmes[${index}].route`, "Programme route is not one of the three controlled routes.");
    if (!resultsPublicationStatuses.has(String(programme.resultsPublication))) add("INVALID_RESULTS_PUBLICATION", "schema", `programmes[${index}].resultsPublication`, "Unknown results-publication decision.", route);
    for (const key of ["feeIds", "facultyIds", "facilityIds", "resultIds", "scholarshipIds", "mediaIds", "evidenceIds", "claimIds", "relatedProgrammeIds"]) {
      if (!uniqueStrings(programme[key])) add("INVALID_REFERENCE_LIST", "schema", `programmes[${index}].${key}`, "References must be unique strings.", route);
    }
  }
}

function validateAcademicYearGate(
  packageData: JsonObject,
  route: ProgrammesPublicationRoute,
  programme: JsonObject,
  maps: RecordMaps,
  add: (code: string, gate: ProgrammesPublicationGate, path: string, message: string, route?: ProgrammesPublicationRoute) => void,
) {
  const year = packageData.academicYear;
  if (programme.academicYear !== year) add("ACADEMIC_YEAR_MISMATCH", "academicYear", `${route}.academicYear`, "Programme academic year does not match the package.", route);
  for (const key of ["eligibility", "schedule", "admission"]) {
    const value = object(programme[key]) ? programme[key] as JsonObject : {};
    if (value.academicYear !== year) add("ACADEMIC_YEAR_MISMATCH", "academicYear", `${route}.${key}.academicYear`, `${key} must match the package academic year.`, route);
  }
  for (const [collection, ids] of [["fees", programme.feeIds], ["scholarships", programme.scholarshipIds]] as const) {
    if (!Array.isArray(ids)) continue;
    const map = maps[collection];
    for (const id of ids) {
      const record = map.get(String(id));
      if (record && record.academicYear !== year) add("ACADEMIC_YEAR_MISMATCH", "academicYear", `${route}.${collection}.${id}`, `Current ${collection} must match the package academic year.`, route);
    }
  }
}

function validateApprovalGate(
  packageData: JsonObject,
  now: Date,
  add: (code: string, gate: ProgrammesPublicationGate, path: string, message: string, route?: ProgrammesPublicationRoute) => void,
) {
  const approval = object(packageData.approval) ? packageData.approval : {};
  const today = currentDate(now);
  if (approval.status !== "approved") add("PACKAGE_NOT_APPROVED", "approval", "approval.status", "Package approval status is not approved.");
  if (validDate(approval.validFrom) && String(approval.validFrom) > today) add("APPROVAL_NOT_ACTIVE", "approval", "approval.validFrom", "Package approval is not active yet.");
  if (validDate(approval.validUntil) && String(approval.validUntil) < today) add("EXPIRED_APPROVAL", "approval", "approval.validUntil", "Package approval has expired.");
  if (validDate(approval.validFrom) && validDate(approval.validUntil) && String(approval.validUntil) < String(approval.validFrom)) add("INVALID_APPROVAL_WINDOW", "approval", "approval", "Approval end precedes its start.");
  if (validDateTime(approval.approvedAt) && Date.parse(String(approval.approvedAt)) > now.valueOf()) add("FUTURE_APPROVAL", "approval", "approval.approvedAt", "Approval time cannot be in the future.");
}

function validateEvidence(
  evidenceId: unknown,
  options: {
    route: ProgrammesPublicationRoute;
    path: string;
    maps: RecordMaps;
    now: Date;
    programmeId: string;
    requiredTypes?: Set<string>;
  },
  add: (code: string, gate: ProgrammesPublicationGate, path: string, message: string, route?: ProgrammesPublicationRoute) => void,
) {
  const id = String(evidenceId);
  const evidence = options.maps.evidence.get(id);
  if (!evidence) {
    add("MISSING_EVIDENCE", "evidence", options.path, `Evidence ${id} does not exist.`, options.route);
    return false;
  }
  let valid = true;
  if (evidence.status !== "verified") {
    add("UNVERIFIED_EVIDENCE", "evidence", options.path, `Evidence ${id} is not verified.`, options.route);
    valid = false;
  }
  const today = currentDate(options.now);
  if (validDate(evidence.validFrom) && String(evidence.validFrom) > today) {
    add("EVIDENCE_NOT_ACTIVE", "evidence", options.path, `Evidence ${id} is not active yet.`, options.route);
    valid = false;
  }
  if (validDate(evidence.validUntil) && String(evidence.validUntil) < today) {
    add("EXPIRED_EVIDENCE", "evidence", options.path, `Evidence ${id} has expired.`, options.route);
    valid = false;
  }
  if (Array.isArray(evidence.programmeIds) && evidence.programmeIds.length && !evidence.programmeIds.includes(options.programmeId)) {
    add("EVIDENCE_SCOPE_MISMATCH", "evidence", options.path, `Evidence ${id} is not scoped to this programme.`, options.route);
    valid = false;
  }
  if (options.requiredTypes && !options.requiredTypes.has(String(evidence.type))) {
    add("WRONG_EVIDENCE_TYPE", "evidence", options.path, `Evidence ${id} has an inappropriate type.`, options.route);
    valid = false;
  }
  return valid;
}

function manifestRecord(
  manifest: ApprovalManifestLike | undefined,
  recordId: unknown,
  kind: "claim" | "media",
  route: ProgrammesPublicationRoute,
  now: Date,
  path: string,
  add: (code: string, gate: ProgrammesPublicationGate, path: string, message: string, route?: ProgrammesPublicationRoute) => void,
) {
  const records = Array.isArray(manifest?.records) ? manifest.records : [];
  const record = records.find((candidate) => candidate.id === recordId);
  const gate = kind === "claim" ? "claims" : "media";
  if (!record) {
    add("MISSING_MANIFEST_RECORD", gate, path, `Canonical ${kind} approval record ${String(recordId)} does not exist.`, route);
    return false;
  }
  let valid = true;
  if (record.kind !== kind) {
    add("MANIFEST_KIND_MISMATCH", gate, path, `Manifest record is not a ${kind} record.`, route);
    valid = false;
  }
  if (record.decision !== "approved") {
    add("MANIFEST_RECORD_NOT_APPROVED", gate, path, `Canonical ${kind} record is not approved.`, route);
    valid = false;
  }
  if (!Array.isArray(record.publicTargets) || !record.publicTargets.includes(route)) {
    add("MANIFEST_TARGET_MISMATCH", gate, path, `Canonical ${kind} record does not cover ${route}.`, route);
    valid = false;
  }
  if (validDate(record.expiresAt) && String(record.expiresAt) < currentDate(now)) {
    add("EXPIRED_MANIFEST_RECORD", gate, path, `Canonical ${kind} approval has expired.`, route);
    valid = false;
  }
  return valid;
}

const claimEvidenceTypes: Record<string, Set<string>> = {
  informational: new Set(),
  academic: new Set(["programme-approval"]),
  performance: new Set(["aggregate-result"]),
  comparative: new Set(["aggregate-result"]),
  regulatory: new Set(["affiliation", "recognition", "programme-approval"]),
  financial: new Set(["fee-circular", "scholarship"]),
};

function validateClaim(
  claimId: unknown,
  options: { route: ProgrammesPublicationRoute; programmeId: string; organisationId: unknown; maps: RecordMaps; manifest?: ApprovalManifestLike; now: Date; path: string },
  add: (code: string, gate: ProgrammesPublicationGate, path: string, message: string, route?: ProgrammesPublicationRoute) => void,
) {
  const id = String(claimId);
  const claim = options.maps.claims.get(id);
  if (!claim) {
    add("BROKEN_REFERENCE", "references", options.path, `Claim ${id} does not exist.`, options.route);
    return false;
  }
  let valid = true;
  if (claim.status !== "approved") {
    add("CLAIM_NOT_APPROVED", "claims", options.path, `Claim ${id} is not approved.`, options.route);
    valid = false;
  }
  if (!Array.isArray(claim.programmeIds) || !claim.programmeIds.includes(options.programmeId)) {
    add("CLAIM_SCOPE_MISMATCH", "claims", options.path, `Claim ${id} is not scoped to this programme.`, options.route);
    valid = false;
  }
  if (Array.isArray(claim.organisationIds) && claim.organisationIds.length && !claim.organisationIds.includes(options.organisationId)) {
    add("CLAIM_SCOPE_MISMATCH", "claims", options.path, `Claim ${id} is not scoped to this organisation.`, options.route);
    valid = false;
  }
  const today = currentDate(options.now);
  if (validDate(claim.validFrom) && String(claim.validFrom) > today) {
    add("CLAIM_NOT_ACTIVE", "claims", options.path, `Claim ${id} is not active yet.`, options.route);
    valid = false;
  }
  if (validDate(claim.validUntil) && String(claim.validUntil) < today) {
    add("EXPIRED_CLAIM", "claims", options.path, `Claim ${id} has expired.`, options.route);
    valid = false;
  }
  const requiredTypes = claimEvidenceTypes[String(claim.type)] ?? new Set<string>();
  const evidenceIds = Array.isArray(claim.evidenceIds) ? claim.evidenceIds : [];
  if (requiredTypes.size && !evidenceIds.length) {
    add("CLAIM_EVIDENCE_REQUIRED", "claims", options.path, `Claim ${id} requires evidence.`, options.route);
    valid = false;
  }
  let hasAppropriateEvidence = requiredTypes.size === 0;
  for (const evidenceId of evidenceIds) {
    const evidence = options.maps.evidence.get(String(evidenceId));
    if (evidence && requiredTypes.has(String(evidence.type))) hasAppropriateEvidence = true;
    if (!validateEvidence(evidenceId, { route: options.route, path: `${options.path}.evidenceIds`, maps: options.maps, now: options.now, programmeId: options.programmeId }, add)) valid = false;
  }
  if (!hasAppropriateEvidence) {
    add("WRONG_EVIDENCE_TYPE", "claims", options.path, `Claim ${id} lacks evidence appropriate to its risk class.`, options.route);
    valid = false;
  }
  if (!manifestRecord(options.manifest, claim.manifestRecordId, "claim", options.route, options.now, `${options.path}.manifestRecordId`, add)) valid = false;
  return valid;
}

function validateMedia(
  mediaId: unknown,
  options: { route: ProgrammesPublicationRoute; programmeId: string; maps: RecordMaps; manifest?: ApprovalManifestLike; now: Date; path: string },
  add: (code: string, gate: ProgrammesPublicationGate, path: string, message: string, route?: ProgrammesPublicationRoute) => void,
) {
  const id = String(mediaId);
  const media = options.maps.media.get(id);
  if (!media) {
    add("BROKEN_REFERENCE", "references", options.path, `Media ${id} does not exist.`, options.route);
    return false;
  }
  let valid = true;
  if (media.status !== "approved") {
    add("MEDIA_NOT_APPROVED", "media", options.path, `Media ${id} is not approved.`, options.route);
    valid = false;
  }
  if (!Array.isArray(media.programmeIds) || !media.programmeIds.includes(options.programmeId)) {
    add("MEDIA_SCOPE_MISMATCH", "media", options.path, `Media ${id} is not scoped to this programme.`, options.route);
    valid = false;
  }
  if (!text(media.alt, 2, 300)) {
    add("MEDIA_ALT_REQUIRED", "media", options.path, `Media ${id} requires approved alternative text.`, options.route);
    valid = false;
  }
  const rights = object(media.rights) ? media.rights : {};
  if (rights.status !== "verified") {
    add("MEDIA_RIGHTS_NOT_VERIFIED", "media", options.path, `Media ${id} rights are not verified.`, options.route);
    valid = false;
  }
  for (const evidenceId of Array.isArray(rights.evidenceIds) ? rights.evidenceIds : []) {
    if (!validateEvidence(evidenceId, { route: options.route, path: `${options.path}.rights`, maps: options.maps, now: options.now, programmeId: options.programmeId, requiredTypes: new Set(["media-rights"]) }, add)) valid = false;
  }
  const consent = object(media.consent) ? media.consent : {};
  if (media.containsPeople === true) {
    if (consent.status !== "verified") {
      add("MEDIA_CONSENT_NOT_VERIFIED", "media", options.path, `Media ${id} contains people but consent is not verified.`, options.route);
      valid = false;
    }
    for (const evidenceId of Array.isArray(consent.evidenceIds) ? consent.evidenceIds : []) {
      if (!validateEvidence(evidenceId, { route: options.route, path: `${options.path}.consent`, maps: options.maps, now: options.now, programmeId: options.programmeId, requiredTypes: new Set(["media-consent"]) }, add)) valid = false;
    }
  } else if (!mediaDecisionStatuses.has(String(consent.status))) {
    add("INVALID_MEDIA_CONSENT", "media", options.path, `Media ${id} has an invalid consent state.`, options.route);
    valid = false;
  }
  if (!manifestRecord(options.manifest, media.manifestRecordId, "media", options.route, options.now, `${options.path}.manifestRecordId`, add)) valid = false;
  return valid;
}

function validateContentText(value: unknown, path: string, route: ProgrammesPublicationRoute, add: (code: string, gate: ProgrammesPublicationGate, path: string, message: string, route?: ProgrammesPublicationRoute) => void) {
  if (!text(value, 2, 1200)) add("CONTENT_INCOMPLETE", "content", path, "Approved public content is missing or too short.", route);
}

function validateProgramme(
  packageData: JsonObject,
  programme: JsonObject,
  route: ProgrammesPublicationRoute,
  maps: RecordMaps,
  manifest: ApprovalManifestLike | undefined,
  now: Date,
  add: (code: string, gate: ProgrammesPublicationGate, path: string, message: string, route?: ProgrammesPublicationRoute) => void,
) {
  const id = String(programme.id);
  if (PROGRAMME_ID_BY_ROUTE[route] !== id) add("PROGRAMME_ROUTE_MISMATCH", "schema", `${route}.id`, "Programme ID and route do not match.", route);
  if (programme.status !== "approved" || programme.approvalStatus !== "approved") add("PROGRAMME_NOT_APPROVED", "approval", `${route}.status`, "Most restrictive status wins; both programme statuses must be approved.", route);
  validateAcademicYearGate(packageData, route, programme, maps, add);

  const identity = object(programme.identity) ? programme.identity : {};
  validateContentText(identity.eyebrow, `${route}.identity.eyebrow`, route, add);
  validateContentText(identity.title, `${route}.identity.title`, route, add);
  validateContentText(identity.summary, `${route}.identity.summary`, route, add);
  const academic = object(programme.academic) ? programme.academic : {};
  for (const key of ["levels", "subjects"]) if (!Array.isArray(academic[key]) || !(academic[key] as unknown[]).length) add("CONTENT_INCOMPLETE", "content", `${route}.academic.${key}`, `${key} are required.`, route);
  for (const key of ["curriculumSummary", "teachingMethodology", "testingAndAssessment", "studentSupport"]) validateContentText(academic[key], `${route}.academic.${key}`, route, add);
  for (const key of ["eligibility", "schedule", "admission"]) {
    const section = object(programme[key]) ? programme[key] as JsonObject : {};
    validateContentText(section.summary, `${route}.${key}.summary`, route, add);
    for (const evidenceId of Array.isArray(section.evidenceIds) ? section.evidenceIds : []) validateEvidence(evidenceId, { route, path: `${route}.${key}.evidenceIds`, maps, now, programmeId: id }, add);
  }
  if (route === "/junior-college" && (!Array.isArray(academic.streams) || !academic.streams.length)) add("CONTENT_INCOMPLETE", "content", `${route}.academic.streams`, "Junior College streams are required.", route);
  if (route === "/programmes/jee-neet") {
    for (const key of ["exams", "subjects"]) if (!Array.isArray(academic[key]) || !(academic[key] as unknown[]).length) add("CONTENT_INCOMPLETE", "content", `${route}.academic.${key}`, `${key} are required for JEE/NEET.`, route);
    for (const key of ["deliveryModel", "operatorSummary", "studyMaterial"]) validateContentText(academic[key], `${route}.academic.${key}`, route, add);
  }

  const organisation = maps.organisations.get(String(programme.organisationId));
  if (!organisation) add("BROKEN_REFERENCE", "references", `${route}.organisationId`, "Programme organisation does not exist.", route);
  else {
    if (organisation.status !== "approved") add("ORGANISATION_NOT_APPROVED", "approval", `${route}.organisationId`, "Programme organisation is not approved.", route);
    for (const evidenceId of Array.isArray(organisation.evidenceIds) ? organisation.evidenceIds : []) validateEvidence(evidenceId, { route, path: `${route}.organisation.evidenceIds`, maps, now, programmeId: id }, add);
    for (const claimId of Array.isArray(organisation.claimIds) ? organisation.claimIds : []) validateClaim(claimId, { route, programmeId: id, organisationId: programme.organisationId, maps, manifest, now, path: `${route}.organisation.claimIds` }, add);
  }

  for (const evidenceId of Array.isArray(programme.evidenceIds) ? programme.evidenceIds : []) validateEvidence(evidenceId, { route, path: `${route}.evidenceIds`, maps, now, programmeId: id }, add);
  if (route === "/junior-college") {
    const evidenceIds = Array.isArray(programme.evidenceIds) ? programme.evidenceIds : [];
    const hasStatusEvidence = evidenceIds.some((evidenceId) => ["affiliation", "recognition"].includes(String(maps.evidence.get(String(evidenceId))?.type)));
    if (!hasStatusEvidence) add("JUNIOR_COLLEGE_STATUS_EVIDENCE_REQUIRED", "evidence", `${route}.evidenceIds`, "Junior College requires affiliation or recognition evidence.", route);
  }

  for (const claimId of Array.isArray(programme.claimIds) ? programme.claimIds : []) validateClaim(claimId, { route, programmeId: id, organisationId: programme.organisationId, maps, manifest, now, path: `${route}.claimIds` }, add);
  if (!Array.isArray(programme.claimIds) || !programme.claimIds.length) add("CLAIM_REQUIRED", "claims", `${route}.claimIds`, "At least one approved public claim is required.", route);

  for (const facultyId of Array.isArray(programme.facultyIds) ? programme.facultyIds : []) {
    const faculty = maps.faculty.get(String(facultyId));
    if (!faculty) {
      add("BROKEN_REFERENCE", "references", `${route}.facultyIds`, `Faculty ${String(facultyId)} does not exist.`, route);
      continue;
    }
    if (faculty.publicationStatus !== "approved" || faculty.consentStatus !== "approved") add("FACULTY_NOT_PUBLISHABLE", "content", `${route}.facultyIds`, `Faculty ${String(facultyId)} is not approved for public display.`, route);
    if (!Array.isArray(faculty.programmeIds) || !faculty.programmeIds.includes(id)) add("REFERENCE_SCOPE_MISMATCH", "references", `${route}.facultyIds`, `Faculty ${String(facultyId)} is not scoped to this programme.`, route);
    const evidenceIds = Array.isArray(faculty.evidenceIds) ? faculty.evidenceIds : [];
    if (!evidenceIds.length) add("FACULTY_EVIDENCE_REQUIRED", "evidence", `${route}.facultyIds`, `Faculty ${String(facultyId)} requires qualification evidence.`, route);
    for (const evidenceId of evidenceIds) validateEvidence(evidenceId, { route, path: `${route}.faculty.${String(facultyId)}.evidenceIds`, maps, now, programmeId: id, requiredTypes: new Set(["faculty-qualification"]) }, add);
    for (const claimId of Array.isArray(faculty.claimIds) ? faculty.claimIds : []) validateClaim(claimId, { route, programmeId: id, organisationId: programme.organisationId, maps, manifest, now, path: `${route}.faculty.${String(facultyId)}.claimIds` }, add);
  }

  for (const facilityId of Array.isArray(programme.facilityIds) ? programme.facilityIds : []) {
    const facility = maps.facilities.get(String(facilityId));
    if (!facility) add("BROKEN_REFERENCE", "references", `${route}.facilityIds`, `Facility ${String(facilityId)} does not exist.`, route);
    else {
      if (facility.status !== "approved") add("FACILITY_NOT_APPROVED", "content", `${route}.facilityIds`, `Facility ${String(facilityId)} is not approved.`, route);
      if (!Array.isArray(facility.programmeIds) || !facility.programmeIds.includes(id)) add("REFERENCE_SCOPE_MISMATCH", "references", `${route}.facilityIds`, `Facility ${String(facilityId)} is not scoped to this programme.`, route);
      for (const evidenceId of Array.isArray(facility.evidenceIds) ? facility.evidenceIds : []) validateEvidence(evidenceId, { route, path: `${route}.facility.${String(facilityId)}.evidenceIds`, maps, now, programmeId: id, requiredTypes: new Set(["facility"]) }, add);
      for (const mediaId of Array.isArray(facility.mediaIds) ? facility.mediaIds : []) validateMedia(mediaId, { route, programmeId: id, maps, manifest, now, path: `${route}.facility.${String(facilityId)}.mediaIds` }, add);
    }
  }

  for (const feeId of Array.isArray(programme.feeIds) ? programme.feeIds : []) {
    const fee = maps.fees.get(String(feeId));
    if (!fee) {
      add("BROKEN_REFERENCE", "references", `${route}.feeIds`, `Fee ${String(feeId)} does not exist.`, route);
      continue;
    }
    if (fee.status !== "approved") add("FEE_NOT_APPROVED", "content", `${route}.feeIds`, `Fee ${String(feeId)} is not approved.`, route);
    if (fee.programmeId !== id) add("REFERENCE_SCOPE_MISMATCH", "references", `${route}.feeIds`, `Fee ${String(feeId)} belongs to another programme.`, route);
    const evidenceIds = Array.isArray(fee.evidenceIds) ? fee.evidenceIds : [];
    if (!evidenceIds.length) add("FEE_EVIDENCE_REQUIRED", "evidence", `${route}.feeIds`, `Fee ${String(feeId)} requires a fee circular.`, route);
    for (const evidenceId of evidenceIds) validateEvidence(evidenceId, { route, path: `${route}.fee.${String(feeId)}.evidenceIds`, maps, now, programmeId: id, requiredTypes: new Set(["fee-circular"]) }, add);
    for (const claimId of Array.isArray(fee.claimIds) ? fee.claimIds : []) validateClaim(claimId, { route, programmeId: id, organisationId: programme.organisationId, maps, manifest, now, path: `${route}.fee.${String(feeId)}.claimIds` }, add);
  }
  if ((route === "/junior-college" || route === "/programmes/jee-neet") && (!Array.isArray(programme.feeIds) || !programme.feeIds.length)) add("FEE_REQUIRED", "content", `${route}.feeIds`, "Current approved fee information is required.", route);

  for (const resultId of Array.isArray(programme.resultIds) ? programme.resultIds : []) {
    const result = maps.results.get(String(resultId));
    if (!result) {
      add("BROKEN_REFERENCE", "references", `${route}.resultIds`, `Result ${String(resultId)} does not exist.`, route);
      continue;
    }
    if (result.programmeId !== id) add("REFERENCE_SCOPE_MISMATCH", "references", `${route}.resultIds`, `Result ${String(resultId)} belongs to another programme.`, route);
    const verification = object(result.verification) ? result.verification : {};
    if (!resultVerificationStatuses.has(String(verification.status)) || verification.status !== "verified" || result.publicationStatus !== "approved") add("UNVERIFIED_RESULT", "results", `${route}.resultIds`, `Result ${String(resultId)} is not verified and approved.`, route);
    for (const evidenceId of Array.isArray(verification.evidenceIds) ? verification.evidenceIds : []) validateEvidence(evidenceId, { route, path: `${route}.result.${String(resultId)}.evidenceIds`, maps, now, programmeId: id, requiredTypes: new Set(["aggregate-result"]) }, add);
    validateClaim(result.claimId, { route, programmeId: id, organisationId: programme.organisationId, maps, manifest, now, path: `${route}.result.${String(resultId)}.claimId` }, add);
  }
  if (programme.resultsPublication === "verified-results-approved" && (!Array.isArray(programme.resultIds) || !programme.resultIds.length)) add("VERIFIED_RESULTS_REQUIRED", "results", `${route}.resultIds`, "Approved results publication requires at least one verified aggregate result.", route);
  if (programme.resultsPublication === "no-results-published" && Array.isArray(programme.resultIds) && programme.resultIds.length) add("RESULTS_DECISION_MISMATCH", "results", `${route}.resultIds`, "Result references are not allowed when no results will be published.", route);

  for (const scholarshipId of Array.isArray(programme.scholarshipIds) ? programme.scholarshipIds : []) {
    const scholarship = maps.scholarships.get(String(scholarshipId));
    if (!scholarship) add("BROKEN_REFERENCE", "references", `${route}.scholarshipIds`, `Scholarship ${String(scholarshipId)} does not exist.`, route);
    else {
      if (scholarship.status !== "approved") add("SCHOLARSHIP_NOT_APPROVED", "content", `${route}.scholarshipIds`, `Scholarship ${String(scholarshipId)} is not approved.`, route);
      if (scholarship.programmeId !== id) add("REFERENCE_SCOPE_MISMATCH", "references", `${route}.scholarshipIds`, `Scholarship ${String(scholarshipId)} belongs to another programme.`, route);
      for (const evidenceId of Array.isArray(scholarship.evidenceIds) ? scholarship.evidenceIds : []) validateEvidence(evidenceId, { route, path: `${route}.scholarship.${String(scholarshipId)}.evidenceIds`, maps, now, programmeId: id, requiredTypes: new Set(["scholarship"]) }, add);
      for (const claimId of Array.isArray(scholarship.claimIds) ? scholarship.claimIds : []) validateClaim(claimId, { route, programmeId: id, organisationId: programme.organisationId, maps, manifest, now, path: `${route}.scholarship.${String(scholarshipId)}.claimIds` }, add);
    }
  }

  for (const mediaId of Array.isArray(programme.mediaIds) ? programme.mediaIds : []) validateMedia(mediaId, { route, programmeId: id, maps, manifest, now, path: `${route}.mediaIds` }, add);
  if (!Array.isArray(programme.mediaIds) || !programme.mediaIds.length) add("MEDIA_REQUIRED", "media", `${route}.mediaIds`, "At least one approved programme media record is required.", route);

  const seo = maps.seo.get(String(programme.seoId));
  if (!seo) add("BROKEN_REFERENCE", "references", `${route}.seoId`, "SEO record does not exist.", route);
  else {
    if (seo.programmeId !== id || seo.canonicalPath !== route) add("SEO_SCOPE_MISMATCH", "seo", `${route}.seoId`, "SEO record does not match the programme route.", route);
    if (seo.status !== "approved" || seo.index !== true || seo.follow !== true || !text(seo.title, 10, 70) || !text(seo.description, 50, 170)) add("SEO_NOT_APPROVED", "seo", `${route}.seoId`, "SEO must be approved, indexable and complete.", route);
    if (!Array.isArray(programme.mediaIds) || !programme.mediaIds.includes(seo.ogMediaId)) add("SEO_MEDIA_MISMATCH", "seo", `${route}.seoId`, "Open Graph media must be an approved programme media reference.", route);
  }

  const navigation = maps.navigation.get(String(programme.navigationId));
  if (!navigation) add("BROKEN_REFERENCE", "references", `${route}.navigationId`, "Navigation record does not exist.", route);
  else if (navigation.programmeId !== id || navigation.status !== "approved" || !text(navigation.label, 2, 80) || !text(navigation.parent, 2, 80)) add("NAVIGATION_NOT_APPROVED", "navigation", `${route}.navigationId`, "Navigation record is not approved or does not match the programme.", route);
}

export function validateProgrammesPublicationPackage(options: ValidationOptions) {
  const now = options.now instanceof Date ? new Date(options.now.valueOf()) : new Date(options.now ?? Date.now());
  if (Number.isNaN(now.valueOf())) throw new Error("Validation requires a valid current time.");
  const issues: ProgrammesPublicationIssue[] = [];
  const add = (code: string, gate: ProgrammesPublicationGate, path: string, message: string, route?: ProgrammesPublicationRoute) => {
    issues.push({ code, gate, path, message, ...(route ? { route } : {}) });
  };
  if (!object(options.packageData)) {
    add("INVALID_PACKAGE", "schema", "$", "Programmes publication package must be a JSON object.");
    return { valid: false, issues, routes: {} as Record<string, never>, packageSnapshot: null };
  }
  const packageSnapshot = cloneAndFreeze(options.packageData);
  validateShape(packageSnapshot, add);
  validatePrimitiveFields(packageSnapshot, add);
  validateApprovalGate(packageSnapshot, now, add);
  const maps = buildRecordMaps(packageSnapshot);

  const programmes = list(packageSnapshot, "programmes").filter(object);
  if (programmes.length !== PROGRAMMES_PUBLICATION_ROUTES.length) add("PROGRAMME_SET_INCOMPLETE", "schema", "programmes", "Exactly the three controlled programme records are required.");
  const seenRoutes = new Set<string>();
  for (const programme of programmes) {
    const route = routeForProgramme(programme);
    if (!route) continue;
    if (seenRoutes.has(route)) add("DUPLICATE_ROUTE", "schema", `${route}.route`, "Programme routes must be unique.", route);
    seenRoutes.add(route);
    validateProgramme(packageSnapshot, programme, route, maps, options.manifest, now, add);
  }
  for (const route of PROGRAMMES_PUBLICATION_ROUTES) {
    if (!seenRoutes.has(route)) add("MISSING_PROGRAMME_ROUTE", "schema", "programmes", `Missing required programme route ${route}.`, route);
  }

  const gateNames: ProgrammesPublicationGate[] = ["schema", "schemaVersion", "academicYear", "approval", "references", "evidence", "results", "claims", "media", "content", "seo"];
  const routes = Object.fromEntries(PROGRAMMES_PUBLICATION_ROUTES.map((route) => {
    const gates = Object.fromEntries(gateNames.map((gate) => [
      gate,
      issues.some((issue) => issue.gate === gate && (!issue.route || issue.route === route)) ? "fail" : "pass",
    ]));
    const navigationValid = !issues.some((issue) => issue.gate === "navigation" && (!issue.route || issue.route === route));
    const publicationReady = Object.values(gates).every((status) => status === "pass");
    return [route, {
      route,
      gates: { ...gates, navigation: navigationValid ? "pass" : "fail" },
      contentComplete: gates.content === "pass",
      academicYearValid: gates.academicYear === "pass",
      approvalValid: gates.approval === "pass",
      referencesValid: gates.references === "pass",
      evidenceValid: gates.evidence === "pass",
      resultsValid: gates.results === "pass",
      claimsValid: gates.claims === "pass",
      mediaValid: gates.media === "pass",
      seoValid: gates.seo === "pass",
      navigationValid,
      publicationReady,
      showInNavigation: publicationReady && navigationValid,
      includeInSitemap: publicationReady,
      indexable: publicationReady && gates.seo === "pass",
      blockers: issues.filter((issue) => !issue.route || issue.route === route),
    }];
  })) as Record<ProgrammesPublicationRoute, {
    route: ProgrammesPublicationRoute;
    gates: Record<string, "pass" | "fail">;
    contentComplete: boolean;
    academicYearValid: boolean;
    approvalValid: boolean;
    referencesValid: boolean;
    evidenceValid: boolean;
    resultsValid: boolean;
    claimsValid: boolean;
    mediaValid: boolean;
    seoValid: boolean;
    navigationValid: boolean;
    publicationReady: boolean;
    showInNavigation: boolean;
    includeInSitemap: boolean;
    indexable: boolean;
    blockers: ProgrammesPublicationIssue[];
  }>;

  const blockingIssues = issues.filter((issue) => issue.gate !== "navigation");

  return {
    valid: blockingIssues.length === 0 && Object.values(routes).every((route) => route.publicationReady),
    issues,
    blockingIssues,
    downstreamIssues: issues.filter((issue) => issue.gate === "navigation"),
    routes,
    packageSnapshot,
  };
}

export function canonicalizeProgrammesPackage(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical JSON does not support non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeProgrammesPackage).join(",")}]`;
  if (object(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalizeProgrammesPackage(value[key])}`).join(",")}}`;
  }
  throw new Error("Canonical JSON supports only JSON values.");
}

export function digestProgrammesPackage(value: unknown) {
  return createHash("sha256").update(canonicalizeProgrammesPackage(value), "utf8").digest("hex");
}

function referencedRecords(programme: JsonObject, maps: RecordMaps) {
  const select = (map: Map<string, JsonObject>, ids: unknown) => Array.isArray(ids) ? ids.map((id) => map.get(String(id))).filter(Boolean) : [];
  const facilityRecords = select(maps.facilities, programme.facilityIds);
  const nestedFacilityMediaIds = facilityRecords.flatMap((facility) => Array.isArray(facility?.mediaIds) ? facility.mediaIds : []);
  const claimIds = [
    ...(Array.isArray(programme.claimIds) ? programme.claimIds : []),
    ...select(maps.fees, programme.feeIds).flatMap((record) => Array.isArray(record?.claimIds) ? record.claimIds : []),
    ...select(maps.scholarships, programme.scholarshipIds).flatMap((record) => Array.isArray(record?.claimIds) ? record.claimIds : []),
    ...select(maps.results, programme.resultIds).map((record) => record?.claimId).filter(Boolean),
  ];
  const evidenceIds = [
    ...(Array.isArray(programme.evidenceIds) ? programme.evidenceIds : []),
    ...select(maps.fees, programme.feeIds).flatMap((record) => Array.isArray(record?.evidenceIds) ? record.evidenceIds : []),
    ...select(maps.scholarships, programme.scholarshipIds).flatMap((record) => Array.isArray(record?.evidenceIds) ? record.evidenceIds : []),
    ...select(maps.faculty, programme.facultyIds).flatMap((record) => Array.isArray(record?.evidenceIds) ? record.evidenceIds : []),
    ...facilityRecords.flatMap((record) => Array.isArray(record?.evidenceIds) ? record.evidenceIds : []),
    ...select(maps.results, programme.resultIds).flatMap((record) => object(record?.verification) && Array.isArray(record.verification.evidenceIds) ? record.verification.evidenceIds : []),
    ...select(maps.media, [...(Array.isArray(programme.mediaIds) ? programme.mediaIds : []), ...nestedFacilityMediaIds]).flatMap((record) => [
      ...(object(record?.rights) && Array.isArray(record.rights.evidenceIds) ? record.rights.evidenceIds : []),
      ...(object(record?.consent) && Array.isArray(record.consent.evidenceIds) ? record.consent.evidenceIds : []),
    ]),
    ...select(maps.claims, claimIds).flatMap((record) => Array.isArray(record?.evidenceIds) ? record.evidenceIds : []),
  ];
  const unique = (values: unknown[]) => [...new Set(values.map(String))];
  const organisation = maps.organisations.get(String(programme.organisationId));
  if (organisation) {
    evidenceIds.push(...(Array.isArray(organisation.evidenceIds) ? organisation.evidenceIds : []));
    claimIds.push(...(Array.isArray(organisation.claimIds) ? organisation.claimIds : []));
  }
  return {
    programme,
    organisation: organisation ?? null,
    faculty: select(maps.faculty, programme.facultyIds),
    facilities: facilityRecords,
    results: select(maps.results, programme.resultIds),
    fees: select(maps.fees, programme.feeIds),
    scholarships: select(maps.scholarships, programme.scholarshipIds),
    media: select(maps.media, unique([...(Array.isArray(programme.mediaIds) ? programme.mediaIds : []), ...nestedFacilityMediaIds])),
    claims: select(maps.claims, unique(claimIds)),
    evidence: select(maps.evidence, unique(evidenceIds)),
    navigation: maps.navigation.get(String(programme.navigationId)) ?? null,
    seo: maps.seo.get(String(programme.seoId)) ?? null,
  };
}

const componentMap: Record<ProgrammesPublicationRoute, string[]> = {
  "/school/academics": ["Hero", "AcademicOverview", "Levels", "Curriculum", "Subjects", "TeachingMethodology", "TestingAssessment", "Faculty", "Facilities", "StudentSupport", "RelatedProgrammes", "AdmissionsCTA"],
  "/junior-college": ["Hero", "OfficialAcademicStatus", "BoardRecognition", "Streams", "Subjects", "AcademicStructure", "EntrancePreparationRelationship", "Faculty", "Facilities", "Eligibility", "Fees", "Schedule", "Admissions", "Results", "AdmissionsCTA"],
  "/programmes/jee-neet": ["Hero", "ProgrammeOverview", "ExamPaths", "DeliveryModel", "Subjects", "Faculty", "TestingMethodology", "StudyMaterial", "Results", "Facilities", "Eligibility", "Fees", "Schedule", "Scholarships", "FAQs", "AdmissionsCTA"],
};

export function buildProgrammesNavigation(routeStates: Record<string, { showInNavigation?: boolean }>, packageData: unknown) {
  if (!object(packageData)) return [];
  const maps = buildRecordMaps(packageData);
  return PROGRAMMES_PUBLICATION_ROUTES.flatMap((route) => {
    if (!routeStates[route]?.showInNavigation) return [];
    const programme = maps.programmes.get(PROGRAMME_ID_BY_ROUTE[route]);
    const navigation = programme ? maps.navigation.get(String(programme.navigationId)) : null;
    return navigation ? [{ id: navigation.id, label: navigation.label, parent: navigation.parent, order: navigation.order, href: route }] : [];
  }).sort((left, right) => Number(left.order) - Number(right.order));
}

export function buildProgrammesSitemap(routeStates: Record<string, { includeInSitemap?: boolean }>) {
  return PROGRAMMES_PUBLICATION_ROUTES.filter((route) => routeStates[route]?.includeInSitemap);
}

export function createProgrammesImplementationPlan(options: ValidationOptions) {
  const validatedAt = options.now instanceof Date ? options.now.toISOString() : new Date(options.now ?? Date.now()).toISOString();
  const validation = validateProgrammesPublicationPackage(options);
  const packageData = validation.packageSnapshot;
  const packageDigest = packageData === null ? null : digestProgrammesPackage(packageData);
  const maps = packageData ? buildRecordMaps(packageData) : null;
  const routeDigests = Object.fromEntries(PROGRAMMES_PUBLICATION_ROUTES.map((route) => {
    const programme = maps?.programmes.get(PROGRAMME_ID_BY_ROUTE[route]);
    return [route, programme && maps ? `sha256:${digestProgrammesPackage(referencedRecords(programme, maps))}` : null];
  }));
  const routes = Object.fromEntries(PROGRAMMES_PUBLICATION_ROUTES.map((route) => {
    const programme = maps?.programmes.get(PROGRAMME_ID_BY_ROUTE[route]);
    const references = programme && maps ? referencedRecords(programme, maps) : null;
    return [route, {
      currentPublicationStatus: validation.routes[route]?.publicationReady ? "READY" : "BLOCKED",
      publicationReady: validation.routes[route]?.publicationReady ?? false,
      gates: validation.routes[route]?.gates ?? {},
      blockers: validation.routes[route]?.blockers ?? validation.issues,
      requiredComponents: componentMap[route],
      referencedRecords: references ? {
        programmeId: programme?.id,
        organisationId: programme?.organisationId,
        facultyIds: references.faculty.map((record) => record?.id),
        facilityIds: references.facilities.map((record) => record?.id),
        feeIds: references.fees.map((record) => record?.id),
        resultIds: references.results.map((record) => record?.id),
        scholarshipIds: references.scholarships.map((record) => record?.id),
        mediaIds: references.media.map((record) => record?.id),
        claimIds: references.claims.map((record) => record?.id),
        evidenceIds: references.evidence.map((record) => record?.id),
      } : null,
      mediaMapping: references?.media.map((record) => ({ id: record?.id, role: record?.role })) ?? [],
      seoMapping: references?.seo ?? null,
      navigationMapping: references?.navigation ?? null,
      claimMapping: references?.claims.map((record) => ({ id: record?.id, type: record?.type, manifestRecordId: record?.manifestRecordId })) ?? [],
      routeDigest: routeDigests[route],
    }];
  }));
  const counts = packageData ? {
    programmes: list(packageData, "programmes").length,
    organisations: list(packageData, "organisations").length,
    faculty: list(packageData, "faculty").length,
    facilities: list(packageData, "facilities").length,
    fees: list(packageData, "fees").length,
    results: list(packageData, "results").length,
    scholarships: list(packageData, "scholarships").length,
    media: list(packageData, "media").length,
    evidence: list(packageData, "evidenceRegistry").length,
    claims: list(packageData, "claims").length,
  } : { programmes: 0, organisations: 0, faculty: 0, facilities: 0, fees: 0, results: 0, scholarships: 0, media: 0, evidence: 0, claims: 0 };
  const publicationAuthorized = validation.valid && Object.values(validation.routes).every((route) => route.publicationReady);
  const receipt = {
    receiptVersion: "1.0",
    packageId: packageData?.packageId ?? null,
    schemaVersion: packageData?.schemaVersion ?? null,
    academicYear: packageData?.academicYear ?? null,
    approvalId: object(packageData?.approval) ? packageData.approval.approvalId ?? null : null,
    validatedAt,
    packageDigest: packageDigest ? { algorithm: "SHA-256", canonicalization: "JCS", value: packageDigest } : null,
    validation: {
      schema: validation.issues.some((issue) => issue.gate === "schema" || issue.gate === "schemaVersion") ? "fail" : "pass",
      academicYear: validation.issues.some((issue) => issue.gate === "academicYear") ? "fail" : "pass",
      approval: validation.issues.some((issue) => issue.gate === "approval") ? "fail" : "pass",
      references: validation.issues.some((issue) => issue.gate === "references") ? "fail" : "pass",
      evidence: validation.issues.some((issue) => issue.gate === "evidence") ? "fail" : "pass",
      results: validation.issues.some((issue) => issue.gate === "results") ? "fail" : "pass",
      claims: validation.issues.some((issue) => issue.gate === "claims") ? "fail" : "pass",
      media: validation.issues.some((issue) => issue.gate === "media") ? "fail" : "pass",
      seo: validation.issues.some((issue) => issue.gate === "seo") ? "fail" : "pass",
    },
    routes: Object.fromEntries(PROGRAMMES_PUBLICATION_ROUTES.map((route) => [route, validation.routes[route]?.publicationReady ? "ready" : "blocked"])),
    counts,
    routeDigests,
    publicationAuthorized,
  };
  const plan = cloneAndFreeze({
    planVersion: "1.0",
    title: "PROGRAMMES IMPLEMENTATION PLAN",
    package: {
      packageId: packageData?.packageId ?? null,
      academicYear: packageData?.academicYear ?? null,
      approval: packageData?.approval ?? null,
      packageDigest: packageDigest ? `sha256:${packageDigest}` : null,
    },
    validation: {
      status: publicationAuthorized ? "READY" : "BLOCKED",
      blockingErrors: validation.blockingIssues ?? validation.issues,
      downstreamBlockers: validation.downstreamIssues ?? [],
      warnings: [],
    },
    routes,
    navigation: buildProgrammesNavigation(validation.routes, packageData),
    sitemap: buildProgrammesSitemap(validation.routes),
    receipt,
    guardrails: {
      packageMutated: false,
      repositoryWritePerformed: false,
      approvalManifestUpdated: false,
      publicContentPublished: false,
      navigationActivated: false,
      sitemapActivated: false,
      deploymentPerformed: false,
    },
  });
  issuedImplementationPlans.add(plan);
  return plan;
}
