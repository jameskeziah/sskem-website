import { createHash } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  approvalManifestUrl,
  isOpaqueEvidenceReference,
  validateApprovalManifest,
} from "./approval-manifest.mjs";
import {
  DOCUMENT_APPROVAL_BATCH_ID,
  documentApprovalBatchRecordIds,
} from "./document-approval-batch-contract.ts";

export const APPROVAL_MANIFEST_UPDATE_ACKNOWLEDGEMENT = "record-controlled-publication-approval";
export const CAMPUS_APPROVAL_BATCH_ID = "sskem-campus-media-approval-batch";
export const CAMPUS_APPROVAL_BATCH_UPDATE_ACKNOWLEDGEMENT = "record-controlled-campus-publication-approval-batch";
export const DOCUMENT_APPROVAL_BATCH_UPDATE_ACKNOWLEDGEMENT = "record-controlled-appendix-ix-document-approval-batch";
export { DOCUMENT_APPROVAL_BATCH_ID, documentApprovalBatchRecordIds } from "./document-approval-batch-contract.ts";

export const campusApprovalBatchRecordIds = [
  "media-campus-main",
  "media-campus-grounds",
  "media-campus-entrance",
  "media-campus-courtyard",
];

const defaultManifestPath = fileURLToPath(approvalManifestUrl);
const requestKeys = new Set([
  "requestVersion",
  "recordId",
  "expectedRecordDigest",
  "decision",
  "checks",
  "evidenceReferences",
  "approvedByRole",
  "approvedAt",
  "expiresAt",
]);
const batchKeys = new Set(["batchVersion", "batchId", "generatedAt", "requests"]);
const releaseCheckStates = new Set(["verified", "not-applicable"]);
const rolePattern = /^[a-z][a-z0-9-]{2,63}$/;
const digestPattern = /^[a-f0-9]{64}$/;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function manifestText(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validDateTime(value) {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function updateTime(value) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) throw new Error("Approval update requires a valid time.");
  return date;
}

function canonicalRecord(manifest, recordId) {
  if (!isRecord(manifest) || !Array.isArray(manifest.records)) throw new Error("Approval update requires the canonical manifest.");
  const issues = validateApprovalManifest(manifest);
  if (issues.length) throw new Error(`Approval manifest validation failed before planning: ${issues[0].path}: ${issues[0].message}`);
  const record = manifest.records.find((candidate) => candidate.id === recordId);
  if (!record) throw new Error(`Unknown approval record: ${String(recordId)}.`);
  return record;
}

export function approvalRecordDigest(record) {
  if (!isRecord(record)) throw new Error("Approval record digest requires one record.");
  return sha256(JSON.stringify(record));
}

export function createApprovalUpdateRequestTemplate(options) {
  const record = canonicalRecord(options.manifest, options.recordId);
  return {
    requestVersion: 1,
    recordId: record.id,
    expectedRecordDigest: approvalRecordDigest(record),
    decision: "approved",
    checks: Object.fromEntries(Object.keys(record.checks).map((check) => [check, null])),
    evidenceReferences: [],
    approvedByRole: null,
    approvedAt: null,
    expiresAt: record.expiresAt,
  };
}

function buildApprovalUpdate(options) {
  const now = updateTime(options.now);
  const manifest = options.manifest;
  const request = options.request;
  const blockers = [];

  if (!isRecord(request)) {
    throw new Error("Approval update request must contain one JSON object.");
  }
  for (const key of Object.keys(request)) {
    if (!requestKeys.has(key)) blockers.push(`Approval request contains unknown field ${key}.`);
  }
  if (request.requestVersion !== 1) blockers.push("Approval request version must be 1.");
  if (typeof request.recordId !== "string") blockers.push("Approval request recordId is required.");

  const record = canonicalRecord(manifest, request.recordId);
  const currentRecordDigest = approvalRecordDigest(record);
  if (typeof request.expectedRecordDigest !== "string" || !digestPattern.test(request.expectedRecordDigest)) {
    blockers.push("Approval request expectedRecordDigest is invalid.");
  } else if (request.expectedRecordDigest !== currentRecordDigest) {
    blockers.push("Approval record changed after the request template was created; generate and review a fresh template.");
  }
  if (request.decision !== "approved") blockers.push("The guarded updater records approved decisions only.");

  const requiredChecks = Object.keys(record.checks);
  if (!isRecord(request.checks)) {
    blockers.push("Approval request checks must be an object.");
  } else {
    const suppliedChecks = Object.keys(request.checks);
    if (suppliedChecks.length !== requiredChecks.length || requiredChecks.some((check) => !suppliedChecks.includes(check))) {
      blockers.push("Approval request must contain the exact checks for the selected record.");
    }
    for (const check of requiredChecks) {
      if (!releaseCheckStates.has(request.checks[check])) blockers.push(`Approval check ${check} requires an explicit verified or not-applicable decision.`);
    }
  }

  if (!Array.isArray(request.evidenceReferences) || request.evidenceReferences.length === 0) {
    blockers.push("Approval request requires at least one opaque controlled evidence reference.");
  } else {
    if (new Set(request.evidenceReferences).size !== request.evidenceReferences.length) blockers.push("Approval evidence references must be unique.");
    if (request.evidenceReferences.some((reference) => !isOpaqueEvidenceReference(reference))) {
      blockers.push("Approval evidence must use opaque controlled-record references only.");
    }
  }
  if (typeof request.approvedByRole !== "string" || !rolePattern.test(request.approvedByRole)) {
    blockers.push("Approval request requires a lowercase role identifier, never an approver identity.");
  }
  if (!validDateTime(request.approvedAt)) {
    blockers.push("Approval request approvedAt must be an ISO date-time.");
  } else if (Date.parse(request.approvedAt) > now.getTime()) {
    blockers.push("Approval request approvedAt cannot be in the future.");
  }
  if (request.expiresAt !== null && !validDate(request.expiresAt)) {
    blockers.push("Approval request expiresAt must be null or a valid YYYY-MM-DD date.");
  } else if (validDate(request.expiresAt) && request.expiresAt <= now.toISOString().slice(0, 10)) {
    blockers.push("Approval request expiry must be later than the manifest update date.");
  }

  const nextRecord = {
    ...record,
    checks: isRecord(request.checks) ? Object.fromEntries(requiredChecks.map((check) => [check, request.checks[check]])) : record.checks,
    decision: "approved",
    evidenceReferences: Array.isArray(request.evidenceReferences) ? [...request.evidenceReferences] : [],
    approvedByRole: request.approvedByRole,
    approvedAt: request.approvedAt,
    expiresAt: request.expiresAt,
  };
  const nextManifest = {
    ...manifest,
    updatedOn: now.toISOString().slice(0, 10),
    records: manifest.records.map((candidate) => candidate.id === record.id ? nextRecord : candidate),
  };
  if (blockers.length === 0) {
    const nextIssues = validateApprovalManifest(nextManifest);
    blockers.push(...nextIssues.map((issue) => `${issue.path}: ${issue.message} [${issue.code}]`));
  }

  const report = {
    planVersion: 1,
    recordId: record.id,
    status: blockers.length ? "blocked" : "ready-for-explicit-write",
    blockers: [...new Set(blockers)],
    current: {
      decision: record.decision,
      recordDigest: currentRecordDigest,
    },
    proposal: {
      decision: "approved",
      checks: isRecord(request.checks)
        ? Object.fromEntries(requiredChecks.map((check) => [check, releaseCheckStates.has(request.checks[check]) ? request.checks[check] : null]))
        : {},
      evidenceReferencesRecorded: Array.isArray(request.evidenceReferences) ? request.evidenceReferences.length : 0,
      approvedByRole: typeof request.approvedByRole === "string" && rolePattern.test(request.approvedByRole) ? request.approvedByRole : null,
      approvedAt: validDateTime(request.approvedAt) ? request.approvedAt : null,
      expiresAt: request.expiresAt === null || validDate(request.expiresAt) ? request.expiresAt : null,
      manifestUpdatedOn: nextManifest.updatedOn,
    },
    manifestSha256Before: sha256(options.manifestSource ?? manifestText(manifest)),
    guardrails: {
      localWritePerformed: false,
      defaultMode: "local-plan",
      requestBoundToExactRecord: true,
      privateEvidenceIncluded: false,
      approverIdentityIncluded: false,
      approvalGrantedByTool: false,
      explicitControlledDecisionRequired: true,
    },
  };

  return { report, nextManifest };
}

export function createApprovalUpdatePlan(options) {
  return buildApprovalUpdate(options).report;
}

function buildCampusApprovalBatchUpdate(options) {
  const now = updateTime(options.now);
  const manifest = options.manifest;
  const batch = options.batch;
  const blockers = [];

  if (!isRecord(batch)) throw new Error("Campus approval batch request must contain one JSON object.");
  for (const key of Object.keys(batch)) {
    if (!batchKeys.has(key)) blockers.push(`Campus approval batch contains unknown field ${key}.`);
  }
  if (batch.batchVersion !== 1) blockers.push("Campus approval batch version must be 1.");
  if (batch.batchId !== CAMPUS_APPROVAL_BATCH_ID) blockers.push(`Campus approval batch id must be ${CAMPUS_APPROVAL_BATCH_ID}.`);
  if (!validDateTime(batch.generatedAt)) blockers.push("Campus approval batch generatedAt must be an ISO date-time.");
  else if (Date.parse(batch.generatedAt) > now.getTime()) blockers.push("Campus approval batch generatedAt cannot be in the future.");

  const requests = Array.isArray(batch.requests) ? batch.requests : [];
  if (!Array.isArray(batch.requests)) blockers.push("Campus approval batch requests must be an array.");
  if (requests.length !== campusApprovalBatchRecordIds.length) {
    blockers.push(`Campus approval batch requires exactly ${campusApprovalBatchRecordIds.length} requests.`);
  }
  const requestIds = requests.map((request) => isRecord(request) && typeof request.recordId === "string" ? request.recordId : null);
  const suppliedIds = requestIds.filter((recordId) => typeof recordId === "string");
  if (new Set(suppliedIds).size !== suppliedIds.length) blockers.push("Campus approval batch record IDs must be unique.");
  for (const recordId of suppliedIds) {
    if (!campusApprovalBatchRecordIds.includes(recordId)) blockers.push(`Campus approval batch contains non-campus record ${recordId}.`);
  }
  for (const recordId of campusApprovalBatchRecordIds) {
    if (!suppliedIds.includes(recordId)) blockers.push(`Campus approval batch is missing ${recordId}.`);
  }

  const recordPlans = new Map();
  const candidateRecords = new Map();
  for (const recordId of campusApprovalBatchRecordIds) {
    const request = requests.find((candidate) => isRecord(candidate) && candidate.recordId === recordId);
    if (!request) continue;
    const result = buildApprovalUpdate({
      manifest,
      manifestSource: options.manifestSource,
      request,
      now,
    });
    recordPlans.set(recordId, result.report);
    blockers.push(...result.report.blockers.map((blocker) => `${recordId}: ${blocker}`));
    if (result.report.status === "ready-for-explicit-write") {
      candidateRecords.set(recordId, result.nextManifest.records.find((record) => record.id === recordId));
    }
  }

  const nextManifest = {
    ...manifest,
    updatedOn: now.toISOString().slice(0, 10),
    records: manifest.records.map((record) => candidateRecords.get(record.id) ?? record),
  };
  if (blockers.length === 0) {
    const issues = validateApprovalManifest(nextManifest);
    blockers.push(...issues.map((issue) => `${issue.path}: ${issue.message} [${issue.code}]`));
  }

  const records = campusApprovalBatchRecordIds.map((recordId) => {
    const plan = recordPlans.get(recordId);
    return {
      recordId,
      status: plan?.status ?? "blocked",
      blockers: plan?.blockers ?? [`Campus approval batch is missing ${recordId}.`],
      current: plan?.current ?? null,
      proposal: plan?.proposal ?? null,
    };
  });
  const report = {
    planVersion: 1,
    batchId: CAMPUS_APPROVAL_BATCH_ID,
    status: blockers.length ? "blocked" : "ready-for-explicit-atomic-write",
    blockers: [...new Set(blockers)],
    records,
    manifestSha256Before: sha256(options.manifestSource ?? manifestText(manifest)),
    manifestUpdatedOn: nextManifest.updatedOn,
    guardrails: {
      localWritePerformed: false,
      defaultMode: "local-plan",
      exactCampusBatchRequired: true,
      allOrNothingWrite: true,
      privateEvidenceIncluded: false,
      approverIdentityIncluded: false,
      approvalGrantedByTool: false,
      explicitControlledDecisionsRequired: true,
    },
  };

  return { report, nextManifest };
}

export function createCampusApprovalBatchUpdatePlan(options) {
  return buildCampusApprovalBatchUpdate(options).report;
}

function buildDocumentApprovalBatchUpdate(options) {
  const now = updateTime(options.now);
  const manifest = options.manifest;
  const batch = options.batch;
  const blockers = [];

  if (!isRecord(batch)) throw new Error("Appendix IX document approval batch request must contain one JSON object.");
  for (const key of Object.keys(batch)) {
    if (!batchKeys.has(key)) blockers.push(`Appendix IX document approval batch contains unknown field ${key}.`);
  }
  if (batch.batchVersion !== 1) blockers.push("Appendix IX document approval batch version must be 1.");
  if (batch.batchId !== DOCUMENT_APPROVAL_BATCH_ID) blockers.push(`Appendix IX document approval batch id must be ${DOCUMENT_APPROVAL_BATCH_ID}.`);
  if (!validDateTime(batch.generatedAt)) blockers.push("Appendix IX document approval batch generatedAt must be an ISO date-time.");
  else if (Date.parse(batch.generatedAt) > now.getTime()) blockers.push("Appendix IX document approval batch generatedAt cannot be in the future.");

  const requests = Array.isArray(batch.requests) ? batch.requests : [];
  if (!Array.isArray(batch.requests)) blockers.push("Appendix IX document approval batch requests must be an array.");
  if (requests.length !== documentApprovalBatchRecordIds.length) {
    blockers.push(`Appendix IX document approval batch requires exactly ${documentApprovalBatchRecordIds.length} requests.`);
  }
  const requestIds = requests.map((request) => isRecord(request) && typeof request.recordId === "string" ? request.recordId : null);
  const suppliedIds = requestIds.filter((recordId) => typeof recordId === "string");
  if (new Set(suppliedIds).size !== suppliedIds.length) blockers.push("Appendix IX document approval batch record IDs must be unique.");
  for (const recordId of suppliedIds) {
    if (!documentApprovalBatchRecordIds.includes(recordId)) blockers.push(`Appendix IX document approval batch contains non-document record ${recordId}.`);
  }
  for (const recordId of documentApprovalBatchRecordIds) {
    if (!suppliedIds.includes(recordId)) blockers.push(`Appendix IX document approval batch is missing ${recordId}.`);
  }

  const recordPlans = new Map();
  const candidateRecords = new Map();
  for (const recordId of documentApprovalBatchRecordIds) {
    const request = requests.find((candidate) => isRecord(candidate) && candidate.recordId === recordId);
    if (!request) continue;
    const result = buildApprovalUpdate({
      manifest,
      manifestSource: options.manifestSource,
      request,
      now,
    });
    recordPlans.set(recordId, result.report);
    blockers.push(...result.report.blockers.map((blocker) => `${recordId}: ${blocker}`));
    if (result.report.status === "ready-for-explicit-write") {
      candidateRecords.set(recordId, result.nextManifest.records.find((record) => record.id === recordId));
    }
  }

  const nextManifest = {
    ...manifest,
    updatedOn: now.toISOString().slice(0, 10),
    records: manifest.records.map((record) => candidateRecords.get(record.id) ?? record),
  };
  if (blockers.length === 0) {
    const issues = validateApprovalManifest(nextManifest);
    blockers.push(...issues.map((issue) => `${issue.path}: ${issue.message} [${issue.code}]`));
  }

  const records = documentApprovalBatchRecordIds.map((recordId) => {
    const plan = recordPlans.get(recordId);
    return {
      recordId,
      status: plan?.status ?? "blocked",
      blockers: plan?.blockers ?? [`Appendix IX document approval batch is missing ${recordId}.`],
      current: plan?.current ?? null,
      proposal: plan?.proposal ?? null,
    };
  });
  const report = {
    planVersion: 1,
    batchId: DOCUMENT_APPROVAL_BATCH_ID,
    status: blockers.length ? "blocked" : "ready-for-explicit-atomic-write",
    blockers: [...new Set(blockers)],
    records,
    manifestSha256Before: sha256(options.manifestSource ?? manifestText(manifest)),
    manifestUpdatedOn: nextManifest.updatedOn,
    guardrails: {
      localWritePerformed: false,
      defaultMode: "local-plan",
      exactDocumentBatchRequired: true,
      allOrNothingWrite: true,
      privateEvidenceIncluded: false,
      approverIdentityIncluded: false,
      approvalGrantedByTool: false,
      explicitControlledDecisionsRequired: true,
    },
  };

  return { report, nextManifest };
}

export function createDocumentApprovalBatchUpdatePlan(options) {
  return buildDocumentApprovalBatchUpdate(options).report;
}

async function readManifest(filePath) {
  const source = await readFile(filePath, "utf8");
  let manifest;
  try {
    manifest = JSON.parse(source);
  } catch {
    throw new Error("Approval manifest is not valid JSON.");
  }
  return { source, manifest };
}

export async function executeApprovalManifestUpdate(options = {}) {
  const manifestPath = path.resolve(options.manifestPath ?? defaultManifestPath);
  const { source, manifest } = await readManifest(manifestPath);

  if (!options.request) {
    if (typeof options.recordId !== "string" || options.recordId.length === 0) throw new Error("Approval update requires --record or --request.");
    return {
      mode: "local-template",
      status: "controlled-review-required",
      requestTemplate: createApprovalUpdateRequestTemplate({ manifest, recordId: options.recordId }),
      guardrails: {
        localWritePerformed: false,
        checkDecisionsPreselected: false,
        evidenceReferencesIncluded: false,
        approverIdentityIncluded: false,
        approvalGrantedByTool: false,
      },
    };
  }

  const { report, nextManifest } = buildApprovalUpdate({
    manifest,
    manifestSource: source,
    request: options.request,
    now: options.now,
  });
  if (!options.apply) return { mode: "local-plan", plan: report };
  if (report.status !== "ready-for-explicit-write") {
    throw new Error(`Approval manifest update is blocked: ${report.blockers.join(" ")} No manifest write was made.`);
  }
  if (options.acknowledgement !== APPROVAL_MANIFEST_UPDATE_ACKNOWLEDGEMENT) {
    throw new Error(`Approval manifest update requires --acknowledge-local-write=${APPROVAL_MANIFEST_UPDATE_ACKNOWLEDGEMENT}. No manifest write was made.`);
  }

  const currentSource = await readFile(manifestPath, "utf8");
  if (sha256(currentSource) !== report.manifestSha256Before) {
    throw new Error("The approval manifest changed after planning. Review a fresh plan; no manifest write was made.");
  }

  const temporaryPath = path.join(path.dirname(manifestPath), `.${path.basename(manifestPath)}.${process.pid}-${Date.now()}.tmp`);
  try {
    await writeFile(temporaryPath, manifestText(nextManifest), { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, manifestPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }

  return {
    mode: "local-manifest-write",
    receipt: {
      receiptVersion: 1,
      recordId: report.recordId,
      previousDecision: report.current.decision,
      decision: "approved",
      recordDigestBefore: report.current.recordDigest,
      recordDigestAfter: approvalRecordDigest(nextManifest.records.find((record) => record.id === report.recordId)),
      evidenceReferencesRecorded: report.proposal.evidenceReferencesRecorded,
      manifestUpdatedOn: report.proposal.manifestUpdatedOn,
      localWritePerformed: true,
      privateEvidenceIncluded: false,
      approverIdentityIncluded: false,
      approvalGrantedByTool: false,
      explicitControlledDecisionRecorded: true,
    },
  };
}

export async function executeCampusApprovalBatchUpdate(options = {}) {
  const manifestPath = path.resolve(options.manifestPath ?? defaultManifestPath);
  const { source, manifest } = await readManifest(manifestPath);
  if (!options.batch) throw new Error("Campus approval batch update requires a completed --request bundle.");

  const { report, nextManifest } = buildCampusApprovalBatchUpdate({
    manifest,
    manifestSource: source,
    batch: options.batch,
    now: options.now,
  });
  if (!options.apply) return { mode: "local-batch-plan", plan: report };
  if (report.status !== "ready-for-explicit-atomic-write") {
    throw new Error(`Campus approval batch update is blocked: ${report.blockers.join(" ")} No manifest write was made.`);
  }
  if (options.acknowledgement !== CAMPUS_APPROVAL_BATCH_UPDATE_ACKNOWLEDGEMENT) {
    throw new Error(`Campus approval batch update requires --acknowledge-local-write=${CAMPUS_APPROVAL_BATCH_UPDATE_ACKNOWLEDGEMENT}. No manifest write was made.`);
  }

  const currentSource = await readFile(manifestPath, "utf8");
  if (sha256(currentSource) !== report.manifestSha256Before) {
    throw new Error("The approval manifest changed after batch planning. Review a fresh batch plan; no manifest write was made.");
  }

  const temporaryPath = path.join(path.dirname(manifestPath), `.${path.basename(manifestPath)}.${process.pid}-${Date.now()}.tmp`);
  try {
    await writeFile(temporaryPath, manifestText(nextManifest), { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, manifestPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }

  return {
    mode: "local-manifest-batch-write",
    receipt: {
      receiptVersion: 1,
      batchId: report.batchId,
      records: report.records.map((record) => ({
        recordId: record.recordId,
        previousDecision: record.current.decision,
        decision: "approved",
        recordDigestBefore: record.current.recordDigest,
        recordDigestAfter: approvalRecordDigest(nextManifest.records.find((candidate) => candidate.id === record.recordId)),
        evidenceReferencesRecorded: record.proposal.evidenceReferencesRecorded,
      })),
      manifestUpdatedOn: report.manifestUpdatedOn,
      localWritePerformed: true,
      atomicBatchWritePerformed: true,
      privateEvidenceIncluded: false,
      approverIdentityIncluded: false,
      approvalGrantedByTool: false,
      explicitControlledDecisionsRecorded: true,
    },
  };
}

export async function executeDocumentApprovalBatchUpdate(options = {}) {
  const manifestPath = path.resolve(options.manifestPath ?? defaultManifestPath);
  const { source, manifest } = await readManifest(manifestPath);
  if (!options.batch) throw new Error("Appendix IX document approval batch update requires a completed --request bundle.");

  const { report, nextManifest } = buildDocumentApprovalBatchUpdate({
    manifest,
    manifestSource: source,
    batch: options.batch,
    now: options.now,
  });
  if (!options.apply) return { mode: "local-document-batch-plan", plan: report };
  if (report.status !== "ready-for-explicit-atomic-write") {
    throw new Error(`Appendix IX document approval batch update is blocked: ${report.blockers.join(" ")} No manifest write was made.`);
  }
  if (options.acknowledgement !== DOCUMENT_APPROVAL_BATCH_UPDATE_ACKNOWLEDGEMENT) {
    throw new Error(`Appendix IX document approval batch update requires --acknowledge-local-write=${DOCUMENT_APPROVAL_BATCH_UPDATE_ACKNOWLEDGEMENT}. No manifest write was made.`);
  }

  const currentSource = await readFile(manifestPath, "utf8");
  if (sha256(currentSource) !== report.manifestSha256Before) {
    throw new Error("The approval manifest changed after Appendix IX document batch planning. Review a fresh batch plan; no manifest write was made.");
  }

  const temporaryPath = path.join(path.dirname(manifestPath), `.${path.basename(manifestPath)}.${process.pid}-${Date.now()}.tmp`);
  try {
    await writeFile(temporaryPath, manifestText(nextManifest), { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, manifestPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }

  return {
    mode: "local-document-manifest-batch-write",
    receipt: {
      receiptVersion: 1,
      batchId: report.batchId,
      records: report.records.map((record) => ({
        recordId: record.recordId,
        previousDecision: record.current.decision,
        decision: "approved",
        recordDigestBefore: record.current.recordDigest,
        recordDigestAfter: approvalRecordDigest(nextManifest.records.find((candidate) => candidate.id === record.recordId)),
        evidenceReferencesRecorded: record.proposal.evidenceReferencesRecorded,
      })),
      manifestUpdatedOn: report.manifestUpdatedOn,
      localWritePerformed: true,
      atomicBatchWritePerformed: true,
      privateEvidenceIncluded: false,
      approverIdentityIncluded: false,
      approvalGrantedByTool: false,
      documentFilesRead: false,
      malwareScanPerformed: false,
      publicationActivated: false,
      explicitControlledDecisionsRecorded: true,
    },
  };
}
