import waveData from "@/content/legacy-migration-wave-3.json";
import {
  createLegacyMigrationWave,
} from "@/app/data/legacy-migration-wave";
import { legacyMigrationWave1 } from "@/app/data/legacy-migration-wave-1";
import { legacyMigrationWave2 } from "@/app/data/legacy-migration-wave-2";
import { parseLegacyMigrationWaveManifest } from "@/lib/legacy-migration-wave-manifest";

export const legacyMigrationWave3 = createLegacyMigrationWave({
  manifest: parseLegacyMigrationWaveManifest(waveData),
  allowedAreas: ["academics", "admissions", "disclosure"],
  allowedSourceKinds: ["page"],
  allowedSourceStatuses: ["publish"],
  prerequisiteWaves: [legacyMigrationWave1, legacyMigrationWave2],
  requireMappedRoutes: true,
});

export const legacyMigrationWave3Manifest = legacyMigrationWave3.manifest;
export const legacyMigrationWave3Records = legacyMigrationWave3.records;
export const legacyMigrationWave3PrerequisiteRecordIds = legacyMigrationWave3.prerequisiteRecordIds;
export const legacyMigrationWave3Summary = legacyMigrationWave3.summary;
export const legacyMigrationWave3WorksheetCsv = legacyMigrationWave3.worksheetCsv;
