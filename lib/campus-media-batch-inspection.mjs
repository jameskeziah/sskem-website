import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadApprovalManifest } from "./approval-manifest.mjs";
import {
  inspectCampusMedia,
  loadCampusMediaConfig,
  validateCampusMediaConfig,
} from "./campus-media-pipeline.mjs";
import {
  CAMPUS_MASTER_PREFLIGHT_REPORT_ID,
  campusMasterPreflightRecordIds,
} from "./campus-master-preflight.ts";

export const CAMPUS_MEDIA_BATCH_INSPECTION_ID = "sskem-campus-media-authoritative-batch-inspection";

const topLevelKeys = ["reportVersion", "reportId", "generatedAt", "status", "pipeline", "records", "guardrails"];
const pipelineKeys = ["schemaVersion", "pipelineId", "allowedInputFormats", "minimumMaster"];
const minimumMasterKeys = ["longEdge", "shortEdge"];
const recordKeys = ["recordId", "format", "mimeType", "bytes", "width", "height", "sha256", "status", "issues"];
const issueKeys = ["code", "message"];
const guardrailKeys = [
  "browserPreflightOnly",
  "networkRequestPerformed",
  "serverPersistencePerformed",
  "browserStoragePerformed",
  "masterModified",
  "metadataInspected",
  "colourSpaceVerified",
  "approvalGranted",
  "publicWritePerformed",
];

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  return isObject(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
}

function validIsoDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}

function validSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function sameArray(left, right) {
  return Array.isArray(left) && left.length === right.length && left.every((value, index) => value === right[index]);
}

export function validateCampusMasterPreflightReport(report, config) {
  const issues = [];
  const add = (location, message) => issues.push({ path: location, message });

  if (!hasExactKeys(report, topLevelKeys)) {
    add("$", "Report fields do not match the canonical browser preflight contract.");
    return issues;
  }
  if (report.reportVersion !== 1) add("reportVersion", "Only report version 1 is supported.");
  if (report.reportId !== CAMPUS_MASTER_PREFLIGHT_REPORT_ID) add("reportId", "Unexpected preflight report identifier.");
  if (!validIsoDate(report.generatedAt)) add("generatedAt", "A canonical ISO timestamp is required.");
  if (!hasExactKeys(report.pipeline, pipelineKeys) || !hasExactKeys(report.pipeline?.minimumMaster, minimumMasterKeys)) {
    add("pipeline", "Pipeline snapshot fields are malformed.");
  } else {
    if (report.pipeline.schemaVersion !== config.schemaVersion || report.pipeline.pipelineId !== config.pipelineId) {
      add("pipeline", "The preflight pipeline identity no longer matches the canonical pipeline.");
    }
    if (!sameArray(report.pipeline.allowedInputFormats, config.allowedInputFormats)
      || report.pipeline.minimumMaster.longEdge !== config.minimumMaster.longEdge
      || report.pipeline.minimumMaster.shortEdge !== config.minimumMaster.shortEdge) {
      add("pipeline", "The preflight requirements have drifted from the canonical pipeline.");
    }
  }

  if (!Array.isArray(report.records) || report.records.length !== campusMasterPreflightRecordIds.length) {
    add("records", "Exactly four canonical campus records are required.");
  } else {
    const recordIds = report.records.map((record) => record?.recordId);
    if (new Set(recordIds).size !== recordIds.length
      || campusMasterPreflightRecordIds.some((recordId) => !recordIds.includes(recordId))) {
      add("records", "Record IDs must match the exact four canonical campus roles.");
    }
    const digests = [];
    for (const [index, record] of report.records.entries()) {
      const base = `records[${index}]`;
      if (!hasExactKeys(record, recordKeys)) {
        add(base, "Record fields do not match the canonical preflight contract.");
        continue;
      }
      if (!validSha256(record.sha256)) add(`${base}.sha256`, "A complete lowercase SHA-256 digest is required.");
      else digests.push(record.sha256);
      if (!Number.isSafeInteger(record.bytes) || record.bytes <= 0) add(`${base}.bytes`, "A positive byte count is required.");
      const validIssues = Array.isArray(record.issues) && !record.issues.some((issue) => (
        !hasExactKeys(issue, issueKeys) || typeof issue.code !== "string" || typeof issue.message !== "string"
      ));
      if (!validIssues) {
        add(`${base}.issues`, "Issue entries must match the canonical preflight contract.");
      }
      const ready = record.status === "ready-for-authoritative-local-inspection";
      const blocked = record.status === "blocked";
      if (!ready && !blocked) add(`${base}.status`, "Record status is invalid.");
      if (ready && validIssues && record.issues.length) add(`${base}.status`, "A ready record cannot contain browser blockers.");
      if (blocked && validIssues && !record.issues.length) add(`${base}.status`, "A blocked record must explain its browser blocker.");
    }
    if (new Set(digests).size !== digests.length) add("records", "Each campus role must reference distinct exact bytes.");
    const expectedStatus = report.records.every((record) => record?.status === "ready-for-authoritative-local-inspection")
      ? "ready-for-authoritative-local-inspection"
      : "blocked";
    if (report.status !== expectedStatus) add("status", "Batch status does not match the four record results.");
  }

  if (!hasExactKeys(report.guardrails, guardrailKeys)
    || report.guardrails.browserPreflightOnly !== true
    || guardrailKeys.slice(1).some((key) => report.guardrails[key] !== false)) {
    add("guardrails", "Browser-only non-authorizing guardrails are required.");
  }

  return issues;
}

function assertCanonicalInputs(inputs) {
  if (!isObject(inputs)) throw new Error("Campus batch inspection requires four controlled input mappings.");
  const inputIds = Object.keys(inputs);
  if (inputIds.length !== campusMasterPreflightRecordIds.length
    || new Set(inputIds).size !== inputIds.length
    || campusMasterPreflightRecordIds.some((recordId) => typeof inputs[recordId] !== "string" || !inputs[recordId].trim())) {
    throw new Error("Controlled inputs must match the exact four canonical campus record IDs.");
  }
  const resolved = campusMasterPreflightRecordIds.map((recordId) => path.resolve(inputs[recordId]));
  if (new Set(resolved.map((inputPath) => inputPath.toLowerCase())).size !== resolved.length) {
    throw new Error("Each campus role must use a distinct controlled input file.");
  }
  return Object.fromEntries(campusMasterPreflightRecordIds.map((recordId, index) => [recordId, resolved[index]]));
}

async function exactFileDigest(recordId, inputPath) {
  try {
    const buffer = await readFile(inputPath);
    return { bytes: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex") };
  } catch {
    throw new Error(`Unable to read the controlled input for ${recordId}.`);
  }
}

export async function inspectCampusMediaBatch({
  report,
  inputs,
  config: suppliedConfig,
  manifest: suppliedManifest,
  now: suppliedNow,
}) {
  const [config, manifest] = await Promise.all([
    suppliedConfig ?? loadCampusMediaConfig(),
    suppliedManifest ?? loadApprovalManifest(),
  ]);
  const configIssues = validateCampusMediaConfig(config);
  if (configIssues.length) throw new Error("The canonical campus media pipeline is invalid.");
  const reportIssues = validateCampusMasterPreflightReport(report, config);
  if (reportIssues.length) {
    throw new Error(`The campus master preflight report is invalid: ${reportIssues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
  }
  const inputPaths = assertCanonicalInputs(inputs);
  const now = suppliedNow instanceof Date ? suppliedNow : new Date(suppliedNow ?? Date.now());
  if (Number.isNaN(now.getTime())) throw new Error("Campus batch inspection requires a valid time.");

  const exactFiles = await Promise.all(campusMasterPreflightRecordIds.map(async (recordId) => {
    const digest = await exactFileDigest(recordId, inputPaths[recordId]);
    const expected = report.records.find((record) => record.recordId === recordId);
    return { recordId, ...digest, matches: expected.sha256 === digest.sha256 && expected.bytes === digest.bytes };
  }));
  const mismatches = exactFiles.filter((file) => !file.matches);
  if (mismatches.length) {
    throw new Error(`Exact-byte preflight mismatch for: ${mismatches.map((file) => file.recordId).join(", ")}.`);
  }

  const records = await Promise.all(campusMasterPreflightRecordIds.map(async (recordId) => {
    const inspection = await inspectCampusMedia({
      recordId,
      inputPath: inputPaths[recordId],
      config,
      manifest,
    });
    const exactFile = exactFiles.find((file) => file.recordId === recordId);
    return {
      recordId,
      status: inspection.eligible ? "ready-for-staging" : "blocked",
      issues: inspection.issues,
      source: {
        format: inspection.source.format,
        width: inspection.source.width,
        height: inspection.source.height,
        colourSpace: inspection.source.colourSpace,
        bytes: exactFile.bytes,
        sha256: exactFile.sha256,
        containsEmbeddedMetadata: inspection.source.containsEmbeddedMetadata,
      },
      profile: inspection.profile,
    };
  }));
  const generatedAt = now.toISOString();

  return {
    schemaVersion: 1,
    batchId: CAMPUS_MEDIA_BATCH_INSPECTION_ID,
    generatedAt,
    status: records.every((record) => record.status === "ready-for-staging") ? "ready-for-staging" : "blocked",
    preflight: {
      reportId: report.reportId,
      reportVersion: report.reportVersion,
      generatedAt: report.generatedAt,
      exactFilesMatched: exactFiles.length,
    },
    records,
    guardrails: {
      readOnlyInspection: true,
      sourceLocationsStored: false,
      sourceFilenamesStored: false,
      derivativesWritten: false,
      approvalGranted: false,
      publicationActivated: false,
      publicWritePerformed: false,
    },
  };
}
