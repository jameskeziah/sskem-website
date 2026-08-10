import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import { loadApprovalManifest } from "../lib/approval-manifest.mjs";
import {
  documentIngestionProjectRoot,
  inspectPublicDocument,
  loadDocumentIngestionConfig,
  preparePublicDocument,
  validPublicDocumentFilename,
  validateDocumentIngestionConfig,
} from "../lib/document-ingestion-pipeline.mjs";

const stagingRoot = path.join(documentIngestionProjectRoot, "work", "document-intake");
const publicRoot = path.join(documentIngestionProjectRoot, "public", "documents", "production");
const fixtureRoot = path.join(documentIngestionProjectRoot, "work", "document-pipeline-fixtures");

function removeDirectory(target) {
  return rm(target, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
}

function pdfObject(number, body) {
  return `${number} 0 obj\n${body}\nendobj\n`;
}

function textStream(lines) {
  const escaped = lines.map((line) => line.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)"));
  const commands = ["BT", "/F1 22 Tf", "72 720 Td"];
  for (const [index, line] of escaped.entries()) {
    if (index) commands.push("0 -32 Td");
    commands.push(`(${line}) Tj`);
  }
  commands.push("ET");
  const stream = `${commands.join("\n")}\n`;
  return `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`;
}

function createPdfBuffer({ unsafeToken = "" } = {}) {
  const objects = [
    pdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    pdfObject(2, "<< /Type /Pages /Count 2 /Kids [3 0 R 5 0 R] >>"),
    pdfObject(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>"),
    pdfObject(4, textStream(["SSKEMS Appendix IX review copy", "Affiliation record sample", "Page 1 of 2"])),
    pdfObject(5, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>"),
    pdfObject(6, textStream(["Document intake visual check", "Readable text layer present", "Page 2 of 2"])),
    pdfObject(7, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
  ];
  let content = "%PDF-1.4\n%SSKEMS\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(content));
    content += object;
  }
  const xrefOffset = Buffer.byteLength(content);
  content += "xref\n0 8\n0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) content += `${String(offset).padStart(10, "0")} 00000 n \n`;
  content += `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  if (unsafeToken) content += `% unsafe fixture ${unsafeToken}\n`;
  return Buffer.from(content, "latin1");
}

async function createFixture(options) {
  await mkdir(fixtureRoot, { recursive: true });
  const directory = await mkdtemp(path.join(fixtureRoot, "pdf-"));
  const inputPath = path.join(directory, "source-document.pdf");
  await writeFile(inputPath, createPdfBuffer(options));
  return { directory, inputPath };
}

function approvedManifest(manifest, recordId) {
  const clone = structuredClone(manifest);
  const record = clone.records.find((candidate) => candidate.id === recordId);
  record.checks = Object.fromEntries(Object.keys(record.checks).map((check) => [check, "verified"]));
  record.decision = "approved";
  record.evidenceReferences = ["DOCSCAN/2026/0001"];
  record.approvedByRole = "compliance-owner";
  record.approvedAt = "2026-08-10T09:00:00+05:30";
  return clone;
}

test("defines a bounded, static-PDF intake contract", async () => {
  const config = await loadDocumentIngestionConfig();
  assert.deepEqual(validateDocumentIngestionConfig(config), []);
  assert.equal(config.allowedExtension, ".pdf");
  assert.equal(config.maximumPages, 300);
  assert.ok(config.prohibitedPdfTokens.includes("/JavaScript"));
  assert.ok(config.prohibitedPdfTokens.includes("/EmbeddedFile"));
  assert.equal(validPublicDocumentFilename("affiliation-extension-2026.pdf", config), true);
  assert.equal(validPublicDocumentFilename("Affiliation Extension.pdf", config), false);
  assert.equal(validPublicDocumentFilename("../record.pdf", config), false);
});

test("inspects a readable PDF without retaining its extracted text", async (context) => {
  const { directory, inputPath } = await createFixture();
  context.after(() => removeDirectory(directory));
  const inspection = await inspectPublicDocument({ recordId: "document-mpd-b-1", inputPath });

  assert.equal(inspection.eligibleForStaging, true);
  assert.equal(inspection.source.pages, 2);
  assert.equal(inspection.source.encrypted, false);
  assert.equal(inspection.safety.activeOrEmbeddedContent, "not-detected");
  assert.equal(inspection.safety.malwareScanner, "not-run");
  assert.equal(inspection.accessibility.assessment, "text-readable");
  assert.equal(inspection.accessibility.extractedTextPersisted, false);
  assert.ok(inspection.accessibility.extractedTextCharacters > 80);
  assert.match(inspection.warnings.join(" "), /malware scanning is not performed/i);
  assert.doesNotMatch(JSON.stringify(inspection), /source-document|[a-z]:\\/i);
});

test("stages the exact candidate, a privacy-safe receipt and every rendered page", async (context) => {
  const { directory, inputPath } = await createFixture();
  const outputPath = path.join(stagingRoot, `document-mpd-b-1-test-${process.pid}-${Date.now()}`);
  context.after(async () => {
    await removeDirectory(directory);
    if (process.env.SSKEM_KEEP_DOCUMENT_FIXTURE !== "1") await removeDirectory(outputPath);
  });

  const result = await preparePublicDocument({ recordId: "document-mpd-b-1", inputPath, outputPath });
  assert.equal(result.receipt.mode, "staging");
  assert.equal(result.receipt.output.previews.length, 2);
  assert.equal(result.receipt.safety.malwareScanner, "not-run");
  assert.equal(result.receipt.accessibility.extractedTextPersisted, false);

  const files = await readdir(outputPath);
  assert.deepEqual(files.sort(), ["candidate.pdf", "intake-receipt.json", "page-001.png", "page-002.png"]);
  for (const preview of result.receipt.output.previews) {
    const metadata = await sharp(path.join(outputPath, preview.filename)).metadata();
    assert.ok(metadata.width > 900);
    assert.ok(metadata.height > 1200);
  }
  const receiptText = await readFile(path.join(outputPath, "intake-receipt.json"), "utf8");
  assert.doesNotMatch(receiptText, /source-document|SSKEMS Appendix IX review copy|[a-z]:\\/i);
  assert.doesNotMatch(receiptText, /malware[^\n]*passed/i);
  await assert.rejects(
    preparePublicDocument({ recordId: "document-mpd-b-1", inputPath, outputPath }),
    /not empty[\s\S]*?explicit replacement/i,
  );
  if (process.env.SSKEM_KEEP_DOCUMENT_FIXTURE === "1") process.stdout.write(`VISUAL_FIXTURE=${outputPath}\n`);
});

test("quarantines active-content markers and refuses current unapproved documents", async (context) => {
  const { directory, inputPath } = await createFixture({ unsafeToken: "/OpenAction /JavaScript" });
  context.after(() => removeDirectory(directory));
  const inspection = await inspectPublicDocument({ recordId: "document-mpd-b-1", inputPath });
  assert.equal(inspection.eligibleForStaging, false);
  assert.deepEqual(inspection.safety.detectedTokens, ["/JavaScript", "/OpenAction"]);
  assert.match(inspection.issues.join(" "), /prohibited interactive or embedded-content/i);

  const safeFixture = await createFixture();
  context.after(() => removeDirectory(safeFixture.directory));
  const manifest = await loadApprovalManifest();
  await assert.rejects(
    preparePublicDocument({
      recordId: "document-mpd-b-1",
      inputPath: safeFixture.inputPath,
      publish: true,
      publicFilename: "affiliation-extension-2026.pdf",
      manifest,
    }),
    /not approved[\s\S]*?refused/i,
  );
  await assert.rejects(
    preparePublicDocument({
      recordId: "document-mpd-b-1",
      inputPath: safeFixture.inputPath,
      outputPath: path.join(documentIngestionProjectRoot, "work", "outside-document-intake"),
    }),
    /must remain inside work\/document-intake/i,
  );
});

test("publishes only the hash-bound PDF and never a public receipt", async (context) => {
  const { directory, inputPath } = await createFixture();
  const stagingPath = path.join(stagingRoot, `document-mpd-b-1-publish-${process.pid}-${Date.now()}`);
  const outputPath = path.join(publicRoot, `document-mpd-b-1-test-${process.pid}-${Date.now()}`);
  context.after(async () => {
    await removeDirectory(directory);
    await removeDirectory(stagingPath);
    await removeDirectory(outputPath);
  });
  const manifest = approvedManifest(await loadApprovalManifest(), "document-mpd-b-1");
  await preparePublicDocument({ recordId: "document-mpd-b-1", inputPath, outputPath: stagingPath, manifest });

  const result = await preparePublicDocument({
    recordId: "document-mpd-b-1",
    inputPath,
    outputPath,
    receiptPath: path.join(stagingPath, "intake-receipt.json"),
    publicFilename: "affiliation-extension-2026.pdf",
    publish: true,
    manifest,
  });
  assert.equal(result.receipt.mode, "public");
  assert.deepEqual(await readdir(outputPath), ["affiliation-extension-2026.pdf"]);
  assert.equal((await stat(path.join(outputPath, "affiliation-extension-2026.pdf"))).size, result.receipt.source.bytes);

  const changedPath = path.join(directory, "changed.pdf");
  await writeFile(changedPath, createPdfBuffer({ unsafeToken: "% harmless hash change" }));
  await assert.rejects(
    preparePublicDocument({
      recordId: "document-mpd-b-1",
      inputPath: changedPath,
      outputPath,
      receiptPath: path.join(stagingPath, "intake-receipt.json"),
      publicFilename: "affiliation-extension-2026.pdf",
      publish: true,
      replace: true,
      manifest,
    }),
    /hash does not match the staged and reviewed receipt/i,
  );
});

test("documents the scanner boundary and guarded command surface", async () => {
  const [guide, packageText] = await Promise.all([
    readFile(path.join(documentIngestionProjectRoot, "docs", "document-ingestion.md"), "utf8"),
    readFile(path.join(documentIngestionProjectRoot, "package.json"), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);
  assert.match(guide, /does not perform malware scanning/i);
  assert.match(guide, /never stores[\s\S]*?source filename or path/i);
  assert.match(guide, /exact SHA-256 hash[\s\S]*?staged receipt/i);
  assert.match(packageJson.scripts["documents:inspect"], /--inspect/);
  assert.match(packageJson.scripts["documents:publish"], /--publish/);
});
