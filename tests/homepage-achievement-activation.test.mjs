import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import manifestData from "../content/approval-manifest.json" with { type: "json" };
import {
  HOMEPAGE_ACHIEVEMENT_ACTIVATION_ACKNOWLEDGEMENT,
  createHomepageAchievementActivationPlan,
  executeHomepageAchievementActivation,
} from "../lib/homepage-achievement-activation.ts";
import { homepageAchievementArtwork, homepageAchievementPublicationRegistry } from "../lib/homepage-achievement-publication.ts";
import { auditHomepageAchievementPublicationArtifacts } from "../lib/homepage-achievement-publication-audit.mjs";

const NOW = "2026-08-18T12:00:00.000Z";
const artwork = homepageAchievementArtwork[0];

function approvedManifest(approvedAt = "2026-08-17T09:30:00.000Z") {
  const manifest = structuredClone(manifestData);
  for (const id of [artwork.mediaRecordId, artwork.claimRecordId]) {
    const record = manifest.records.find((candidate) => candidate.id === id);
    record.decision = "approved";
    record.checks = Object.fromEntries(Object.keys(record.checks).map((check) => [check, "verified"]));
    record.evidenceReferences = [`CTRL/${id.toUpperCase()}`];
    record.approvedByRole = "school-approver";
    record.approvedAt = approvedAt;
  }
  return manifest;
}

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sskem-achievement-activation-"));
  const assetRoot = path.join(root, "media-home");
  const registryPath = path.join(root, "homepage-achievement-publication-bindings.json");
  await mkdir(assetRoot, { recursive: true });
  await Promise.all([
    copyFile(new URL(`../public${artwork.src}`, import.meta.url), path.join(assetRoot, path.basename(artwork.src))),
    writeFile(registryPath, `${JSON.stringify(homepageAchievementPublicationRegistry, null, 2)}\n`, "utf8"),
  ]);
  context.after(() => rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }));
  return { assetRoot, registryPath };
}

test("keeps the canonical registry empty and blocks activation while approvals are absent", async () => {
  const before = await readFile(new URL("../content/homepage-achievement-publication-bindings.json", import.meta.url), "utf8");
  const result = await executeHomepageAchievementActivation({ recordId: artwork.mediaRecordId, now: NOW });
  const after = await readFile(new URL("../content/homepage-achievement-publication-bindings.json", import.meta.url), "utf8");

  assert.equal(result.mode, "local-plan");
  assert.equal(result.plan.status, "blocked");
  assert.match(result.plan.blockers.join("\n"), /current approved media record[\s\S]*current approved paired claim record/i);
  assert.equal(after, before);
});

test("plans locally and atomically activates only the exact approved artwork bytes", async (context) => {
  const files = await fixture(context);
  const manifest = approvedManifest();
  const options = { recordId: artwork.mediaRecordId, ...files, manifest, now: NOW };
  const planned = await executeHomepageAchievementActivation(options);

  assert.equal(planned.mode, "local-plan");
  assert.equal(planned.plan.status, "ready-for-explicit-write");
  assert.equal(planned.plan.proposal.publicPath, artwork.src);
  assert.match(planned.plan.proposal.sourceSha256, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(planned), /"(?:sourcePath|approver|consent|token)"\s*:/i);
  assert.equal(JSON.parse(await readFile(files.registryPath, "utf8")).bindings.length, 0);

  await assert.rejects(
    executeHomepageAchievementActivation({ ...options, apply: true, acknowledgement: "wrong" }),
    /requires --acknowledge-local-write.*No registry write/i,
  );

  const applied = await executeHomepageAchievementActivation({
    ...options,
    apply: true,
    acknowledgement: HOMEPAGE_ACHIEVEMENT_ACTIVATION_ACKNOWLEDGEMENT,
  });
  assert.equal(applied.mode, "local-registry-write");
  const registry = JSON.parse(await readFile(files.registryPath, "utf8"));
  assert.equal(registry.bindings.length, 1);
  assert.equal(registry.bindings[0].bindingId, applied.receipt.bindingId);
  assert.deepEqual(await auditHomepageAchievementPublicationArtifacts({ registry, manifest, assetRoot: files.assetRoot, now: NOW }), []);
  assert.equal((await createHomepageAchievementActivationPlan(options)).status, "already-active");
});

test("requires both an explicit replace flag and fresh approvals after byte replacement", async (context) => {
  const files = await fixture(context);
  const manifest = approvedManifest();
  const options = { recordId: artwork.mediaRecordId, ...files, manifest, now: NOW };
  await executeHomepageAchievementActivation({
    ...options,
    apply: true,
    acknowledgement: HOMEPAGE_ACHIEVEMENT_ACTIVATION_ACKNOWLEDGEMENT,
  });

  const replacement = await sharp(randomBytes(1400 * 500 * 3), {
    raw: { width: 1400, height: 500, channels: 3 },
  }).jpeg({ quality: 90 }).toBuffer();
  await writeFile(path.join(files.assetRoot, path.basename(artwork.src)), replacement);

  const silent = await createHomepageAchievementActivationPlan(options);
  assert.equal(silent.status, "blocked");
  assert.match(silent.blockers.join("\n"), /different binding.*--replace/i);

  const staleApproval = await createHomepageAchievementActivationPlan({ ...options, replace: true });
  assert.equal(staleApproval.status, "blocked");
  assert.match(staleApproval.blockers.join("\n"), /newer approval timestamps/i);

  const refreshedManifest = approvedManifest("2026-08-19T10:00:00.000Z");
  const refreshed = await createHomepageAchievementActivationPlan({
    ...options,
    replace: true,
    manifest: refreshedManifest,
    now: "2026-08-19T12:00:00.000Z",
  });
  assert.equal(refreshed.status, "ready-for-explicit-write", refreshed.blockers.join("\n"));
});

test("publishes the guarded command, schema, build audit and operating boundary", async () => {
  const [schemaText, packageText, command, guide] = await Promise.all([
    readFile(new URL("../content/homepage-achievement-publication-bindings.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/activate-homepage-achievement.mjs", import.meta.url), "utf8"),
    readFile(new URL("../docs/homepage-achievement-publication.md", import.meta.url), "utf8"),
  ]);
  const schema = JSON.parse(schemaText);
  const packageJson = JSON.parse(packageText);

  assert.equal(schema.properties.policy.properties.exactSourceHashRequired.const, true);
  assert.equal(schema.properties.policy.properties.sourceReplacementRequiresReapproval.const, true);
  assert.match(packageJson.scripts.prebuild, /achievements:bindings:audit/);
  assert.match(packageJson.scripts["achievements:activate"], /activate-homepage-achievement/);
  assert.match(command, /default mode is read-only/i);
  assert.match(guide, /never add a binding by hand/i);
  assert.match(guide, /does not grant or refresh approval/i);
});
