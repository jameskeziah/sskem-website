import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { loadApprovalManifest, validateApprovalManifest } from "./approval-manifest.mjs";

const runFile = promisify(execFile);
sharp.cache({ files: 0 });

export const documentIngestionConfigUrl = new URL("../content/document-ingestion-pipeline.json", import.meta.url);
export const documentIngestionProjectRoot = fileURLToPath(new URL("../", import.meta.url));

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function removeDirectory(target) {
  return rm(target, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
}

function withinDirectory(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function pathState(target) {
  try {
    return await stat(target);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function executableExists(candidate) {
  if (!path.isAbsolute(candidate)) return true;
  return Boolean(await pathState(candidate));
}

export async function resolvePopplerTools() {
  const configuredRoot = process.env.SSKEM_POPPLER_BIN;
  const programFilesX86 = process.env["ProgramFiles(x86)"];
  const roots = [
    configuredRoot,
    programFilesX86 ? path.join(programFilesX86, "poppler-25.12.0", "Library", "bin") : null,
  ].filter(Boolean);

  for (const root of roots) {
    const tools = {
      pdfinfo: path.join(root, process.platform === "win32" ? "pdfinfo.exe" : "pdfinfo"),
      pdftotext: path.join(root, process.platform === "win32" ? "pdftotext.exe" : "pdftotext"),
      pdftoppm: path.join(root, process.platform === "win32" ? "pdftoppm.exe" : "pdftoppm"),
    };
    if ((await Promise.all(Object.values(tools).map(executableExists))).every(Boolean)) return tools;
  }

  return { pdfinfo: "pdfinfo", pdftotext: "pdftotext", pdftoppm: "pdftoppm" };
}

async function runPoppler(command, argumentsList, options = {}) {
  try {
    return await runFile(command, argumentsList, {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      windowsHide: true,
      ...options,
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`Required Poppler command is unavailable: ${path.basename(command)}. Install Poppler or set SSKEM_POPPLER_BIN.`);
    }
    throw error;
  }
}

function parsePdfInfo(output) {
  const information = {};
  for (const line of output.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    information[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return information;
}

function isYes(value) {
  return /^yes\b/i.test(value ?? "");
}

function publicSafePdfVersion(value) {
  const version = Number.parseFloat(value);
  return Number.isFinite(version) ? version : null;
}

export async function loadDocumentIngestionConfig() {
  return JSON.parse(await readFile(documentIngestionConfigUrl, "utf8"));
}

export function validateDocumentIngestionConfig(config) {
  const issues = [];
  const add = (pathName, message) => issues.push({ path: pathName, message });

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    add("$", "Configuration must be an object.");
    return issues;
  }
  if (config.schemaVersion !== 1) add("schemaVersion", "Only schema version 1 is supported.");
  if (config.pipelineId !== "sskem-public-document") add("pipelineId", "Unexpected pipeline identifier.");
  if (config.allowedExtension !== ".pdf") add("allowedExtension", "Only PDF input is supported.");
  if (!Number.isInteger(config.maximumInputBytes) || config.maximumInputBytes < 1_000_000) add("maximumInputBytes", "Use a realistic positive input limit.");
  if (!Number.isInteger(config.maximumPages) || config.maximumPages < 1) add("maximumPages", "A positive page limit is required.");
  if (!Number.isInteger(config.minimumTextCharactersPerPage) || config.minimumTextCharactersPerPage < 1) add("minimumTextCharactersPerPage", "A positive text-layer threshold is required.");
  if (!Number.isInteger(config.renderDpi) || config.renderDpi < 72 || config.renderDpi > 200) add("renderDpi", "Preview DPI must be between 72 and 200.");
  if (typeof config.stagingRoot !== "string" || path.isAbsolute(config.stagingRoot)) add("stagingRoot", "Staging root must be repository-relative.");
  if (typeof config.publicRoot !== "string" || path.isAbsolute(config.publicRoot)) add("publicRoot", "Public root must be repository-relative.");
  if (typeof config.publicFilenamePattern !== "string") {
    add("publicFilenamePattern", "A stable filename pattern is required.");
  } else {
    try {
      new RegExp(config.publicFilenamePattern);
    } catch {
      add("publicFilenamePattern", "Filename pattern must be a valid regular expression.");
    }
  }
  if (!Array.isArray(config.prohibitedPdfTokens) || !config.prohibitedPdfTokens.length || config.prohibitedPdfTokens.some((token) => typeof token !== "string" || !token.startsWith("/"))) {
    add("prohibitedPdfTokens", "At least one slash-prefixed PDF token is required.");
  }
  return issues;
}

function validateRecord(manifest, recordId) {
  const manifestIssues = validateApprovalManifest(manifest);
  if (manifestIssues.length) throw new Error("The publication approval manifest must validate before document intake.");
  const record = manifest.records.find((candidate) => candidate.id === recordId);
  if (!record || record.kind !== "document") throw new Error(`Unknown document approval record: ${recordId}`);
  return record;
}

export function validPublicDocumentFilename(filename, config) {
  return typeof filename === "string"
    && path.basename(filename) === filename
    && new RegExp(config.publicFilenamePattern).test(filename);
}

export async function inspectPublicDocument({ recordId, inputPath, config: suppliedConfig, manifest: suppliedManifest }) {
  if (!recordId) throw new Error("A document approval record ID is required.");
  const [config, manifest, tools] = await Promise.all([
    suppliedConfig ?? loadDocumentIngestionConfig(),
    suppliedManifest ?? loadApprovalManifest(),
    resolvePopplerTools(),
  ]);
  const configIssues = validateDocumentIngestionConfig(config);
  if (configIssues.length) throw new Error(`Invalid document-ingestion configuration: ${configIssues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
  const record = validateRecord(manifest, recordId);
  const resolvedInput = path.resolve(inputPath);
  const details = await pathState(resolvedInput);
  if (!details?.isFile()) throw new Error("The document input must be an existing file.");

  const buffer = await readFile(resolvedInput);
  const issues = [];
  const warnings = ["Malware scanning is not performed by this local pipeline; controlled scan evidence remains mandatory before publication."];
  if (path.extname(resolvedInput).toLowerCase() !== config.allowedExtension) issues.push("Input must use the .pdf extension.");
  if (details.size > config.maximumInputBytes) issues.push(`PDF exceeds the ${config.maximumInputBytes}-byte input limit.`);
  if (!buffer.subarray(0, 8).toString("latin1").startsWith("%PDF-")) issues.push("Input does not have a valid PDF header.");

  const rawPdf = buffer.toString("latin1");
  const detectedTokens = config.prohibitedPdfTokens.filter((token) => rawPdf.includes(token));
  if (detectedTokens.length) issues.push(`Prohibited interactive or embedded-content token(s) detected: ${detectedTokens.join(", ")}.`);
  if (rawPdf.includes("/Encrypt")) issues.push("Encrypted or password-protected PDFs are not accepted.");

  let information;
  try {
    const result = await runPoppler(tools.pdfinfo, [resolvedInput]);
    information = parsePdfInfo(result.stdout);
  } catch (error) {
    if (!issues.length) issues.push(`Poppler could not parse the PDF: ${String(error?.stderr || error?.message || error).trim()}`);
    information = {};
  }

  const pages = Number.parseInt(information.Pages ?? "0", 10);
  const encrypted = isYes(information.Encrypted);
  if (encrypted && !issues.some((issue) => /encrypted/i.test(issue))) issues.push("Encrypted or password-protected PDFs are not accepted.");
  if (!Number.isInteger(pages) || pages < 1) issues.push("PDF must contain at least one readable page.");
  if (pages > config.maximumPages) issues.push(`PDF exceeds the ${config.maximumPages}-page limit.`);

  let textCharacters = 0;
  if (!encrypted && pages > 0 && !issues.some((issue) => /valid PDF header|could not parse/i.test(issue))) {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "sskem-document-text-"));
    const textPath = path.join(temporaryDirectory, "extracted.txt");
    try {
      await runPoppler(tools.pdftotext, ["-layout", "-enc", "UTF-8", resolvedInput, textPath]);
      const extracted = await readFile(textPath, "utf8");
      textCharacters = extracted.replace(/\s/g, "").length;
    } catch (error) {
      warnings.push(`Text extraction requires reviewer follow-up: ${String(error?.stderr || error?.message || error).trim()}`);
    } finally {
      await removeDirectory(temporaryDirectory);
    }
  }

  const textThreshold = Math.max(1, pages) * config.minimumTextCharactersPerPage;
  const accessibilityAssessment = textCharacters >= textThreshold ? "text-readable" : "remediation-required";
  if (accessibilityAssessment === "remediation-required") warnings.push("The text layer is missing or too sparse; OCR and accessibility remediation are required before approval.");

  return {
    record: { id: record.id, decision: record.decision, checkProfile: record.checkProfile },
    eligibleForStaging: issues.length === 0,
    issues,
    warnings,
    source: {
      bytes: details.size,
      sha256: sha256(buffer),
      pages,
      pdfVersion: publicSafePdfVersion(information["PDF version"]),
      tagged: isYes(information.Tagged),
      encrypted,
    },
    safety: {
      activeOrEmbeddedContent: detectedTokens.length ? "detected" : "not-detected",
      detectedTokens,
      malwareScanner: "not-run",
      malwareScanRequirement: "verified controlled evidence required before publication",
    },
    accessibility: {
      assessment: accessibilityAssessment,
      extractedTextCharacters: textCharacters,
      minimumExpectedCharacters: textThreshold,
      extractedTextPersisted: false,
    },
  };
}

async function renderPreviews({ inputPath, outputDirectory, pages, dpi, pdftoppm }) {
  const rawPrefix = path.join(outputDirectory, "render");
  await runPoppler(pdftoppm, ["-png", "-r", String(dpi), inputPath, rawPrefix], { maxBuffer: 40 * 1024 * 1024 });
  const rawFiles = (await readdir(outputDirectory))
    .filter((filename) => /^render-\d+\.png$/i.test(filename))
    .sort((left, right) => Number.parseInt(left.match(/\d+/)?.[0] ?? "0", 10) - Number.parseInt(right.match(/\d+/)?.[0] ?? "0", 10));
  if (rawFiles.length !== pages) throw new Error(`Rendered ${rawFiles.length} preview pages; expected ${pages}.`);

  const previews = [];
  for (const [index, rawFile] of rawFiles.entries()) {
    const filename = `page-${String(index + 1).padStart(3, "0")}.png`;
    const rawPath = path.join(outputDirectory, rawFile);
    const finalPath = path.join(outputDirectory, filename);
    await rename(rawPath, finalPath);
    const [buffer, metadata] = await Promise.all([readFile(finalPath), sharp(finalPath).metadata()]);
    if (!metadata.width || !metadata.height) throw new Error(`${filename} is not a valid rendered preview.`);
    previews.push({ filename, width: metadata.width, height: metadata.height, bytes: buffer.length, sha256: sha256(buffer) });
  }
  return previews;
}

function assertStagedReceipt(receipt, { recordId, sourceSha256 }) {
  if (receipt?.schemaVersion !== 1 || receipt?.pipelineId !== "sskem-public-document") throw new Error("Staged receipt has an unsupported document-pipeline contract.");
  if (receipt.recordId !== recordId) throw new Error("Staged receipt belongs to a different approval record.");
  if (receipt.mode !== "staging") throw new Error("Publication requires a staging receipt.");
  if (receipt.source?.sha256 !== sourceSha256) throw new Error("Input PDF hash does not match the staged and reviewed receipt.");
  if (receipt.safety?.activeOrEmbeddedContent !== "not-detected" || receipt.source?.encrypted) throw new Error("Staged receipt does not establish a safe static PDF candidate.");
}

export async function preparePublicDocument({
  recordId,
  inputPath,
  outputPath,
  receiptPath,
  publicFilename,
  publish = false,
  replace = false,
  manifest: suppliedManifest,
  config: suppliedConfig,
}) {
  const [manifest, config, tools] = await Promise.all([
    suppliedManifest ?? loadApprovalManifest(),
    suppliedConfig ?? loadDocumentIngestionConfig(),
    resolvePopplerTools(),
  ]);
  const configIssues = validateDocumentIngestionConfig(config);
  if (configIssues.length) throw new Error("The document-ingestion configuration must validate before preparation.");
  const record = validateRecord(manifest, recordId);
  if (publish && record.decision !== "approved") throw new Error(`${recordId} is not approved; public document generation is refused.`);
  if (publish && record.checks?.["malware-scan"] !== "verified") throw new Error(`${recordId} lacks a verified controlled malware-scan check; publication is refused.`);
  if (publish && !validPublicDocumentFilename(publicFilename, config)) throw new Error("Publication requires a stable, kebab-case .pdf filename supplied with --public-filename.");

  const inspection = await inspectPublicDocument({ recordId, inputPath, config, manifest });
  if (!inspection.eligibleForStaging) throw new Error(`PDF is not eligible for staging: ${inspection.issues.join(" ")}`);

  const stagingRoot = path.resolve(documentIngestionProjectRoot, config.stagingRoot);
  const publicRoot = path.resolve(documentIngestionProjectRoot, config.publicRoot);
  const allowedRoot = publish ? publicRoot : stagingRoot;
  const resolvedOutput = path.resolve(outputPath ?? path.join(allowedRoot, recordId));
  const resolvedInput = path.resolve(inputPath);
  if (!withinDirectory(resolvedOutput, allowedRoot)) throw new Error(`Output must remain inside ${publish ? config.publicRoot : config.stagingRoot}.`);
  if (withinDirectory(resolvedInput, resolvedOutput) || resolvedInput === resolvedOutput) throw new Error("The source PDF cannot be inside its output directory.");

  if (publish) {
    const resolvedReceipt = path.resolve(receiptPath ?? path.join(stagingRoot, recordId, "intake-receipt.json"));
    if (!withinDirectory(resolvedReceipt, stagingRoot)) throw new Error(`Staging receipt must remain inside ${config.stagingRoot}.`);
    const stagedReceipt = JSON.parse(await readFile(resolvedReceipt, "utf8"));
    assertStagedReceipt(stagedReceipt, { recordId, sourceSha256: inspection.source.sha256 });
  }

  const existing = await pathState(resolvedOutput);
  if (existing && !existing.isDirectory()) throw new Error("The output path already exists and is not a directory.");
  if (existing && (await readdir(resolvedOutput)).length && !replace) throw new Error("The output directory is not empty; use an explicit replacement operation.");

  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  const nonce = `${process.pid}-${Date.now()}`;
  const temporaryOutput = `${resolvedOutput}.tmp-${nonce}`;
  const backupOutput = `${resolvedOutput}.backup-${nonce}`;
  await mkdir(temporaryOutput, { recursive: true });

  try {
    let previews = [];
    if (publish) {
      const publishedPath = path.join(temporaryOutput, publicFilename);
      await copyFile(resolvedInput, publishedPath);
      if (sha256(await readFile(publishedPath)) !== inspection.source.sha256) {
        throw new Error("The source PDF changed during publication; restart inspection and approval binding.");
      }
    } else {
      const candidatePath = path.join(temporaryOutput, "candidate.pdf");
      await copyFile(resolvedInput, candidatePath);
      if (sha256(await readFile(candidatePath)) !== inspection.source.sha256) {
        throw new Error("The source PDF changed during staging; restart inspection.");
      }
      previews = await renderPreviews({
        inputPath: candidatePath,
        outputDirectory: temporaryOutput,
        pages: inspection.source.pages,
        dpi: config.renderDpi,
        pdftoppm: tools.pdftoppm,
      });
    }

    const receipt = {
      schemaVersion: 1,
      pipelineId: config.pipelineId,
      recordId,
      decisionAtPreparation: record.decision,
      mode: publish ? "public" : "staging",
      generatedAt: new Date().toISOString(),
      source: inspection.source,
      safety: inspection.safety,
      accessibility: inspection.accessibility,
      output: publish
        ? { filename: publicFilename, sha256: inspection.source.sha256 }
        : { candidateFilename: "candidate.pdf", renderDpi: config.renderDpi, previews },
    };
    if (!publish) await writeFile(path.join(temporaryOutput, "intake-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");

    if (existing) await rename(resolvedOutput, backupOutput);
    try {
      await rename(temporaryOutput, resolvedOutput);
    } catch (error) {
      if (existing) await rename(backupOutput, resolvedOutput);
      throw error;
    }
    if (existing) await removeDirectory(backupOutput);
    return { outputDirectory: resolvedOutput, receipt };
  } catch (error) {
    await removeDirectory(temporaryOutput);
    throw error;
  }
}
