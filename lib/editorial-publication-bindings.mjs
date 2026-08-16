import { readFile } from "node:fs/promises";

import { loadApprovalManifest, validateApprovalManifest } from "./approval-manifest.mjs";

export const editorialPublicationBindingsUrl = new URL("../content/editorial-publication-bindings.json", import.meta.url);

const allowedContentTypes = new Set(["siteSettings", "announcement", "admissionCycle", "event"]);
const bindingIdPattern = /^cms-binding-[a-z0-9-]+$/;
const approvalRecordIdPattern = /^claim-[a-z0-9-]+$/;
const documentIdPattern = /^(?!drafts\.)[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const revisionPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const digestPattern = /^[a-f0-9]{64}$/;
const ownerRolePattern = /^[a-z][a-z0-9-]{2,63}$/;

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function reportUnknownKeys(value, allowed, path, add) {
  if (!object(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) add("unknown-field", `${path}.${key}`, "Unknown fields are rejected to prevent silent review-receipt typos.");
  }
}

export async function loadEditorialPublicationBindings() {
  return JSON.parse(await readFile(editorialPublicationBindingsUrl, "utf8"));
}

export function validateEditorialPublicationBindings(registry, manifest) {
  const issues = [];
  const add = (code, path, message) => issues.push({ code, path, message });

  if (!object(registry)) {
    add("invalid-registry", "$", "Binding registry must be a JSON object.");
    return issues;
  }

  reportUnknownKeys(registry, new Set(["$schema", "schemaVersion", "registryId", "updatedOn", "policy", "bindings"]), "$", add);
  if (registry.$schema !== "./editorial-publication-bindings.schema.json") add("schema-pointer", "$schema", "Registry must reference the editorial binding schema.");
  if (registry.schemaVersion !== 1) add("schema-version", "schemaVersion", "Only schema version 1 is supported.");
  if (registry.registryId !== "sskem-editorial-publication-bindings") add("registry-id", "registryId", "Unexpected editorial binding registry identifier.");
  if (!validDate(registry.updatedOn)) add("updated-on", "updatedOn", "Use a valid YYYY-MM-DD date.");

  if (!object(registry.policy)) {
    add("policy", "policy", "A fail-closed binding policy is required.");
  } else {
    reportUnknownKeys(registry.policy, new Set(["privateEvidenceStoredInRepository", "exactRevisionRequired", "exactContentDigestRequired", "notes"]), "policy", add);
    if (registry.policy.privateEvidenceStoredInRepository !== false) add("private-evidence", "policy.privateEvidenceStoredInRepository", "Private approval evidence must remain outside the repository.");
    if (registry.policy.exactRevisionRequired !== true) add("revision-policy", "policy.exactRevisionRequired", "Exact Sanity revision matching must remain enabled.");
    if (registry.policy.exactContentDigestRequired !== true) add("digest-policy", "policy.exactContentDigestRequired", "Exact public-output digest matching must remain enabled.");
    if (typeof registry.policy.notes !== "string" || registry.policy.notes.trim().length < 3) add("policy-notes", "policy.notes", "Policy notes are required.");
  }

  if (!Array.isArray(registry.bindings)) {
    add("bindings", "bindings", "Bindings must be an array.");
    return issues;
  }

  const manifestRecords = new Map((manifest?.records ?? []).map((record) => [record.id, record]));
  const seenBindingIds = new Set();
  const seenApprovalIds = new Set();
  const seenDocumentRevisions = new Set();

  for (const [index, binding] of registry.bindings.entries()) {
    const path = `bindings[${index}]`;
    if (!object(binding)) {
      add("binding", path, "Each binding must be an object.");
      continue;
    }
    reportUnknownKeys(binding, new Set(["bindingId", "approvalRecordId", "contentType", "documentId", "revision", "contentDigestSha256", "boundOn", "ownerRole", "notes"]), path, add);

    if (typeof binding.bindingId !== "string" || !bindingIdPattern.test(binding.bindingId)) add("binding-id", `${path}.bindingId`, "Binding IDs must use cms-binding-prefixed kebab case.");
    if (seenBindingIds.has(binding.bindingId)) add("duplicate-binding", `${path}.bindingId`, `Duplicate binding ID ${binding.bindingId}.`);
    seenBindingIds.add(binding.bindingId);

    if (typeof binding.approvalRecordId !== "string" || !approvalRecordIdPattern.test(binding.approvalRecordId)) add("approval-record-id", `${path}.approvalRecordId`, "CMS bindings must reference a claim approval record.");
    if (seenApprovalIds.has(binding.approvalRecordId)) add("duplicate-approval-record", `${path}.approvalRecordId`, "One approval record may bind only one exact CMS revision.");
    seenApprovalIds.add(binding.approvalRecordId);

    const approvalRecord = manifestRecords.get(binding.approvalRecordId);
    if (!approvalRecord) add("missing-approval-record", `${path}.approvalRecordId`, "The referenced approval record does not exist in the canonical manifest.");
    else if (approvalRecord.kind !== "claim") add("approval-kind", `${path}.approvalRecordId`, "CMS editorial content must use a claim approval record.");
    else if (approvalRecord.decision !== "approved") add("approval-decision", `${path}.approvalRecordId`, "A revision binding may be recorded only after the canonical claim is approved.");

    if (!allowedContentTypes.has(binding.contentType)) add("content-type", `${path}.contentType`, "Unsupported CMS content type.");
    if (typeof binding.documentId !== "string" || !documentIdPattern.test(binding.documentId)) add("document-id", `${path}.documentId`, "Use a published Sanity document ID, never a drafts.* ID.");
    if (typeof binding.revision !== "string" || !revisionPattern.test(binding.revision)) add("revision", `${path}.revision`, "A valid exact Sanity revision is required.");
    if (typeof binding.contentDigestSha256 !== "string" || !digestPattern.test(binding.contentDigestSha256)) add("content-digest", `${path}.contentDigestSha256`, "Use a lowercase 64-character SHA-256 digest.");
    if (!validDate(binding.boundOn)) add("bound-on", `${path}.boundOn`, "Use a valid YYYY-MM-DD binding date.");
    if (typeof binding.ownerRole !== "string" || !ownerRolePattern.test(binding.ownerRole)) add("owner-role", `${path}.ownerRole`, "Use a lowercase accountable role identifier, never a person identity.");
    if (typeof binding.notes !== "string" || binding.notes.trim().length < 3 || binding.notes.length > 500) add("notes", `${path}.notes`, "Public-safe operational notes between 3 and 500 characters are required.");

    const documentRevisionKey = `${binding.contentType}\u0000${binding.documentId}\u0000${binding.revision}`;
    if (seenDocumentRevisions.has(documentRevisionKey)) add("duplicate-document-revision", path, "A Sanity document revision may have only one binding.");
    seenDocumentRevisions.add(documentRevisionKey);
  }

  return issues;
}

export async function auditEditorialPublicationBindings() {
  const [registry, manifest] = await Promise.all([
    loadEditorialPublicationBindings(),
    loadApprovalManifest(),
  ]);
  const manifestIssues = validateApprovalManifest(manifest);
  if (manifestIssues.length) {
    return {
      registry,
      manifest,
      issues: [{ code: "approval-manifest", path: "content/approval-manifest.json", message: "The canonical approval manifest must validate before CMS bindings can be audited." }],
    };
  }
  return { registry, manifest, issues: validateEditorialPublicationBindings(registry, manifest) };
}

export function editorialPublicationBindingSummary(registry) {
  const bindings = Array.isArray(registry?.bindings) ? registry.bindings : [];
  return {
    total: bindings.length,
    byType: Object.fromEntries([...allowedContentTypes].map((type) => [type, bindings.filter((binding) => binding?.contentType === type).length])),
  };
}
