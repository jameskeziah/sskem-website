import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import configData from "../content/homepage-poster-optimization.json" with { type: "json" };

sharp.cache({ files: 0 });

export const homepagePosterOptimizationConfig = configData;
export const homepagePosterProjectRoot = fileURLToPath(new URL("../", import.meta.url));

const topLevelKeys = new Set(["$schema", "schemaVersion", "workflowId", "asset", "staging", "profile"]);
const assetKeys = new Set(["id", "sourcePath", "approvalRecordId", "format", "width", "height", "maximumBytes"]);
const stagingKeys = new Set(["root", "candidateFilename", "receiptFilename"]);
const profileKeys = new Set(["compressionLevel", "adaptiveFiltering", "palette", "resize", "crop", "pixelChangesAllowed", "publicWriteAllowed"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function unknownKeys(value, allowed) {
  return isRecord(value) ? Object.keys(value).filter((key) => !allowed.has(key)) : [];
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
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

function removeDirectory(target) {
  return rm(target, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
}

function normalizedRelativePath(root, target) {
  return path.relative(root, target).split(path.sep).join("/");
}

export function validateHomepagePosterOptimizationConfig(config = homepagePosterOptimizationConfig) {
  const issues = [];
  if (!isRecord(config)) return ["Homepage poster optimization configuration must be an object."];
  if (unknownKeys(config, topLevelKeys).length) issues.push("Homepage poster optimization configuration contains unknown top-level fields.");
  if (
    config.$schema !== "./homepage-poster-optimization.schema.json"
    || config.schemaVersion !== 1
    || config.workflowId !== "sskem-homepage-poster-lossless"
  ) issues.push("Homepage poster optimization identity is invalid.");
  if (!isRecord(config.asset) || unknownKeys(config.asset, assetKeys).length || config.asset.id !== "homepage-social-poster"
    || config.asset.sourcePath !== "public/og.png" || config.asset.approvalRecordId !== "media-homepage-social-poster"
    || config.asset.format !== "png" || config.asset.width !== 1200 || config.asset.height !== 630 || config.asset.maximumBytes !== 400000) {
    issues.push("Homepage poster optimization asset contract is invalid.");
  }
  if (!isRecord(config.staging) || unknownKeys(config.staging, stagingKeys).length || config.staging.root !== "work/homepage-poster-optimization"
    || config.staging.candidateFilename !== "og.lossless.png" || config.staging.receiptFilename !== "optimization-receipt.json") {
    issues.push("Homepage poster optimization staging contract is invalid.");
  }
  if (!isRecord(config.profile) || unknownKeys(config.profile, profileKeys).length || config.profile.compressionLevel !== 9
    || config.profile.adaptiveFiltering !== true || config.profile.palette !== false || config.profile.resize !== "none"
    || config.profile.crop !== "none" || config.profile.pixelChangesAllowed !== false || config.profile.publicWriteAllowed !== false) {
    issues.push("Homepage poster optimization profile must remain lossless, uncropped, unresized and staging-only.");
  }
  return issues;
}

async function buildCandidate(options = {}) {
  const config = options.config ?? homepagePosterOptimizationConfig;
  const configIssues = validateHomepagePosterOptimizationConfig(config);
  if (configIssues.length) throw new Error(configIssues.join(" "));
  const rootDir = path.resolve(options.rootDir ?? homepagePosterProjectRoot);
  const sourcePath = path.resolve(rootDir, config.asset.sourcePath);
  if (!withinDirectory(sourcePath, rootDir)) throw new Error("Homepage poster source resolves outside the project root.");

  const sourceBuffer = await readFile(sourcePath);
  const sourceMetadata = await sharp(sourceBuffer, { failOn: "error" }).metadata();
  const issues = [];
  if (sourceMetadata.format !== config.asset.format) issues.push(`Source format must remain ${config.asset.format}.`);
  if (sourceMetadata.width !== config.asset.width || sourceMetadata.height !== config.asset.height) {
    issues.push(`Source dimensions must remain ${config.asset.width} x ${config.asset.height}.`);
  }
  if ((sourceMetadata.pages ?? 1) !== 1) issues.push("Homepage poster must contain exactly one still image.");

  const candidateBuffer = await sharp(sourceBuffer, { failOn: "error" })
    .png({
      compressionLevel: config.profile.compressionLevel,
      adaptiveFiltering: config.profile.adaptiveFiltering,
      palette: config.profile.palette,
    })
    .toBuffer();
  const [sourcePixels, candidatePixels, candidateMetadata] = await Promise.all([
    sharp(sourceBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(candidateBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(candidateBuffer).metadata(),
  ]);
  const pixelExact = sourcePixels.info.width === candidatePixels.info.width
    && sourcePixels.info.height === candidatePixels.info.height
    && sourcePixels.info.channels === candidatePixels.info.channels
    && sourcePixels.data.equals(candidatePixels.data);
  if (!pixelExact) issues.push("Lossless candidate pixels do not exactly match the source.");
  if (candidateMetadata.format !== "png" || candidateMetadata.width !== config.asset.width || candidateMetadata.height !== config.asset.height) {
    issues.push("Lossless candidate format or dimensions drifted.");
  }
  const privateMetadataRemoved = !candidateMetadata.exif && !candidateMetadata.xmp && !candidateMetadata.iptc;
  if (!privateMetadataRemoved) issues.push("Lossless candidate retained private embedded metadata.");
  const withinBudget = candidateBuffer.length <= config.asset.maximumBytes;
  const status = issues.length
    ? "blocked"
    : withinBudget
      ? "budget-met"
      : "format-change-review-required";

  const report = {
    workflowId: config.workflowId,
    assetId: config.asset.id,
    status,
    issues,
    source: {
      sha256: sha256(sourceBuffer),
      bytes: sourceBuffer.length,
      format: sourceMetadata.format ?? "unknown",
      width: sourceMetadata.width ?? 0,
      height: sourceMetadata.height ?? 0,
      pixelSha256: sha256(sourcePixels.data),
    },
    candidate: {
      filename: config.staging.candidateFilename,
      sha256: sha256(candidateBuffer),
      bytes: candidateBuffer.length,
      format: candidateMetadata.format ?? "unknown",
      width: candidateMetadata.width ?? 0,
      height: candidateMetadata.height ?? 0,
      pixelSha256: sha256(candidatePixels.data),
      pixelExact,
      privateMetadataRemoved,
      maximumBytes: config.asset.maximumBytes,
      withinBudget,
      overageBytes: Math.max(0, candidateBuffer.length - config.asset.maximumBytes),
    },
    decision: issues.length
      ? "Optimization is blocked until the source matches the exact poster contract."
      : withinBudget
        ? "The exact-composition candidate may proceed to independent artwork and publication review."
        : "Lossless optimization cannot satisfy the current budget; any format or pixel change requires a separate approved art-direction decision.",
    guardrails: {
      sourceModified: false,
      publicWritePerformed: false,
      resizeApplied: false,
      cropApplied: false,
      overlayApplied: false,
      pixelChangesAllowed: false,
      approvalGrantedByWorkflow: false,
    },
  };
  return { report, candidateBuffer };
}

export async function inspectHomepagePosterOptimization(options = {}) {
  return (await buildCandidate(options)).report;
}

export async function prepareHomepagePosterOptimization(options = {}) {
  const config = options.config ?? homepagePosterOptimizationConfig;
  const rootDir = path.resolve(options.rootDir ?? homepagePosterProjectRoot);
  const { report, candidateBuffer } = await buildCandidate({ ...options, config, rootDir });
  if (report.issues.length) throw new Error(`Homepage poster optimization is blocked: ${report.issues.join(" ")}`);

  const stagingRoot = path.resolve(rootDir, config.staging.root);
  const outputDirectory = path.resolve(stagingRoot, config.asset.id);
  if (!withinDirectory(outputDirectory, stagingRoot)) throw new Error("Homepage poster output resolves outside the ignored staging root.");
  const existing = await pathState(outputDirectory);
  if (existing && !existing.isDirectory()) throw new Error("Homepage poster staging output already exists and is not a directory.");
  if (existing && (await readdir(outputDirectory)).length && !options.replace) {
    throw new Error("Homepage poster staging output is not empty; use an explicit replacement operation.");
  }

  const generatedAt = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  if (Number.isNaN(generatedAt.getTime())) throw new Error("Homepage poster preparation requires a valid time.");
  const receipt = {
    receiptVersion: 1,
    workflowId: config.workflowId,
    assetId: config.asset.id,
    mode: "staging",
    generatedAt: generatedAt.toISOString(),
    status: report.status,
    source: report.source,
    candidate: report.candidate,
    decision: report.decision,
    guardrails: report.guardrails,
  };

  await mkdir(path.dirname(outputDirectory), { recursive: true });
  const nonce = `${process.pid}-${Date.now()}`;
  const temporaryOutput = `${outputDirectory}.tmp-${nonce}`;
  const backupOutput = `${outputDirectory}.backup-${nonce}`;
  await mkdir(temporaryOutput, { recursive: true });
  try {
    await writeFile(path.join(temporaryOutput, config.staging.candidateFilename), candidateBuffer);
    await writeFile(path.join(temporaryOutput, config.staging.receiptFilename), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    if (existing) await rename(outputDirectory, backupOutput);
    try {
      await rename(temporaryOutput, outputDirectory);
    } catch (error) {
      if (existing) await rename(backupOutput, outputDirectory);
      throw error;
    }
    if (existing) await removeDirectory(backupOutput);
  } catch (error) {
    await removeDirectory(temporaryOutput);
    throw error;
  }

  return {
    mode: "staging-write",
    outputDirectory: normalizedRelativePath(rootDir, outputDirectory),
    receipt,
  };
}
