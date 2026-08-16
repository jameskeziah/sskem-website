import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

import {
  legacyCutoverSummary,
  loadLegacyCutoverInventory,
  validateLegacyCutoverInventory,
} from "../lib/legacy-cutover.mjs";

const projectRoot = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, projectRoot), "utf8");
}

test("validates the frozen 35-route WordPress cutover inventory", async () => {
  const inventory = await loadLegacyCutoverInventory();
  assert.deepEqual(validateLegacyCutoverInventory(inventory), []);
  assert.equal(inventory.capturedOn, "2026-08-16");
  assert.equal(inventory.sourceOrigin, "https://www.sskemschool.com");
  assert.deepEqual(inventory.policy, {
    legacyContentIsEvidence: false,
    legacyUploadsCopied: false,
    redirectsMayPublishLegacyContent: false,
    notes: inventory.policy.notes,
  });

  const summary = legacyCutoverSummary(inventory);
  assert.equal(summary.total, 35);
  assert.equal(summary.redirects, 33);
  assert.equal(summary.retained, 2);
  assert.equal(summary.byImplementation["dedicated-route"], 7);
  assert.equal(summary.byImplementation["catch-all-redirect"], 26);
  assert.equal(summary.byImplementation.pending, 0);
  assert.equal(summary.routeReady, true);
  assert.equal(summary.byRisk.high, 26);
  assert.equal(summary.byReview["approval-blocked"], 29);
});

test("keeps every redirect direct, internal and separate from legacy-content approval", async () => {
  const inventory = await loadLegacyCutoverInventory();
  const redirects = new Map(
    inventory.records
      .filter((record) => record.disposition === "redirect")
      .map((record) => [record.legacyPath, record.targetPath]),
  );
  assert.equal(new Set(inventory.records.map((record) => record.id)).size, inventory.records.length);
  assert.equal(new Set(inventory.records.map((record) => record.legacyPath)).size, inventory.records.length);
  for (const record of inventory.records) {
    assert.match(record.targetPath, /^\//);
    assert.doesNotMatch(record.targetPath, /^\/publication-review(?:\/|$)/);
    if (record.disposition === "redirect") {
      assert.notEqual(record.legacyPath, record.targetPath);
      assert.equal(redirects.has(record.targetPath), false, `${record.id} creates a redirect chain`);
    }
    if (record.risk === "high") assert.equal(record.contentReview, "approval-blocked");
  }
});

test("rejects unsafe policy changes, redirect loops, chains and private targets", async () => {
  const inventory = await loadLegacyCutoverInventory();
  const unsafe = structuredClone(inventory);
  unsafe.policy.legacyUploadsCopied = true;
  unsafe.records[1].targetPath = unsafe.records[1].legacyPath;
  unsafe.records[2].targetPath = unsafe.records[1].legacyPath;
  unsafe.records[3].targetPath = "/publication-review";
  unsafe.records[4].unexpected = "silent typo";

  const issues = validateLegacyCutoverInventory(unsafe);
  const codes = new Set(issues.map((issue) => issue.code));
  for (const code of ["legacy-uploads", "redirect-loop", "redirect-chain", "target-path", "unknown-field"]) {
    assert.ok(codes.has(code), `Expected ${code}`);
  }
});

test("uses the canonical inventory for catch-all redirects and dedicated aliases", async () => {
  const [data, page, packageText, guide] = await Promise.all([
    source("app/data/legacy-cutover.ts"),
    source("app/[...slug]/page.tsx"),
    source("package.json"),
    source("docs/legacy-cutover.md"),
  ]);
  const inventory = await loadLegacyCutoverInventory();
  const packageJson = JSON.parse(packageText);

  assert.match(data, /import inventoryData from ["']@\/content\/legacy-cutover-inventory\.json["']/);
  assert.match(page, /legacyCatchAllRedirectTarget\(path\)/);
  assert.match(page, /permanentRedirect\(legacyTarget\)/);
  assert.match(packageJson.scripts["cutover:audit"], /audit-legacy-cutover/);
  assert.match(packageJson.scripts["cutover:release"], /--release/);
  assert.match(guide, /not a content migration and is not approval evidence/i);
  assert.match(guide, /No\s+WordPress copy, upload, form, PDF or pupil image was copied/i);

  for (const record of inventory.records.filter((candidate) => candidate.implementation === "dedicated-route")) {
    const routeUrl = new URL(`app${record.legacyPath}/route.ts`, projectRoot);
    assert.equal((await stat(routeUrl)).isFile(), true, `${record.id} is missing its dedicated route`);
    const route = await readFile(routeUrl, "utf8");
    assert.match(route, new RegExp(record.targetPath.replaceAll("/", "\\/")));
  }
});

test("keeps the JSON schema aligned with the enforced route contract", async () => {
  const schema = JSON.parse(await source("content/legacy-cutover-inventory.schema.json"));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.policy.properties.legacyContentIsEvidence.const, false);
  assert.equal(schema.properties.policy.properties.legacyUploadsCopied.const, false);
  assert.equal(schema.properties.policy.properties.redirectsMayPublishLegacyContent.const, false);
  assert.ok(schema.properties.records.items.properties.implementation.enum.includes("catch-all-redirect"));
  assert.ok(schema.properties.records.items.properties.contentReview.enum.includes("approval-blocked"));
});
