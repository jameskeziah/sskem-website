import waveData from "@/content/legacy-migration-wave-1.json";
import {
  legacyContentMigrationMatrix,
} from "@/app/data/legacy-content-migration";
import {
  legacyContentMigrationWaveCsv,
  type LegacyContentMigrationRecord,
} from "@/lib/legacy-content-migration";

type LegacyMigrationWaveManifest = {
  $schema: "./legacy-migration-wave.schema.json";
  schemaVersion: 1;
  waveId: string;
  label: string;
  matrixId: string;
  matrixBuiltOn: string;
  recordIds: string[];
  policy: {
    sourceContentIncluded: false;
    decisionsPreselected: false;
    repositoryWritePerformed: false;
    publicationAuthorized: false;
  };
};

const manifest = waveData as LegacyMigrationWaveManifest;
const allowedAreas = new Set(["home", "about", "academics", "admissions", "facilities", "contact", "other"]);
const recordsById = new Map(legacyContentMigrationMatrix.records.map((record) => [record.id, record]));

function resolveWaveRecords(): LegacyContentMigrationRecord[] {
  if (manifest.$schema !== "./legacy-migration-wave.schema.json" || manifest.schemaVersion !== 1) {
    throw new Error("Legacy migration Wave 1 uses an unsupported manifest contract.");
  }
  if (manifest.matrixId !== legacyContentMigrationMatrix.matrixId
    || manifest.matrixBuiltOn !== legacyContentMigrationMatrix.builtOn) {
    throw new Error("Legacy migration Wave 1 is stale against the canonical matrix.");
  }
  if (manifest.recordIds.length < 1 || manifest.recordIds.length > 12
    || new Set(manifest.recordIds).size !== manifest.recordIds.length) {
    throw new Error("Legacy migration Wave 1 must contain 1-12 unique records.");
  }
  if (Object.values(manifest.policy).some((value) => value !== false)) {
    throw new Error("Legacy migration Wave 1 must remain read-only and fail closed.");
  }

  return manifest.recordIds.map((recordId) => {
    const record = recordsById.get(recordId);
    if (!record) throw new Error(`Legacy migration Wave 1 contains an unknown record: ${recordId}`);
    if (record.sourceVisibility !== "public"
      || record.sourceKind !== "page"
      || record.identityProtected
      || !allowedAreas.has(record.area)) {
      throw new Error(`Legacy migration Wave 1 contains an ineligible source: ${recordId}`);
    }
    if (record.contentDecision.decision !== "unselected" || record.implementationStatus !== "not-started") {
      throw new Error(`Legacy migration Wave 1 must be refreshed after a decision or implementation change: ${recordId}`);
    }
    return record;
  });
}

export const legacyMigrationWave1Manifest = manifest;
export const legacyMigrationWave1Records = resolveWaveRecords();
export const legacyMigrationWave1Summary = {
  total: legacyMigrationWave1Records.length,
  routeMapped: legacyMigrationWave1Records.filter((record) => record.routeContinuity.status === "implemented").length,
  routeDecisionRequired: legacyMigrationWave1Records.filter((record) => record.routeContinuity.status === "decision-required").length,
  contentDecided: legacyMigrationWave1Records.filter((record) => record.contentDecision.decision !== "unselected").length,
  implementationVerified: legacyMigrationWave1Records.filter((record) => record.implementationStatus === "verified").length,
} as const;

export function legacyMigrationWave1WorksheetCsv() {
  return legacyContentMigrationWaveCsv(
    legacyContentMigrationMatrix,
    legacyMigrationWave1Manifest.recordIds,
  );
}
