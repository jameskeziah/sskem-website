import {
  legacyContentMigrationMatrix,
} from "@/app/data/legacy-content-migration";
import {
  legacyContentMigrationWaveCsv,
  type LegacyContentMigrationRecord,
  type MigrationArea,
} from "@/lib/legacy-content-migration";
import {
  hasCumulativeLegacyMigrationWavePrerequisites,
  type LegacyMigrationWaveManifest,
} from "@/lib/legacy-migration-wave-manifest";

export type { LegacyMigrationWaveManifest } from "@/lib/legacy-migration-wave-manifest";

export type LegacyMigrationWaveSummary = {
  total: number;
  routeMapped: number;
  routeDecisionRequired: number;
  contentDecided: number;
  implementationVerified: number;
  prerequisiteRecords: number;
};

export type LegacyMigrationWave = {
  manifest: LegacyMigrationWaveManifest;
  records: LegacyContentMigrationRecord[];
  prerequisiteRecordIds: string[];
  summary: LegacyMigrationWaveSummary;
  worksheetCsv: () => Promise<string>;
};

const recordsById = new Map(legacyContentMigrationMatrix.records.map((record) => [record.id, record]));
function assertManifestContract(manifest: LegacyMigrationWaveManifest) {
  if (manifest.$schema !== "./legacy-migration-wave.schema.json" || manifest.schemaVersion !== 1) {
    throw new Error(`Legacy migration wave ${manifest.waveId} uses an unsupported manifest contract.`);
  }
  if (manifest.matrixId !== legacyContentMigrationMatrix.matrixId
    || manifest.matrixBuiltOn !== legacyContentMigrationMatrix.builtOn) {
    throw new Error(`Legacy migration wave ${manifest.waveId} is stale against the canonical matrix.`);
  }
  if (manifest.recordIds.length < 1 || manifest.recordIds.length > 12
    || new Set(manifest.recordIds).size !== manifest.recordIds.length) {
    throw new Error(`Legacy migration wave ${manifest.waveId} must contain 1-12 unique records.`);
  }
  if (new Set(manifest.prerequisiteWaveIds).size !== manifest.prerequisiteWaveIds.length
    || manifest.prerequisiteWaveIds.includes(manifest.waveId)
    || !hasCumulativeLegacyMigrationWavePrerequisites(manifest.waveId, manifest.prerequisiteWaveIds)) {
    throw new Error(`Legacy migration wave ${manifest.waveId} has an invalid prerequisite set.`);
  }
  if (Object.values(manifest.policy).some((value) => value !== false)) {
    throw new Error(`Legacy migration wave ${manifest.waveId} must remain read-only and fail closed.`);
  }
}

export function createLegacyMigrationWave(options: {
  manifest: LegacyMigrationWaveManifest;
  allowedAreas: readonly MigrationArea[];
  prerequisiteWaves?: readonly LegacyMigrationWave[];
  requireMappedRoutes?: boolean;
}): LegacyMigrationWave {
  const { manifest, allowedAreas, prerequisiteWaves = [], requireMappedRoutes = false } = options;
  assertManifestContract(manifest);

  const suppliedPrerequisiteIds = prerequisiteWaves.map((wave) => wave.manifest.waveId);
  if (suppliedPrerequisiteIds.length !== manifest.prerequisiteWaveIds.length
    || suppliedPrerequisiteIds.some((waveId, index) => waveId !== manifest.prerequisiteWaveIds[index])) {
    throw new Error(`Legacy migration wave ${manifest.waveId} prerequisite bindings are incomplete or out of order.`);
  }

  const allowedAreaSet = new Set(allowedAreas);
  const prerequisiteRecordIds = prerequisiteWaves.flatMap((wave) => wave.manifest.recordIds);
  const prerequisiteRecordSet = new Set(prerequisiteRecordIds);
  if (prerequisiteRecordSet.size !== prerequisiteRecordIds.length) {
    throw new Error(`Legacy migration wave ${manifest.waveId} prerequisites overlap.`);
  }

  const records = manifest.recordIds.map((recordId) => {
    const record = recordsById.get(recordId);
    if (!record) throw new Error(`Legacy migration wave ${manifest.waveId} contains an unknown record: ${recordId}`);
    if (prerequisiteRecordSet.has(recordId)) {
      throw new Error(`Legacy migration wave ${manifest.waveId} repeats a prerequisite record: ${recordId}`);
    }
    if (record.sourceVisibility !== "public"
      || record.sourceKind !== "page"
      || record.identityProtected
      || !allowedAreaSet.has(record.area)) {
      throw new Error(`Legacy migration wave ${manifest.waveId} contains an ineligible source: ${recordId}`);
    }
    if (requireMappedRoutes && record.routeContinuity.status !== "implemented") {
      throw new Error(`Legacy migration wave ${manifest.waveId} requires a mapped route: ${recordId}`);
    }
    if (record.contentDecision.decision !== "unselected" || record.implementationStatus !== "not-started") {
      throw new Error(`Legacy migration wave ${manifest.waveId} must be refreshed after a decision or implementation change: ${recordId}`);
    }
    return record;
  });

  const summary: LegacyMigrationWaveSummary = {
    total: records.length,
    routeMapped: records.filter((record) => record.routeContinuity.status === "implemented").length,
    routeDecisionRequired: records.filter((record) => record.routeContinuity.status === "decision-required").length,
    contentDecided: records.filter((record) => record.contentDecision.decision !== "unselected").length,
    implementationVerified: records.filter((record) => record.implementationStatus === "verified").length,
    prerequisiteRecords: prerequisiteRecordIds.length,
  };

  return {
    manifest,
    records,
    prerequisiteRecordIds,
    summary,
    worksheetCsv: () => legacyContentMigrationWaveCsv(legacyContentMigrationMatrix, manifest.recordIds),
  };
}
