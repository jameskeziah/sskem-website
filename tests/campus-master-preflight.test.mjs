import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import pipeline from "../content/campus-media-pipeline.json" with { type: "json" };
import {
  CAMPUS_MASTER_PREFLIGHT_REPORT_ID,
  campusMasterPreflightRecordIds,
  createCampusMasterPreflightReport,
} from "../lib/campus-master-preflight.ts";

const NOW = "2026-08-18T12:00:00.000Z";

function measurements(overrides = {}) {
  return campusMasterPreflightRecordIds.map((recordId, index) => ({
    recordId,
    format: "jpeg",
    mimeType: "image/jpeg",
    bytes: 4_000_000 + index,
    width: 3600,
    height: 2400,
    sha256: String(index + 1).repeat(64),
    browserDecoded: true,
    ...(overrides[recordId] ?? {}),
  }));
}

test("marks four distinct production-sized masters ready for authoritative local inspection", () => {
  const completion = createCampusMasterPreflightReport({ measurements: measurements(), pipeline, now: NOW });

  assert.equal(completion.report.reportId, CAMPUS_MASTER_PREFLIGHT_REPORT_ID);
  assert.equal(completion.report.generatedAt, NOW);
  assert.equal(completion.report.status, "ready-for-authoritative-local-inspection");
  assert.equal(completion.report.records.length, 4);
  assert.ok(completion.report.records.every((record) => record.status === "ready-for-authoritative-local-inspection"));
  assert.deepEqual(completion.report.pipeline.minimumMaster, { longEdge: 2400, shortEdge: 1350 });
});

test("blocks the current prototype dimensions without inventing missing pixels", () => {
  const completion = createCampusMasterPreflightReport({
    measurements: measurements({ "media-campus-main": { width: 1400, height: 500 } }),
    pipeline,
    now: NOW,
  });
  const result = completion.report.records.find((record) => record.recordId === "media-campus-main");

  assert.equal(completion.report.status, "blocked");
  assert.equal(result.status, "blocked");
  assert.ok(result.issues.some((issue) => issue.code === "master-too-small"));
});

test("blocks duplicate exact bytes across independently assigned campus roles", () => {
  const duplicateHash = "a".repeat(64);
  const completion = createCampusMasterPreflightReport({
    measurements: measurements({
      "media-campus-main": { sha256: duplicateHash },
      "media-campus-grounds": { sha256: duplicateHash },
    }),
    pipeline,
    now: NOW,
  });
  const duplicateResults = completion.report.records.filter((record) => record.sha256 === duplicateHash);

  assert.equal(completion.report.status, "blocked");
  assert.equal(duplicateResults.length, 2);
  assert.ok(duplicateResults.every((record) => record.issues.some((issue) => issue.code === "duplicate-exact-bytes")));
});

test("documents browser decoding limits and keeps the report privacy-safe", () => {
  const completion = createCampusMasterPreflightReport({
    measurements: measurements({
      "media-campus-courtyard": {
        format: "tiff",
        mimeType: "image/tiff",
        width: null,
        height: null,
        browserDecoded: false,
      },
    }),
    pipeline,
    now: NOW,
  });
  const reportText = JSON.stringify(completion.report);
  const courtyard = completion.report.records.find((record) => record.recordId === "media-campus-courtyard");

  assert.equal(courtyard.status, "blocked");
  assert.ok(courtyard.issues.some((issue) => issue.code === "browser-dimensions-unavailable"));
  assert.equal(completion.report.guardrails.browserPreflightOnly, true);
  assert.equal(completion.report.guardrails.networkRequestPerformed, false);
  assert.equal(completion.report.guardrails.metadataInspected, false);
  assert.equal(completion.report.guardrails.approvalGranted, false);
  assert.equal(completion.report.guardrails.publicWritePerformed, false);
  assert.doesNotMatch(reportText, /fileName|sourcePath|controlledPath|approvedBy|@example|[a-z]:\\/i);
});

test("rejects missing, duplicate or non-canonical record measurements", () => {
  assert.throws(
    () => createCampusMasterPreflightReport({ measurements: measurements().slice(0, 3), pipeline, now: NOW }),
    /exactly four measurements/i,
  );
  const malformed = measurements();
  malformed[3] = { ...malformed[3], recordId: "media-campus-main" };
  assert.throws(
    () => createCampusMasterPreflightReport({ measurements: malformed, pipeline, now: NOW }),
    /exact four canonical campus records/i,
  );
});

test("publishes an authenticated, browser-only preflight surface without persistence", async () => {
  const [page, client, dashboard, sitemap, packageText, brief, guide] = await Promise.all([
    readFile(new URL("../app/publication-review/campus-master-preflight/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/campus-master-preflight/campus-master-preflight-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../docs/campus-media-brief.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/campus-media-ingestion.md", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);

  assert.match(page, /requireChatGPTUser\("\/publication-review\/campus-master-preflight"\)/);
  assert.match(page, /never uploaded or saved by the website/i);
  assert.match(page, /cannot grant approval/i);
  assert.match(client, /^"use client"/);
  assert.match(client, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(client, /URL\.createObjectURL/);
  assert.match(client, /URL\.revokeObjectURL/);
  assert.doesNotMatch(client, /fetch\(|localStorage|sessionStorage|method=["']post/i);
  assert.match(dashboard, /Preflight campus masters/);
  assert.doesNotMatch(sitemap, /campus-master-preflight/);
  assert.match(packageJson.scripts["test:contract"], /campus-master-preflight\.test/);
  assert.match(packageJson.scripts["test:review"], /campus-master-preflight\.test/);
  assert.match(brief, /campus master preflight/i);
  assert.match(guide, /campus master preflight/i);
});
