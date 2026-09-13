import waveData from "@/content/legacy-migration-wave-2.json";
import {
  createLegacyMigrationWave,
} from "@/app/data/legacy-migration-wave";
import { legacyMigrationWave1 } from "@/app/data/legacy-migration-wave-1";
import { parseLegacyMigrationWaveManifest } from "@/lib/legacy-migration-wave-manifest";

export const legacyMigrationWave2 = createLegacyMigrationWave({
  manifest: parseLegacyMigrationWaveManifest(waveData),
  allowedAreas: ["about", "admissions"],
  allowedSourceKinds: ["page"],
  allowedSourceStatuses: ["publish"],
  prerequisiteWaves: [legacyMigrationWave1],
  requireMappedRoutes: true,
});

export const legacyMigrationWave2Manifest = legacyMigrationWave2.manifest;
export const legacyMigrationWave2Records = legacyMigrationWave2.records;
export const legacyMigrationWave2PrerequisiteRecordIds = legacyMigrationWave2.prerequisiteRecordIds;
export const legacyMigrationWave2Summary = legacyMigrationWave2.summary;
export const legacyMigrationWave2WorksheetCsv = legacyMigrationWave2.worksheetCsv;
