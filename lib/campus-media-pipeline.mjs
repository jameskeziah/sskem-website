import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { loadApprovalManifest, validateApprovalManifest } from "./approval-manifest.mjs";

// Avoid retaining source or derivative file handles on Windows/OneDrive after
// verification. Pixel and operation caches remain available.
sharp.cache({ files: 0 });

export const campusMediaConfigUrl = new URL("../content/campus-media-pipeline.json", import.meta.url);
export const campusMediaProjectRoot = fileURLToPath(new URL("../", import.meta.url));

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

export async function loadCampusMediaConfig() {
  return JSON.parse(await readFile(campusMediaConfigUrl, "utf8"));
}

export function validateCampusMediaConfig(config) {
  const issues = [];
  const add = (pathName, message) => issues.push({ path: pathName, message });

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    add("$", "Configuration must be an object.");
    return issues;
  }
  if (config.schemaVersion !== 1) add("schemaVersion", "Only schema version 1 is supported.");
  if (config.pipelineId !== "sskem-campus-media") add("pipelineId", "Unexpected pipeline identifier.");
  if (!Array.isArray(config.allowedInputFormats) || !config.allowedInputFormats.length) add("allowedInputFormats", "At least one input format is required.");
  if (!Array.isArray(config.allowedColourSpaces) || !config.allowedColourSpaces.length) add("allowedColourSpaces", "At least one colour space is required.");
  if (!Number.isInteger(config.minimumMaster?.longEdge) || config.minimumMaster.longEdge < 1600) add("minimumMaster.longEdge", "Use a production-sized minimum long edge.");
  if (!Number.isInteger(config.minimumMaster?.shortEdge) || config.minimumMaster.shortEdge < 900) add("minimumMaster.shortEdge", "Use a production-sized minimum short edge.");
  if (typeof config.stagingRoot !== "string" || path.isAbsolute(config.stagingRoot)) add("stagingRoot", "Staging root must be repository-relative.");
  if (typeof config.publicRoot !== "string" || path.isAbsolute(config.publicRoot)) add("publicRoot", "Public root must be repository-relative.");

  if (!config.profiles || typeof config.profiles !== "object" || Array.isArray(config.profiles)) {
    add("profiles", "At least one output profile is required.");
    return issues;
  }

  for (const [profileName, profile] of Object.entries(config.profiles)) {
    if (!Array.isArray(profile.widths) || !profile.widths.length || profile.widths.some((width) => !Number.isInteger(width) || width < 320)) {
      add(`profiles.${profileName}.widths`, "Widths must be production-sized positive integers.");
    } else if ([...profile.widths].sort((left, right) => left - right).some((width, index) => width !== profile.widths[index])) {
      add(`profiles.${profileName}.widths`, "Widths must be in ascending order.");
    }
    for (const format of ["avif", "webp", "jpeg"]) {
      const settings = profile.formats?.[format];
      if (!settings) {
        add(`profiles.${profileName}.formats.${format}`, "AVIF, WebP and JPEG settings are required.");
        continue;
      }
      if (!Number.isInteger(settings.quality) || !Number.isInteger(settings.minimumQuality) || settings.minimumQuality > settings.quality) {
        add(`profiles.${profileName}.formats.${format}.quality`, "Quality range is invalid.");
      }
      if (!Number.isInteger(settings.maximumBytes) || settings.maximumBytes < 50_000) {
        add(`profiles.${profileName}.formats.${format}.maximumBytes`, "A realistic byte ceiling is required.");
      }
    }
  }

  return issues;
}

function orientedDimensions(metadata) {
  return metadata.autoOrient?.width && metadata.autoOrient?.height
    ? { width: metadata.autoOrient.width, height: metadata.autoOrient.height }
    : { width: metadata.width ?? 0, height: metadata.height ?? 0 };
}

export async function inspectCampusMedia({ recordId, inputPath, profileName = "campus-responsive", config: suppliedConfig, manifest: suppliedManifest }) {
  if (!recordId) throw new Error("A media approval record ID is required.");
  const [config, manifest] = await Promise.all([
    suppliedConfig ?? loadCampusMediaConfig(),
    suppliedManifest ?? loadApprovalManifest(),
  ]);
  const configIssues = validateCampusMediaConfig(config);
  if (configIssues.length) throw new Error(`Invalid campus media configuration: ${configIssues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
  const manifestIssues = validateApprovalManifest(manifest);
  if (manifestIssues.length) throw new Error("The publication approval manifest must validate before media inspection.");
  const record = manifest.records.find((candidate) => candidate.id === recordId);
  if (!record || record.kind !== "media") throw new Error(`Unknown media approval record: ${recordId}`);

  const profile = config.profiles[profileName];
  if (!profile) throw new Error(`Unknown campus media profile: ${profileName}`);

  const resolvedInput = path.resolve(inputPath);
  const details = await pathState(resolvedInput);
  if (!details?.isFile()) throw new Error("The media input must be an existing file.");

  const metadata = await sharp(resolvedInput, { failOn: "warning", limitInputPixels: 120_000_000 }).metadata();
  const dimensions = orientedDimensions(metadata);
  const longEdge = Math.max(dimensions.width, dimensions.height);
  const shortEdge = Math.min(dimensions.width, dimensions.height);
  const issues = [];

  if (!config.allowedInputFormats.includes(metadata.format)) issues.push(`Input format ${metadata.format ?? "unknown"} is not an approved master format.`);
  if (!config.allowedColourSpaces.includes(metadata.space)) issues.push(`Input colour space ${metadata.space ?? "unknown"} is not approved; provide an sRGB master.`);
  if (metadata.pages && metadata.pages > 1) issues.push("Animated or multi-page images are not accepted.");
  if (longEdge < config.minimumMaster.longEdge || shortEdge < config.minimumMaster.shortEdge) {
    issues.push(`Master dimensions must be at least ${config.minimumMaster.longEdge} px on the long edge and ${config.minimumMaster.shortEdge} px on the short edge.`);
  }

  return {
    record: {
      id: record.id,
      decision: record.decision,
      checkProfile: record.checkProfile,
    },
    eligible: issues.length === 0,
    issues,
    source: {
      fileName: path.basename(resolvedInput),
      format: metadata.format ?? "unknown",
      width: dimensions.width,
      height: dimensions.height,
      colourSpace: metadata.space ?? "unknown",
      bytes: details.size,
      containsEmbeddedMetadata: Boolean(metadata.exif || metadata.xmp || metadata.iptc),
    },
    profile: {
      name: profileName,
      widths: profile.widths,
      formats: Object.keys(profile.formats),
      crop: "none",
    },
  };
}

async function encodeWithinBudget(inputPath, width, format, settings) {
  for (let quality = settings.quality; quality >= settings.minimumQuality; quality -= 4) {
    let pipeline = sharp(inputPath, { failOn: "warning", limitInputPixels: 120_000_000 })
      .rotate()
      .resize({ width, fit: "inside", withoutEnlargement: true })
      .toColorspace("srgb");

    if (format === "avif") pipeline = pipeline.avif({ quality, effort: settings.effort ?? 6 });
    if (format === "webp") pipeline = pipeline.webp({ quality, effort: settings.effort ?? 5, smartSubsample: true });
    if (format === "jpeg") pipeline = pipeline.jpeg({ quality, mozjpeg: true, progressive: true });

    const output = await pipeline.toBuffer({ resolveWithObject: true });
    if (output.data.length <= settings.maximumBytes) return { ...output, quality };
  }

  throw new Error(`${format.toUpperCase()} ${width} px derivative exceeds its ${settings.maximumBytes}-byte budget at minimum quality.`);
}

async function assertDerivativePrivacy(buffer, filename) {
  const metadata = await sharp(buffer).metadata();
  if (metadata.exif || metadata.xmp || metadata.iptc) {
    throw new Error(`${filename} retained private embedded metadata.`);
  }
  return metadata;
}

export async function prepareCampusMedia({
  recordId,
  inputPath,
  outputPath,
  profileName = "campus-responsive",
  publish = false,
  replace = false,
  manifest: suppliedManifest,
  config: suppliedConfig,
}) {
  const [manifest, config] = await Promise.all([
    suppliedManifest ?? loadApprovalManifest(),
    suppliedConfig ?? loadCampusMediaConfig(),
  ]);
  const manifestIssues = validateApprovalManifest(manifest);
  if (manifestIssues.length) throw new Error("The publication approval manifest must validate before media preparation.");
  const configIssues = validateCampusMediaConfig(config);
  if (configIssues.length) throw new Error("The campus media configuration must validate before media preparation.");

  const record = manifest.records.find((candidate) => candidate.id === recordId);
  if (!record || record.kind !== "media") throw new Error(`Unknown media approval record: ${recordId}`);
  if (publish && record.decision !== "approved") throw new Error(`${recordId} is not approved; public media generation is refused.`);

  const inspection = await inspectCampusMedia({ recordId, inputPath, profileName, config, manifest });
  if (!inspection.eligible) throw new Error(`Media master is not eligible: ${inspection.issues.join(" ")}`);

  const profile = config.profiles[profileName];
  const stagingRoot = path.resolve(campusMediaProjectRoot, config.stagingRoot);
  const publicRoot = path.resolve(campusMediaProjectRoot, config.publicRoot);
  const allowedRoot = publish ? publicRoot : stagingRoot;
  const resolvedOutput = path.resolve(outputPath ?? path.join(allowedRoot, recordId));
  const resolvedInput = path.resolve(inputPath);

  if (!withinDirectory(resolvedOutput, allowedRoot)) throw new Error(`Output must remain inside ${publish ? config.publicRoot : config.stagingRoot}.`);
  if (withinDirectory(resolvedInput, resolvedOutput) || resolvedInput === resolvedOutput) throw new Error("The source master cannot be inside its derivative output directory.");

  const existing = await pathState(resolvedOutput);
  if (existing && !existing.isDirectory()) throw new Error("The output path already exists and is not a directory.");
  if (existing && (await readdir(resolvedOutput)).length && !replace) throw new Error("The output directory is not empty; use an explicit replacement operation.");

  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  const nonce = `${process.pid}-${Date.now()}`;
  const temporaryOutput = `${resolvedOutput}.tmp-${nonce}`;
  const backupOutput = `${resolvedOutput}.backup-${nonce}`;
  await mkdir(temporaryOutput, { recursive: true });

  try {
    const sourceBuffer = await readFile(resolvedInput);
    const receiptSource = { ...inspection.source };
    delete receiptSource.fileName;
    const variants = [];

    for (const width of profile.widths) {
      for (const [format, settings] of Object.entries(profile.formats)) {
        const filename = `${recordId}-${width}.${format === "jpeg" ? "jpg" : format}`;
        const encoded = await encodeWithinBudget(resolvedInput, width, format, settings);
        const metadata = await assertDerivativePrivacy(encoded.data, filename);
        await writeFile(path.join(temporaryOutput, filename), encoded.data);
        variants.push({
          filename,
          format,
          width: encoded.info.width,
          height: encoded.info.height,
          bytes: encoded.data.length,
          quality: encoded.quality,
          sha256: sha256(encoded.data),
          embeddedMetadataRemoved: true,
          colourSpace: metadata.space ?? "srgb",
        });
      }
    }

    const receipt = {
      schemaVersion: 1,
      pipelineId: config.pipelineId,
      recordId,
      decisionAtPreparation: record.decision,
      mode: publish ? "public" : "staging",
      generatedAt: new Date().toISOString(),
      source: {
        ...receiptSource,
        sha256: sha256(sourceBuffer),
      },
      output: {
        profile: profileName,
        crop: "none",
        embeddedMetadataPolicy: "EXIF, XMP and IPTC removed",
        variants,
      },
    };
    await writeFile(path.join(temporaryOutput, "intake-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");

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
