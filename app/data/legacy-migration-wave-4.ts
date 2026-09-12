import waveData from "@/content/legacy-migration-wave-4.json";
import {
  createLegacyMigrationWave,
} from "@/app/data/legacy-migration-wave";
import { legacyMigrationWave1 } from "@/app/data/legacy-migration-wave-1";
import { legacyMigrationWave2 } from "@/app/data/legacy-migration-wave-2";
import { legacyMigrationWave3 } from "@/app/data/legacy-migration-wave-3";
import { parseLegacyMigrationWaveManifest } from "@/lib/legacy-migration-wave-manifest";

export const legacyMigrationWave4 = createLegacyMigrationWave({
  manifest: parseLegacyMigrationWaveManifest(waveData),
  allowedAreas: ["media"],
  prerequisiteWaves: [legacyMigrationWave1, legacyMigrationWave2, legacyMigrationWave3],
  requireMappedRoutes: true,
  requiredReviews: [
    "accuracy",
    "currency",
    "editorial",
    "management-approval",
    "privacy",
    "rights",
    "retention",
    "accessibility",
  ],
});

export const legacyMigrationWave4Manifest = legacyMigrationWave4.manifest;
export const legacyMigrationWave4Records = legacyMigrationWave4.records;
export const legacyMigrationWave4PrerequisiteRecordIds = legacyMigrationWave4.prerequisiteRecordIds;
export const legacyMigrationWave4Summary = legacyMigrationWave4.summary;
export const legacyMigrationWave4WorksheetCsv = legacyMigrationWave4.worksheetCsv;
