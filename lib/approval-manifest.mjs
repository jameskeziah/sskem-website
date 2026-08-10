import { readFile } from "node:fs/promises";

export const approvalManifestUrl = new URL("../content/approval-manifest.json", import.meta.url);

const allowedKinds = new Set(["media", "claim", "document"]);
const allowedDecisions = new Set(["blocked", "review-required", "approved", "withdrawn"]);
const allowedCheckStates = new Set(["pending", "verified", "not-applicable", "failed", "withdrawn"]);
const releaseCheckStates = new Set(["verified", "not-applicable"]);
const evidenceReferencePattern = /^[A-Z0-9][A-Z0-9._/-]{2,79}$/;
const recordIdPattern = /^(media|claim|document)-[a-z0-9-]+$/;
const checkNamePattern = /^[a-z][a-z0-9-]*$/;

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function validDateTime(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value));
}

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function reportUnknownKeys(value, allowed, path, add) {
  if (!object(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) add("unknown-field", `${path}.${key}`, "Unknown fields are rejected to prevent silent approval-data typos.");
  }
}

export async function loadApprovalManifest() {
  return JSON.parse(await readFile(approvalManifestUrl, "utf8"));
}

export function validateApprovalManifest(manifest) {
  const issues = [];
  const add = (code, path, message) => issues.push({ code, path, message });

  if (!object(manifest)) {
    add("invalid-manifest", "$", "Manifest must be a JSON object.");
    return issues;
  }
  reportUnknownKeys(
    manifest,
    new Set(["$schema", "schemaVersion", "manifestId", "updatedOn", "evidencePolicy", "checkProfiles", "records"]),
    "$",
    add,
  );
  if (manifest.$schema !== "./approval-manifest.schema.json") add("schema-pointer", "$schema", "Manifest must reference the project approval schema.");
  if (manifest.schemaVersion !== 1) add("schema-version", "schemaVersion", "Only schema version 1 is supported.");
  if (manifest.manifestId !== "sskem-publication-approvals") add("manifest-id", "manifestId", "Unexpected manifest identifier.");
  if (!validDate(manifest.updatedOn)) add("updated-on", "updatedOn", "Use a valid YYYY-MM-DD date.");

  if (!object(manifest.evidencePolicy) || manifest.evidencePolicy.privateEvidenceStoredInRepository !== false) {
    add("private-evidence-policy", "evidencePolicy", "Private evidence must remain outside the repository.");
  } else if (manifest.evidencePolicy.referencePattern !== evidenceReferencePattern.source) {
    add("evidence-reference-pattern", "evidencePolicy.referencePattern", "Evidence reference policy must match the enforced opaque-ID pattern.");
  }
  reportUnknownKeys(
    manifest.evidencePolicy,
    new Set(["privateEvidenceStoredInRepository", "referencePattern", "notes"]),
    "evidencePolicy",
    add,
  );

  const profiles = object(manifest.checkProfiles) ? manifest.checkProfiles : {};
  if (!Object.keys(profiles).length) add("check-profiles", "checkProfiles", "At least one check profile is required.");
  for (const [profile, checks] of Object.entries(profiles)) {
    if (!checkNamePattern.test(profile)) add("check-profile-name", `checkProfiles.${profile}`, "Profile names use lowercase kebab case.");
    if (!Array.isArray(checks) || !checks.length) {
      add("check-profile-empty", `checkProfiles.${profile}`, "A check profile must contain at least one check.");
      continue;
    }
    if (new Set(checks).size !== checks.length) add("duplicate-profile-check", `checkProfiles.${profile}`, "Profile checks must be unique.");
    for (const check of checks) {
      if (typeof check !== "string" || !checkNamePattern.test(check)) {
        add("check-name", `checkProfiles.${profile}`, "Check names use lowercase kebab case.");
      }
    }
  }

  if (!Array.isArray(manifest.records) || !manifest.records.length) {
    add("records", "records", "At least one approval record is required.");
    return issues;
  }

  const seenIds = new Set();
  for (const [index, record] of manifest.records.entries()) {
    const path = `records[${index}]`;
    if (!object(record)) {
      add("record", path, "Each record must be an object.");
      continue;
    }
    reportUnknownKeys(
      record,
      new Set([
        "id", "kind", "title", "sourcePointer", "publicTargets", "checkProfile", "checks",
        "decision", "evidenceReferences", "approvedByRole", "approvedAt", "expiresAt", "notes",
      ]),
      path,
      add,
    );
    if (typeof record.id !== "string" || !recordIdPattern.test(record.id)) add("record-id", `${path}.id`, "Record IDs must use the kind-prefixed kebab-case format.");
    if (seenIds.has(record.id)) add("duplicate-record", `${path}.id`, `Duplicate record ID ${record.id}.`);
    seenIds.add(record.id);
    if (!allowedKinds.has(record.kind)) add("record-kind", `${path}.kind`, "Kind must be media, claim or document.");
    if (typeof record.id === "string" && allowedKinds.has(record.kind) && !record.id.startsWith(`${record.kind}-`)) {
      add("kind-id-mismatch", `${path}.id`, "Record ID prefix must match its kind.");
    }
    if (typeof record.title !== "string" || record.title.trim().length < 3) add("record-title", `${path}.title`, "A descriptive title is required.");
    if (typeof record.sourcePointer !== "string" || record.sourcePointer.length < 3) {
      add("source-pointer", `${path}.sourcePointer`, "A repository source pointer is required.");
    } else if (/^(?:[a-z]:|file:)|\\/i.test(record.sourcePointer)) {
      add("private-source-pointer", `${path}.sourcePointer`, "Source pointers must be repository-relative and public-safe.");
    }
    if (!Array.isArray(record.publicTargets)) {
      add("public-targets", `${path}.publicTargets`, "Public targets must be an array.");
    } else {
      if (new Set(record.publicTargets).size !== record.publicTargets.length) add("duplicate-target", `${path}.publicTargets`, "Public targets must be unique.");
      for (const target of record.publicTargets) {
        if (typeof target !== "string" || !target.startsWith("/")) add("public-target", `${path}.publicTargets`, "Public targets must be site-relative paths.");
      }
    }

    const requiredChecks = profiles[record.checkProfile];
    if (!Array.isArray(requiredChecks)) add("unknown-check-profile", `${path}.checkProfile`, `Unknown check profile ${record.checkProfile}.`);
    if (!object(record.checks)) {
      add("record-checks", `${path}.checks`, "Checks must be an object.");
    } else if (Array.isArray(requiredChecks)) {
      for (const check of requiredChecks) {
        if (!(check in record.checks)) add("missing-check", `${path}.checks.${check}`, "Required check is missing.");
      }
      for (const [check, state] of Object.entries(record.checks)) {
        if (!requiredChecks.includes(check)) add("unexpected-check", `${path}.checks.${check}`, "Check is not part of the selected profile.");
        if (!allowedCheckStates.has(state)) add("check-state", `${path}.checks.${check}`, "Unknown check state.");
      }
    }

    if (!allowedDecisions.has(record.decision)) add("decision", `${path}.decision`, "Unknown approval decision.");
    if (!Array.isArray(record.evidenceReferences)) {
      add("evidence-references", `${path}.evidenceReferences`, "Evidence references must be an array.");
    } else {
      if (new Set(record.evidenceReferences).size !== record.evidenceReferences.length) add("duplicate-evidence", `${path}.evidenceReferences`, "Evidence references must be unique.");
      for (const reference of record.evidenceReferences) {
        if (typeof reference !== "string" || !evidenceReferencePattern.test(reference)) {
          add("unsafe-evidence-reference", `${path}.evidenceReferences`, "Evidence must use an opaque controlled-record ID, never a path, email or document content.");
        }
      }
    }

    const approved = record.decision === "approved";
    if (approved) {
      if (!Array.isArray(record.evidenceReferences) || !record.evidenceReferences.length) add("approval-evidence", `${path}.evidenceReferences`, "Approved records require controlled evidence references.");
      if (typeof record.approvedByRole !== "string" || !/^[a-z][a-z0-9-]{2,63}$/.test(record.approvedByRole)) add("approval-role", `${path}.approvedByRole`, "Approved records require a lowercase role identifier, never an approver identity.");
      if (!validDateTime(record.approvedAt)) add("approval-time", `${path}.approvedAt`, "Approved records require an ISO date-time.");
      if (object(record.checks)) {
        for (const check of requiredChecks ?? []) {
          if (!releaseCheckStates.has(record.checks[check])) add("approval-check", `${path}.checks.${check}`, "Every required check must be verified or not applicable before approval.");
        }
      }
    } else {
      if (record.approvedByRole !== null) add("stale-approval-role", `${path}.approvedByRole`, "Non-approved records must not retain an approving role.");
      if (record.approvedAt !== null) add("stale-approval-time", `${path}.approvedAt`, "Non-approved records must not retain an approval time.");
    }

    if (record.expiresAt !== null && !validDate(record.expiresAt)) add("expiry-date", `${path}.expiresAt`, "Expiry must be null or YYYY-MM-DD.");
    if (approved && validDate(record.expiresAt) && validDate(manifest.updatedOn) && record.expiresAt <= manifest.updatedOn) {
      add("expired-approval", `${path}.expiresAt`, "An expired record cannot remain approved.");
    }
    if (record.decision === "withdrawn" && Array.isArray(record.publicTargets) && record.publicTargets.length) {
      add("withdrawn-target", `${path}.publicTargets`, "Withdrawn records must have no public targets.");
    }
    if (typeof record.notes !== "string" || record.notes.trim().length < 3) add("record-notes", `${path}.notes`, "Operational notes are required.");
  }

  return issues;
}

export function approvalSummary(manifest) {
  const byKind = { media: 0, claim: 0, document: 0 };
  const byDecision = { blocked: 0, "review-required": 0, approved: 0, withdrawn: 0 };
  for (const record of manifest.records ?? []) {
    if (record.kind in byKind) byKind[record.kind] += 1;
    if (record.decision in byDecision) byDecision[record.decision] += 1;
  }
  const blockingRecords = (manifest.records ?? []).filter(
    (record) => Array.isArray(record.publicTargets) && record.publicTargets.length > 0 && record.decision !== "approved",
  );
  const blockingByKind = { media: 0, claim: 0, document: 0 };
  for (const record of blockingRecords) {
    if (record.kind in blockingByKind) blockingByKind[record.kind] += 1;
  }
  return {
    total: manifest.records?.length ?? 0,
    byKind,
    byDecision,
    blockingRecords,
    blockingByKind,
    releaseReady: blockingRecords.length === 0,
  };
}
