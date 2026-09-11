export const migrationSourceKinds = ["page", "post", "category", "post_format", "sk_igallery", "teacher", "user"] as const;
export const migrationAreas = ["home", "about", "academics", "admissions", "disclosure", "facilities", "contact", "media", "news", "identity", "taxonomy", "other"] as const;
export const migrationContentDecisions = ["unselected", "migrate", "rewrite", "merge", "archive", "redirect-only", "retire"] as const;
export const migrationRouteActions = ["unselected", "retain", "redirect", "archive", "retire", "private-only"] as const;
export const migrationImplementationStatuses = ["not-started", "in-progress", "implemented", "verified"] as const;
export const migrationRequiredReviews = ["accuracy", "currency", "editorial", "management-approval", "privacy", "rights", "retention", "institutional-model", "evidence", "accessibility", "data-protection"] as const;
export const legacyMigrationDecisionContractVersion = 2 as const;
export const migrationDecisionReasonCodes = [
  "preserve-existing-public-information",
  "replace-with-current-information",
  "consolidate-overlapping-information",
  "retain-as-controlled-history",
  "preserve-route-continuity-only",
  "remove-obsolete-or-out-of-scope-information",
  "protect-identity-or-private-information",
  "hold-for-rights-or-evidence-review",
] as const;
export const migrationDecisionReasonCodesByDecision = {
  migrate: ["preserve-existing-public-information"],
  rewrite: ["replace-with-current-information"],
  merge: ["consolidate-overlapping-information"],
  archive: ["retain-as-controlled-history", "protect-identity-or-private-information", "hold-for-rights-or-evidence-review"],
  "redirect-only": ["preserve-route-continuity-only", "consolidate-overlapping-information"],
  retire: ["remove-obsolete-or-out-of-scope-information", "protect-identity-or-private-information"],
} as const;
export const migrationDecisionOwnerRoles = [
  "academic-office",
  "admissions-office",
  "compliance-owner",
  "content-editor",
  "media-owner",
  "school-management",
  "school-office",
  "student-life-owner",
  "website-owner",
] as const;
export const migrationPublicTargetNamespaces = [
  "/about",
  "/admissions",
  "/documents",
  "/programmes",
  "/school",
  "/student-life",
] as const;
export const migrationReservedTargetPrefixes = [
  "/_next",
  "/api",
  "/publication-review",
  "/studio",
  "/wp-admin",
  "/wp-content",
  "/wp-includes",
  "/wp-json",
  "/wp-login",
] as const;
export const migrationPublicExactTargets = [
  "/",
  "/appendix-ix",
  "/contact",
  "/guideline-procedure",
  "/institute",
  "/junior-college",
  "/mandatory-public-disclosure",
  "/registration-form",
  "/saras",
  "/section-strength",
  "/student-enrolment",
] as const;
export const legacyMigrationDecisionWorksheetHeaders = [
  "decision_contract_version",
  "matrix_id",
  "matrix_built_on",
  "archive_id",
  "archive_checksum_sha256",
  "expected_matrix_digest",
  "record_id",
  "expected_record_digest",
  "source_reference",
  "source_digest",
  "label",
  "source_kind",
  "area",
  "visibility",
  "legacy_path",
  "required_reviews",
  "current_route_status",
  "current_route_action",
  "current_route_target",
  "current_cutover_record_id",
  "current_content_decision",
  "current_content_target",
  "current_merge_into_record_id",
  "current_reason_code",
  "current_owner_role",
  "current_reviewed_on",
  "implementation_status",
  "proposed_route_action",
  "proposed_route_target",
  "proposed_content_decision",
  "proposed_content_target",
  "proposed_merge_into_record_id",
  "proposed_reason_code",
  "proposed_owner_role",
  "proposed_reviewed_on",
] as const;

export type MigrationSourceKind = (typeof migrationSourceKinds)[number];
export type MigrationArea = (typeof migrationAreas)[number];
export type MigrationContentDecision = (typeof migrationContentDecisions)[number];
export type MigrationRouteAction = (typeof migrationRouteActions)[number];
export type MigrationImplementationStatus = (typeof migrationImplementationStatuses)[number];
export type MigrationRequiredReview = (typeof migrationRequiredReviews)[number];
export type MigrationDecisionReasonCode = (typeof migrationDecisionReasonCodes)[number];
export type MigrationDecisionOwnerRole = (typeof migrationDecisionOwnerRoles)[number];

export function validMigrationDecisionReason(decision: unknown, reason: unknown) {
  if (typeof decision !== "string" || decision === "unselected" || typeof reason !== "string") return false;
  const allowed = migrationDecisionReasonCodesByDecision[decision as keyof typeof migrationDecisionReasonCodesByDecision];
  return Array.isArray(allowed) && allowed.some((code) => code === reason);
}

export type LegacyContentMigrationRecord = {
  id: string;
  label: string;
  sourceRef: string;
  sourceDigest: string;
  sourceKind: MigrationSourceKind;
  sourceVisibility: "public" | "private-review";
  sourceStatus: "publish" | "public-index" | "draft";
  sourceModifiedOn: string | null;
  area: MigrationArea;
  identityProtected: boolean;
  legacyPath: string | null;
  routeContinuity: {
    status: "implemented" | "decision-required" | "planned";
    action: MigrationRouteAction;
    targetPath: string | null;
    cutoverRecordId: string | null;
  };
  requiredReviews: MigrationRequiredReview[];
  contentDecision: {
    decision: MigrationContentDecision;
    targetPath: string | null;
    mergeIntoRecordId: string | null;
    rationale: string | null;
    ownerRole: string | null;
    reviewedOn: string | null;
  };
  implementationStatus: MigrationImplementationStatus;
  publicationEligible: boolean;
  publicationReason: "decision-and-approval-required" | "implementation-unverified" | "approval-required" | "verified-for-separate-publication-gates";
};

export type LegacyContentMigrationMatrix = {
  $schema: string;
  schemaVersion: number;
  matrixId: string;
  builtOn: string;
  archive: {
    id: string;
    capturedOn: string;
    sitemapSha256: string;
    checksumManifestSha256: string;
    expectedRecords: number;
    expectedPublicRecords: number;
    expectedPrivateRecords: number;
  };
  policy: {
    legacyContentIsApprovalEvidence: boolean;
    privateSourceDetailsStored: boolean;
    decisionsPreselected: boolean;
    downloadPersistsChanges: boolean;
    publicPublicationAllowed: boolean;
    notes: string;
  };
  records: LegacyContentMigrationRecord[];
};

export type MigrationValidationIssue = {
  code: string;
  path: string;
  message: string;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (object(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

export function stableLegacyMigrationJson(value: unknown) {
  return JSON.stringify(stableValue(value));
}

export async function fingerprintLegacyMigrationValue(value: unknown) {
  const bytes = new TextEncoder().encode(stableLegacyMigrationJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const sourceKindSet = new Set<string>(migrationSourceKinds);
const areaSet = new Set<string>(migrationAreas);
const contentDecisionSet = new Set<string>(migrationContentDecisions);
const routeActionSet = new Set<string>(migrationRouteActions);
const implementationStatusSet = new Set<string>(migrationImplementationStatuses);
const requiredReviewSet = new Set<string>(migrationRequiredReviews);
const baselineReviews = ["accuracy", "currency", "editorial", "management-approval"];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const pathPattern = /^(?:\/|\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+)$/;
const decisionOwnerRoleSet = new Set<string>(migrationDecisionOwnerRoles);

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validLegacyMigrationDate(value: unknown) {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function validDateTime(value: unknown) {
  if (typeof value !== "string" || !dateTimePattern.test(value)) return false;
  const parsed = new Date(`${value}Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 19) === value;
}

export function validLegacyMigrationPath(value: unknown) {
  return typeof value === "string" && pathPattern.test(value) && !value.includes("//");
}

export function validNonReservedLegacyMigrationTargetPath(value: unknown) {
  return validLegacyMigrationPath(value)
    && !migrationReservedTargetPrefixes.some((prefix) => value === prefix || (value as string).startsWith(`${prefix}/`));
}

export function validPublicMigrationPath(value: unknown) {
  if (!validNonReservedLegacyMigrationTargetPath(value)) return false;
  if (migrationPublicExactTargets.includes(value as (typeof migrationPublicExactTargets)[number])) return true;
  return migrationPublicTargetNamespaces.some((namespace) => value === namespace || (value as string).startsWith(`${namespace}/`));
}

function reportUnknownKeys(value: unknown, allowed: readonly string[], path: string, add: (code: string, path: string, message: string) => void) {
  if (!object(value)) return;
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) add("unknown-field", `${path}.${key}`, "Unknown migration-matrix fields are rejected.");
  }
}

export function validateLegacyContentMigrationMatrix(value: unknown): MigrationValidationIssue[] {
  const issues: MigrationValidationIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  if (!object(value)) {
    add("invalid-matrix", "$", "Migration matrix must be a JSON object.");
    return issues;
  }

  reportUnknownKeys(value, ["$schema", "schemaVersion", "matrixId", "builtOn", "archive", "policy", "records"], "$", add);
  if (value.$schema !== "./legacy-content-migration-matrix.schema.json") add("schema-pointer", "$schema", "Use the canonical matrix schema pointer.");
  if (value.schemaVersion !== 1) add("schema-version", "schemaVersion", "Only schema version 1 is supported.");
  if (value.matrixId !== "sskem-legacy-content-migration") add("matrix-id", "matrixId", "Unexpected migration matrix ID.");
  if (!validLegacyMigrationDate(value.builtOn)) add("built-on", "builtOn", "Use a real YYYY-MM-DD build date.");

  if (!object(value.archive)) {
    add("archive", "archive", "An exact archive binding is required.");
  } else {
    reportUnknownKeys(value.archive, ["id", "capturedOn", "sitemapSha256", "checksumManifestSha256", "expectedRecords", "expectedPublicRecords", "expectedPrivateRecords"], "archive", add);
    if (value.archive.id !== "SSKEMS-BACKUP-2026-08-29") add("archive-id", "archive.id", "Matrix must remain bound to the captured archive.");
    if (value.archive.capturedOn !== "2026-08-29") add("archive-date", "archive.capturedOn", "Unexpected archive capture date.");
    if (!sha256Pattern.test(String(value.archive.sitemapSha256 ?? ""))) add("sitemap-digest", "archive.sitemapSha256", "A SHA-256 sitemap digest is required.");
    if (!sha256Pattern.test(String(value.archive.checksumManifestSha256 ?? ""))) add("checksum-digest", "archive.checksumManifestSha256", "A SHA-256 checksum-manifest digest is required.");
    if (value.archive.expectedRecords !== 115 || value.archive.expectedPublicRecords !== 108 || value.archive.expectedPrivateRecords !== 7) add("archive-counts", "archive", "Archive counts must remain 115 total, 108 public and 7 private.");
  }

  if (!object(value.policy)) {
    add("policy", "policy", "A fail-closed migration policy is required.");
  } else {
    reportUnknownKeys(value.policy, ["legacyContentIsApprovalEvidence", "privateSourceDetailsStored", "decisionsPreselected", "downloadPersistsChanges", "publicPublicationAllowed", "notes"], "policy", add);
    for (const key of ["legacyContentIsApprovalEvidence", "privateSourceDetailsStored", "decisionsPreselected", "downloadPersistsChanges", "publicPublicationAllowed"]) {
      if (value.policy[key] !== false) add("unsafe-policy", `policy.${key}`, `${key} must remain false.`);
    }
    if (typeof value.policy.notes !== "string" || value.policy.notes.trim().length < 40) add("policy-notes", "policy.notes", "Explain the migration safety boundary.");
  }

  if (!Array.isArray(value.records)) {
    add("records", "records", "Migration records are required.");
    return issues;
  }
  if (value.records.length !== 115) add("record-count", "records", "The matrix must contain all 115 archive content records.");

  const ids = new Set<string>();
  const allRecordIds = new Set(
    value.records
      .filter(object)
      .map((record) => record.id)
      .filter((id): id is string => typeof id === "string"),
  );
  const sourceRefs = new Set<string>();
  const cutoverIds = new Set<string>();
  const mergeTargets = new Map<string, string>();
  const recordsById = new Map(
    value.records
      .filter(object)
      .map((record) => [record.id, record]),
  );
  for (const [index, candidate] of value.records.entries()) {
    const path = `records[${index}]`;
    if (!object(candidate)) {
      add("record", path, "Every migration record must be an object.");
      continue;
    }
    reportUnknownKeys(candidate, ["id", "label", "sourceRef", "sourceDigest", "sourceKind", "sourceVisibility", "sourceStatus", "sourceModifiedOn", "area", "identityProtected", "legacyPath", "routeContinuity", "requiredReviews", "contentDecision", "implementationStatus", "publicationEligible", "publicationReason"], path, add);

    if (typeof candidate.id !== "string" || !/^migration-[a-f0-9]{16}$/.test(candidate.id)) add("record-id", `${path}.id`, "Use the generated opaque migration ID.");
    if (ids.has(String(candidate.id))) add("duplicate-id", `${path}.id`, "Migration IDs must be unique.");
    ids.add(String(candidate.id));
    if (typeof candidate.sourceRef !== "string" || !/^archive-content-[a-f0-9]{16}$/.test(candidate.sourceRef)) add("source-ref", `${path}.sourceRef`, "Use an opaque archive content reference.");
    if (sourceRefs.has(String(candidate.sourceRef))) add("duplicate-source-ref", `${path}.sourceRef`, "Source references must be unique.");
    sourceRefs.add(String(candidate.sourceRef));
    if (!sha256Pattern.test(String(candidate.sourceDigest ?? ""))) add("source-digest", `${path}.sourceDigest`, "Bind the exact archived Markdown digest.");
    if (typeof candidate.label !== "string" || candidate.label.trim().length < 3 || candidate.label.length > 160) add("label", `${path}.label`, "Use a concise display label.");
    if (!sourceKindSet.has(String(candidate.sourceKind))) add("source-kind", `${path}.sourceKind`, "Unsupported source kind.");
    if (!areaSet.has(String(candidate.area))) add("area", `${path}.area`, "Unsupported migration area.");
    if (candidate.sourceVisibility !== "public" && candidate.sourceVisibility !== "private-review") add("source-visibility", `${path}.sourceVisibility`, "Unsupported source visibility.");
    if (!["publish", "public-index", "draft"].includes(String(candidate.sourceStatus))) add("source-status", `${path}.sourceStatus`, "Unsupported WordPress source status.");
    if (candidate.sourceModifiedOn !== null && !validDateTime(candidate.sourceModifiedOn)) add("source-modified", `${path}.sourceModifiedOn`, "Use a WordPress UTC timestamp or null.");
    if (candidate.sourceVisibility === "private-review" && candidate.sourceStatus !== "draft") add("private-status", path, "Private review records must remain draft sources.");
    if (candidate.sourceVisibility === "public" && candidate.sourceStatus === "draft") add("public-status", path, "Draft sources cannot be marked public.");

    const mustProtectIdentity = candidate.sourceVisibility === "private-review" || candidate.sourceKind === "teacher" || candidate.sourceKind === "user";
    if (candidate.identityProtected !== mustProtectIdentity) add("identity-protection", `${path}.identityProtected`, "Draft, teacher and user records must remain identity protected.");
    if (mustProtectIdentity) {
      if (candidate.legacyPath !== null) add("private-path", `${path}.legacyPath`, "Identity-protected paths must remain outside the repository matrix.");
      if (typeof candidate.label !== "string" || !/^(Private|Identity-bearing) (page|post|teacher|user) record$/.test(candidate.label)) add("private-label", `${path}.label`, "Identity-protected labels must remain generic.");
    } else if (!validLegacyMigrationPath(candidate.legacyPath)) {
      add("public-path", `${path}.legacyPath`, "Non-sensitive public sources require a normalized legacy path.");
    }

    if (!Array.isArray(candidate.requiredReviews)) {
      add("required-reviews", `${path}.requiredReviews`, "Required review names must be an array.");
    } else {
      if (new Set(candidate.requiredReviews).size !== candidate.requiredReviews.length) add("duplicate-review", `${path}.requiredReviews`, "Required reviews must be unique.");
      for (const review of candidate.requiredReviews) if (!requiredReviewSet.has(String(review))) add("review-name", `${path}.requiredReviews`, `Unknown review ${review}.`);
      for (const baseline of baselineReviews) if (!candidate.requiredReviews.includes(baseline)) add("baseline-review", `${path}.requiredReviews`, `Every record requires ${baseline}.`);
    }

    if (!object(candidate.routeContinuity)) {
      add("route-continuity", `${path}.routeContinuity`, "A route disposition is required.");
    } else {
      reportUnknownKeys(candidate.routeContinuity, ["status", "action", "targetPath", "cutoverRecordId"], `${path}.routeContinuity`, add);
      const route = candidate.routeContinuity;
      if (!["implemented", "decision-required", "planned"].includes(String(route.status))) add("route-status", `${path}.routeContinuity.status`, "Unsupported route status.");
      if (!routeActionSet.has(String(route.action))) add("route-action", `${path}.routeContinuity.action`, "Unsupported route action.");
      if (route.targetPath !== null && !validNonReservedLegacyMigrationTargetPath(route.targetPath)) add("route-target", `${path}.routeContinuity.targetPath`, "Route targets must be normalized, non-reserved internal paths.");
      if (route.status === "implemented") {
        if (!["retain", "redirect"].includes(String(route.action))) add("implemented-action", `${path}.routeContinuity.action`, "Imported cutover routes must retain or redirect.");
        if (!validPublicMigrationPath(route.targetPath)) add("implemented-target", `${path}.routeContinuity.targetPath`, "Implemented routes require a registered public target.");
        if (typeof route.cutoverRecordId !== "string" || !/^legacy-[a-z0-9-]+$/.test(route.cutoverRecordId)) add("cutover-id", `${path}.routeContinuity.cutoverRecordId`, "Implemented routes require their cutover record ID.");
        if (cutoverIds.has(String(route.cutoverRecordId))) add("duplicate-cutover-id", `${path}.routeContinuity.cutoverRecordId`, "A cutover record may reconcile only once.");
        cutoverIds.add(String(route.cutoverRecordId));
      } else if (route.status === "decision-required") {
        if (route.action !== "unselected" || route.targetPath !== null || route.cutoverRecordId !== null) add("preselected-route", `${path}.routeContinuity`, "Decision-required routes must remain entirely unselected.");
      } else if (route.action === "unselected") {
        add("planned-route", `${path}.routeContinuity.action`, "A planned route requires an explicit action.");
      } else {
        const targetRequired = route.action === "retain" || route.action === "redirect";
        const targetValid = route.action === "retain"
          ? validNonReservedLegacyMigrationTargetPath(route.targetPath)
          : route.action === "redirect"
            ? validPublicMigrationPath(route.targetPath)
            : route.targetPath === null;
        if ((targetRequired && !targetValid) || (!targetRequired && route.targetPath !== null)) add("planned-route-target", `${path}.routeContinuity.targetPath`, "The planned route action and public target are incompatible.");
        if (mustProtectIdentity && !["archive", "retire", "private-only"].includes(String(route.action))) add("planned-identity-route", `${path}.routeContinuity.action`, "Identity-protected routes may only be archived, retired or kept private.");
        if (!mustProtectIdentity && route.action === "private-only") add("planned-public-route", `${path}.routeContinuity.action`, "A public non-identity route cannot use private-only treatment.");
        if (!mustProtectIdentity && route.action === "retain" && route.targetPath !== candidate.legacyPath) add("planned-retain-target", `${path}.routeContinuity.targetPath`, "Retain must preserve the normalized legacy path.");
      }
    }

    if (!object(candidate.contentDecision)) {
      add("content-decision", `${path}.contentDecision`, "A content decision object is required.");
    } else {
      reportUnknownKeys(candidate.contentDecision, ["decision", "targetPath", "mergeIntoRecordId", "rationale", "ownerRole", "reviewedOn"], `${path}.contentDecision`, add);
      const decision = candidate.contentDecision;
      if (!contentDecisionSet.has(String(decision.decision))) add("decision", `${path}.contentDecision.decision`, "Unsupported content decision.");
      if (decision.targetPath !== null && !validPublicMigrationPath(decision.targetPath)) add("decision-target", `${path}.contentDecision.targetPath`, "Content targets must be normalized public-site paths.");
      if (decision.mergeIntoRecordId !== null && (typeof decision.mergeIntoRecordId !== "string" || !/^migration-[a-f0-9]{16}$/.test(decision.mergeIntoRecordId))) add("merge-target", `${path}.contentDecision.mergeIntoRecordId`, "Merge targets must use a canonical migration record ID.");
      if (decision.decision === "unselected") {
        if ([decision.targetPath, decision.mergeIntoRecordId, decision.rationale, decision.ownerRole, decision.reviewedOn].some((field) => field !== null)) add("preselected-content", `${path}.contentDecision`, "Unselected content decisions cannot contain completion data.");
      } else {
        if (!validMigrationDecisionReason(decision.decision, decision.rationale)) add("decision-rationale", `${path}.contentDecision.rationale`, "Selected decisions require an allowed controlled reason code for that decision.");
        if (typeof decision.ownerRole !== "string" || !decisionOwnerRoleSet.has(decision.ownerRole)) add("decision-owner", `${path}.contentDecision.ownerRole`, "Use one of the controlled institutional role codes.");
        if (!validLegacyMigrationDate(decision.reviewedOn)) add("decision-date", `${path}.contentDecision.reviewedOn`, "Selected decisions require a valid review date.");
        if (["migrate", "rewrite", "redirect-only"].includes(String(decision.decision)) && !validPublicMigrationPath(decision.targetPath)) add("required-content-target", `${path}.contentDecision.targetPath`, "This decision requires a public target path.");
        if (decision.decision === "merge") {
          const mergeIntoRecordId = typeof decision.mergeIntoRecordId === "string" ? decision.mergeIntoRecordId : null;
          const mergeTarget = mergeIntoRecordId ? recordsById.get(mergeIntoRecordId) : undefined;
          if (!mergeTarget || !mergeIntoRecordId || !allRecordIds.has(mergeIntoRecordId) || mergeIntoRecordId === candidate.id || mergeTarget.identityProtected === true || mergeTarget.sourceVisibility !== "public") add("required-merge-target", `${path}.contentDecision.mergeIntoRecordId`, "Merge requires another public, non-identity canonical matrix record ID.");
          else mergeTargets.set(String(candidate.id), mergeIntoRecordId);
          if (decision.targetPath !== null) add("unexpected-content-target", `${path}.contentDecision.targetPath`, "Merge decisions cannot carry a direct public content target.");
        } else if (decision.mergeIntoRecordId !== null) {
          add("unexpected-merge-target", `${path}.contentDecision.mergeIntoRecordId`, "Only merge decisions may carry a merge record ID.");
        }
        if (["archive", "retire"].includes(String(decision.decision)) && decision.targetPath !== null) add("unexpected-content-target", `${path}.contentDecision.targetPath`, "Archive and retire decisions cannot carry a public content target.");
        if (mustProtectIdentity && !["archive", "retire"].includes(String(decision.decision))) add("identity-content-decision", `${path}.contentDecision.decision`, "Identity-protected sources may only be archived or retired by this repository decision contract.");
        if (decision.decision === "redirect-only" && object(candidate.routeContinuity) && (candidate.routeContinuity.action !== "redirect" || candidate.routeContinuity.targetPath !== decision.targetPath)) add("redirect-content-route", path, "Redirect-only content must match the planned redirect route and target.");
      }
    }

    if (!implementationStatusSet.has(String(candidate.implementationStatus))) add("implementation-status", `${path}.implementationStatus`, "Unsupported implementation status.");
    const contentSelected = object(candidate.contentDecision) && candidate.contentDecision.decision !== "unselected";
    const routeSelected = object(candidate.routeContinuity) && candidate.routeContinuity.action !== "unselected" && candidate.routeContinuity.status !== "decision-required";
    if (candidate.implementationStatus === "verified" && (!contentSelected || !routeSelected)) add("unverified-plan", path, "Verified implementation requires both route and content decisions.");
    if (candidate.publicationEligible !== false && candidate.publicationEligible !== true) add("publication-eligible", `${path}.publicationEligible`, "Publication eligibility must be boolean.");
    if (candidate.publicationEligible === true && (candidate.implementationStatus !== "verified" || candidate.publicationReason !== "verified-for-separate-publication-gates")) add("unsafe-publication", path, "Publication eligibility requires verified implementation and separate publication gates.");
    if (candidate.implementationStatus !== "verified" && candidate.publicationEligible !== false) add("premature-publication", path, "Unverified migration records must fail closed.");

    const serialized = JSON.stringify(candidate);
    if (/source_url|content_file|source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\|\/Users\//i.test(serialized)) add("private-source-detail", path, "Repository records may contain only opaque archive references.");
  }

  const publicRecords = value.records.filter((record) => object(record) && record.sourceVisibility === "public").length;
  const privateRecords = value.records.filter((record) => object(record) && record.sourceVisibility === "private-review").length;
  const implementedRoutes = value.records.filter((record) => object(record) && object(record.routeContinuity) && record.routeContinuity.status === "implemented").length;
  if (publicRecords !== 108 || privateRecords !== 7) add("visibility-counts", "records", "Matrix must retain 108 public and 7 private records.");
  if (implementedRoutes !== 35 || cutoverIds.size !== 35) add("cutover-count", "records", "Exactly 35 existing cutover records must reconcile.");
  for (const start of mergeTargets.keys()) {
    const visited = new Set<string>();
    let current: string | undefined = start;
    while (current && mergeTargets.has(current)) {
      if (visited.has(current)) {
        add("merge-cycle", "records", "Content merge decisions cannot form a cycle.");
        break;
      }
      visited.add(current);
      current = mergeTargets.get(current);
    }
  }
  return issues;
}

export function legacyContentMigrationSummary(matrix: LegacyContentMigrationMatrix) {
  const records = matrix.records ?? [];
  const contentDecided = records.filter((record) => record.contentDecision.decision !== "unselected").length;
  const routeDecided = records.filter((record) => record.routeContinuity.action !== "unselected" && record.routeContinuity.status !== "decision-required").length;
  const verified = records.filter((record) => record.implementationStatus === "verified" && record.contentDecision.decision !== "unselected" && record.routeContinuity.action !== "unselected" && record.routeContinuity.status !== "decision-required").length;
  const countBy = <T extends string>(values: readonly T[]) => Object.fromEntries(values.map((value) => [value, records.filter((record) => Object.values(record).includes(value)).length]));
  return {
    total: records.length,
    publicRecords: records.filter((record) => record.sourceVisibility === "public").length,
    privateRecords: records.filter((record) => record.sourceVisibility === "private-review").length,
    routeImplemented: records.filter((record) => record.routeContinuity.status === "implemented").length,
    routeDecided,
    routeDecisionRequired: records.filter((record) => record.routeContinuity.status === "decision-required").length,
    publicRouteDecisionRequired: records.filter((record) => record.sourceVisibility === "public" && record.routeContinuity.status === "decision-required").length,
    contentDecided,
    contentDecisionRequired: records.length - contentDecided,
    verified,
    completionReady: records.length > 0 && verified === records.length,
    byKind: countBy(migrationSourceKinds),
    byArea: Object.fromEntries(migrationAreas.map((area) => [area, records.filter((record) => record.area === area).length])),
  } as const;
}

function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  const effective = text
    .normalize("NFKC")
    .replace(/^[\s\uFEFF\u200B-\u200D\u202A-\u202E\u2060\u2066-\u2069]*/u, "");
  if (/^[=+\-@]/.test(effective)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

async function legacyContentMigrationCsvForSelection(
  matrix: LegacyContentMigrationMatrix,
  records: readonly LegacyContentMigrationRecord[],
) {
  const matrixDigest = await fingerprintLegacyMigrationValue(matrix);
  const recordDigests = await Promise.all(records.map(fingerprintLegacyMigrationValue));
  const rows = records.map((record, index) => {
    const routeIsOpen = record.routeContinuity.status === "decision-required";
    const contentIsOpen = record.contentDecision.decision === "unselected";
    return [
      String(legacyMigrationDecisionContractVersion),
      matrix.matrixId,
      matrix.builtOn,
      matrix.archive.id,
      matrix.archive.checksumManifestSha256,
      matrixDigest,
      record.id,
      recordDigests[index],
      record.sourceRef,
      record.sourceDigest,
      record.label,
      record.sourceKind,
      record.area,
      record.sourceVisibility,
      record.legacyPath,
      record.requiredReviews.join(" | "),
      record.routeContinuity.status,
      record.routeContinuity.action,
      record.routeContinuity.targetPath,
      record.routeContinuity.cutoverRecordId,
      record.contentDecision.decision,
      record.contentDecision.targetPath,
      record.contentDecision.mergeIntoRecordId,
      record.contentDecision.rationale,
      record.contentDecision.ownerRole,
      record.contentDecision.reviewedOn,
      record.implementationStatus,
      routeIsOpen ? "" : record.routeContinuity.action,
      routeIsOpen ? "" : record.routeContinuity.targetPath,
      contentIsOpen ? "" : record.contentDecision.decision,
      contentIsOpen ? "" : record.contentDecision.targetPath,
      contentIsOpen ? "" : record.contentDecision.mergeIntoRecordId,
      contentIsOpen ? "" : record.contentDecision.rationale,
      contentIsOpen ? "" : record.contentDecision.ownerRole,
      contentIsOpen ? "" : record.contentDecision.reviewedOn,
    ];
  });
  return `\uFEFF${[legacyMigrationDecisionWorksheetHeaders, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export async function legacyContentMigrationCsv(matrix: LegacyContentMigrationMatrix) {
  return legacyContentMigrationCsvForSelection(matrix, matrix.records);
}

export async function legacyContentMigrationWaveCsv(
  matrix: LegacyContentMigrationMatrix,
  recordIds: readonly string[],
) {
  const recordsById = new Map(matrix.records.map((record) => [record.id, record]));
  const seen = new Set<string>();
  const records = recordIds.map((recordId) => {
    if (seen.has(recordId)) throw new Error(`Duplicate legacy migration wave record: ${recordId}`);
    seen.add(recordId);
    const record = recordsById.get(recordId);
    if (!record) throw new Error(`Unknown legacy migration wave record: ${recordId}`);
    return record;
  });
  return legacyContentMigrationCsvForSelection(matrix, records);
}
