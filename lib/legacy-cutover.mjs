import { readFile } from "node:fs/promises";

export const legacyCutoverInventoryUrl = new URL("../content/legacy-cutover-inventory.json", import.meta.url);

const allowedCategories = new Set(["home", "disclosure", "about", "admissions", "academics", "student-life", "media", "contact"]);
const allowedDispositions = new Set(["retain", "redirect", "rewrite", "archive-review", "discard"]);
const allowedImplementations = new Set(["current-route", "dedicated-route", "catch-all-redirect", "pending"]);
const allowedContentReviews = new Set(["not-required", "required", "approval-blocked"]);
const allowedRisks = new Set(["low", "medium", "high"]);
const pathPattern = /^\/(?:[a-z0-9-]+\/)*[a-z0-9-]*$/;
const idPattern = /^legacy-[a-z0-9-]+$/;
const rolePattern = /^[a-z][a-z0-9-]{2,63}$/;

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
    if (!allowed.has(key)) add("unknown-field", `${path}.${key}`, "Unknown inventory fields are rejected.");
  }
}

export async function loadLegacyCutoverInventory() {
  return JSON.parse(await readFile(legacyCutoverInventoryUrl, "utf8"));
}

export function validateLegacyCutoverInventory(inventory) {
  const issues = [];
  const add = (code, path, message) => issues.push({ code, path, message });

  if (!object(inventory)) {
    add("invalid-inventory", "$", "Inventory must be a JSON object.");
    return issues;
  }
  reportUnknownKeys(inventory, new Set(["$schema", "schemaVersion", "inventoryId", "capturedOn", "sourceOrigin", "policy", "records"]), "$", add);
  if (inventory.$schema !== "./legacy-cutover-inventory.schema.json") add("schema-pointer", "$schema", "Inventory must reference the project schema.");
  if (inventory.schemaVersion !== 1) add("schema-version", "schemaVersion", "Only schema version 1 is supported.");
  if (inventory.inventoryId !== "sskem-wordpress-cutover") add("inventory-id", "inventoryId", "Unexpected inventory identifier.");
  if (!validDate(inventory.capturedOn)) add("captured-on", "capturedOn", "Use a valid YYYY-MM-DD capture date.");
  if (inventory.sourceOrigin !== "https://www.sskemschool.com") add("source-origin", "sourceOrigin", "Inventory must use the canonical HTTPS legacy origin.");

  if (!object(inventory.policy)) {
    add("policy", "policy", "A cutover safety policy is required.");
  } else {
    reportUnknownKeys(inventory.policy, new Set(["legacyContentIsEvidence", "legacyUploadsCopied", "redirectsMayPublishLegacyContent", "notes"]), "policy", add);
    if (inventory.policy.legacyContentIsEvidence !== false) add("legacy-evidence", "policy.legacyContentIsEvidence", "Legacy publication is not approval evidence.");
    if (inventory.policy.legacyUploadsCopied !== false) add("legacy-uploads", "policy.legacyUploadsCopied", "Legacy uploads must not be copied through the route inventory.");
    if (inventory.policy.redirectsMayPublishLegacyContent !== false) add("redirect-content", "policy.redirectsMayPublishLegacyContent", "Redirects must not publish legacy content.");
    if (typeof inventory.policy.notes !== "string" || inventory.policy.notes.trim().length < 20) add("policy-notes", "policy.notes", "Explain the safety boundary.");
  }

  if (!Array.isArray(inventory.records) || !inventory.records.length) {
    add("records", "records", "At least one legacy route is required.");
    return issues;
  }

  const ids = new Set();
  const paths = new Set();
  const redirects = new Map();
  for (const [index, record] of inventory.records.entries()) {
    const recordPath = `records[${index}]`;
    if (!object(record)) {
      add("record", recordPath, "Every record must be an object.");
      continue;
    }
    reportUnknownKeys(record, new Set(["id", "title", "legacyPath", "category", "disposition", "targetPath", "implementation", "contentReview", "risk", "ownerRole", "observedOn", "notes"]), recordPath, add);
    if (typeof record.id !== "string" || !idPattern.test(record.id)) add("record-id", `${recordPath}.id`, "Use a stable legacy-prefixed kebab-case ID.");
    if (ids.has(record.id)) add("duplicate-id", `${recordPath}.id`, `Duplicate record ID ${record.id}.`);
    ids.add(record.id);
    if (typeof record.title !== "string" || record.title.trim().length < 2 || record.title.length > 160) add("title", `${recordPath}.title`, "Use a concise route title.");
    if (typeof record.legacyPath !== "string" || !pathPattern.test(record.legacyPath) || record.legacyPath.includes("//")) add("legacy-path", `${recordPath}.legacyPath`, "Legacy paths must be normalized internal paths without a trailing slash.");
    if (paths.has(record.legacyPath)) add("duplicate-path", `${recordPath}.legacyPath`, `Duplicate legacy path ${record.legacyPath}.`);
    paths.add(record.legacyPath);
    if (!allowedCategories.has(record.category)) add("category", `${recordPath}.category`, "Unknown route category.");
    if (!allowedDispositions.has(record.disposition)) add("disposition", `${recordPath}.disposition`, "Unknown content disposition.");
    if (typeof record.targetPath !== "string" || !pathPattern.test(record.targetPath) || record.targetPath.includes("//") || record.targetPath.startsWith("/publication-review")) add("target-path", `${recordPath}.targetPath`, "Targets must be normalized public-site paths.");
    if (!allowedImplementations.has(record.implementation)) add("implementation", `${recordPath}.implementation`, "Unknown implementation state.");
    if (!allowedContentReviews.has(record.contentReview)) add("content-review", `${recordPath}.contentReview`, "Unknown content review state.");
    if (!allowedRisks.has(record.risk)) add("risk", `${recordPath}.risk`, "Unknown cutover risk.");
    if (typeof record.ownerRole !== "string" || !rolePattern.test(record.ownerRole)) add("owner-role", `${recordPath}.ownerRole`, "Use a role identifier, not a person identity.");
    if (!validDate(record.observedOn)) add("observed-on", `${recordPath}.observedOn`, "Use a valid observation date.");
    if (validDate(record.observedOn) && validDate(inventory.capturedOn) && record.observedOn > inventory.capturedOn) add("future-observation", `${recordPath}.observedOn`, "Observation cannot be later than the inventory capture.");
    if (typeof record.notes !== "string" || record.notes.trim().length < 10 || record.notes.length > 500) add("notes", `${recordPath}.notes`, "Operational notes are required.");

    if (record.disposition === "redirect") {
      if (record.legacyPath === record.targetPath) add("redirect-loop", `${recordPath}.targetPath`, "Redirect source and target must differ.");
      if (!["dedicated-route", "catch-all-redirect"].includes(record.implementation)) add("redirect-implementation", `${recordPath}.implementation`, "Redirect records require a route implementation.");
      redirects.set(record.legacyPath, record.targetPath);
    } else if (record.disposition === "retain" && (record.legacyPath !== record.targetPath || record.implementation !== "current-route")) {
      add("retain-contract", recordPath, "Retained routes must keep their path and use the current route implementation.");
    }
  }

  for (const [source, target] of redirects) {
    if (redirects.has(target)) add("redirect-chain", `records.${source}`, `Redirect ${source} must point directly to its final route, not ${target}.`);
  }
  return issues;
}

export function legacyCutoverSummary(inventory) {
  const records = Array.isArray(inventory.records) ? inventory.records : [];
  const byImplementation = { "current-route": 0, "dedicated-route": 0, "catch-all-redirect": 0, pending: 0 };
  const byReview = { "not-required": 0, required: 0, "approval-blocked": 0 };
  const byRisk = { low: 0, medium: 0, high: 0 };
  for (const record of records) {
    if (record.implementation in byImplementation) byImplementation[record.implementation] += 1;
    if (record.contentReview in byReview) byReview[record.contentReview] += 1;
    if (record.risk in byRisk) byRisk[record.risk] += 1;
  }
  return {
    total: records.length,
    redirects: records.filter((record) => record.disposition === "redirect").length,
    retained: records.filter((record) => record.disposition === "retain").length,
    byImplementation,
    byReview,
    byRisk,
    routeReady: byImplementation.pending === 0,
  };
}
