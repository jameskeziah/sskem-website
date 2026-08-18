export const CAMPUS_MASTER_PREFLIGHT_REPORT_ID = "sskem-campus-master-browser-preflight";

export const campusMasterPreflightRecordIds = [
  "media-campus-main",
  "media-campus-grounds",
  "media-campus-entrance",
  "media-campus-courtyard",
] as const;

export type CampusMasterPreflightRecordId = (typeof campusMasterPreflightRecordIds)[number];

export type CampusMasterPreflightPipeline = {
  schemaVersion: number;
  pipelineId: string;
  allowedInputFormats: string[];
  minimumMaster: {
    longEdge: number;
    shortEdge: number;
  };
};

export type CampusMasterMeasurement = {
  recordId: string;
  format: string;
  mimeType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  sha256: string;
  browserDecoded: boolean;
};

type PreflightIssue = {
  code: string;
  message: string;
};

const formatMimeTypes: Record<string, readonly string[]> = {
  jpeg: ["image/jpeg", "image/jpg"],
  png: ["image/png"],
  tiff: ["image/tiff", "image/x-tiff"],
};

function validPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function normalizeFormat(value: unknown) {
  const format = typeof value === "string" ? value.trim().toLowerCase() : "";
  return format === "jpg" ? "jpeg" : format === "tif" ? "tiff" : format;
}

function validSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function assertCanonicalMeasurements(measurements: CampusMasterMeasurement[]) {
  if (!Array.isArray(measurements) || measurements.length !== campusMasterPreflightRecordIds.length) {
    throw new Error("The campus master preflight requires exactly four measurements.");
  }
  const recordIds = measurements.map((measurement) => measurement?.recordId);
  if (new Set(recordIds).size !== recordIds.length
    || campusMasterPreflightRecordIds.some((recordId) => !recordIds.includes(recordId))) {
    throw new Error("The measurements must match the exact four canonical campus records.");
  }
}

function assertPipeline(pipeline: CampusMasterPreflightPipeline) {
  if (!pipeline || pipeline.pipelineId !== "sskem-campus-media" || pipeline.schemaVersion !== 1) {
    throw new Error("The canonical campus media pipeline is required.");
  }
  if (!Array.isArray(pipeline.allowedInputFormats) || !pipeline.allowedInputFormats.length
    || !validPositiveInteger(pipeline.minimumMaster?.longEdge)
    || !validPositiveInteger(pipeline.minimumMaster?.shortEdge)) {
    throw new Error("The campus media pipeline requirements are malformed.");
  }
}

export function createCampusMasterPreflightReport(options: {
  measurements: CampusMasterMeasurement[];
  pipeline: CampusMasterPreflightPipeline;
  now?: Date | string | number;
}) {
  assertPipeline(options.pipeline);
  assertCanonicalMeasurements(options.measurements);
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  if (Number.isNaN(now.getTime())) throw new Error("Campus master preflight requires a valid time.");

  const allowedFormats = options.pipeline.allowedInputFormats.map(normalizeFormat);
  const duplicateHashes = new Set<string>();
  const hashCounts = new Map<string, number>();
  for (const measurement of options.measurements) {
    if (!validSha256(measurement.sha256)) continue;
    hashCounts.set(measurement.sha256, (hashCounts.get(measurement.sha256) ?? 0) + 1);
  }
  for (const [hash, count] of hashCounts) if (count > 1) duplicateHashes.add(hash);

  const records = campusMasterPreflightRecordIds.map((recordId) => {
    const measurement = options.measurements.find((candidate) => candidate.recordId === recordId);
    if (!measurement) throw new Error(`Missing campus master measurement for ${recordId}.`);
    const format = normalizeFormat(measurement.format);
    const mimeType = typeof measurement.mimeType === "string" && measurement.mimeType.trim()
      ? measurement.mimeType.trim().toLowerCase()
      : "unknown";
    const issues: PreflightIssue[] = [];

    if (!allowedFormats.includes(format)) {
      issues.push({ code: "unsupported-format", message: `${format || "unknown"} is not an allowed master format.` });
    } else if (mimeType !== "unknown" && !(formatMimeTypes[format] ?? []).includes(mimeType)) {
      issues.push({ code: "mime-format-mismatch", message: `${mimeType} does not match the detected ${format} format.` });
    }
    if (!validPositiveInteger(measurement.bytes)) {
      issues.push({ code: "empty-file", message: "The selected file has no readable bytes." });
    }
    if (!validSha256(measurement.sha256)) {
      issues.push({ code: "invalid-sha256", message: "A complete lowercase SHA-256 digest is required." });
    } else if (duplicateHashes.has(measurement.sha256)) {
      issues.push({ code: "duplicate-exact-bytes", message: "The exact same file bytes were selected for more than one campus role." });
    }
    if (!measurement.browserDecoded || !validPositiveInteger(measurement.width) || !validPositiveInteger(measurement.height)) {
      issues.push({ code: "browser-dimensions-unavailable", message: "The browser could not verify pixel dimensions; use the authoritative local inspector." });
    } else {
      const longEdge = Math.max(measurement.width, measurement.height);
      const shortEdge = Math.min(measurement.width, measurement.height);
      if (longEdge < options.pipeline.minimumMaster.longEdge || shortEdge < options.pipeline.minimumMaster.shortEdge) {
        issues.push({
          code: "master-too-small",
          message: `Master dimensions must be at least ${options.pipeline.minimumMaster.longEdge} px on the long edge and ${options.pipeline.minimumMaster.shortEdge} px on the short edge.`,
        });
      }
    }

    return {
      recordId,
      format: format || "unknown",
      mimeType,
      bytes: validPositiveInteger(measurement.bytes) ? measurement.bytes : 0,
      width: validPositiveInteger(measurement.width) ? measurement.width : null,
      height: validPositiveInteger(measurement.height) ? measurement.height : null,
      sha256: validSha256(measurement.sha256) ? measurement.sha256 : null,
      status: issues.length ? "blocked" : "ready-for-authoritative-local-inspection",
      issues,
    } as const;
  });
  const generatedAt = now.toISOString();
  const report = {
    reportVersion: 1,
    reportId: CAMPUS_MASTER_PREFLIGHT_REPORT_ID,
    generatedAt,
    status: records.every((record) => record.status === "ready-for-authoritative-local-inspection")
      ? "ready-for-authoritative-local-inspection"
      : "blocked",
    pipeline: {
      schemaVersion: options.pipeline.schemaVersion,
      pipelineId: options.pipeline.pipelineId,
      allowedInputFormats: [...allowedFormats],
      minimumMaster: { ...options.pipeline.minimumMaster },
    },
    records,
    guardrails: {
      browserPreflightOnly: true,
      networkRequestPerformed: false,
      serverPersistencePerformed: false,
      browserStoragePerformed: false,
      masterModified: false,
      metadataInspected: false,
      colourSpaceVerified: false,
      approvalGranted: false,
      publicWritePerformed: false,
    },
  } as const;

  return {
    filename: `sskem-campus-master-preflight-${generatedAt.slice(0, 10)}.json`,
    body: `${JSON.stringify(report, null, 2)}\n`,
    report,
  } as const;
}
