import waveData from "@/content/legacy-migration-wave-5.json";
import {
  createLegacyMigrationWave,
} from "@/app/data/legacy-migration-wave";
import { legacyMigrationWave1 } from "@/app/data/legacy-migration-wave-1";
import { legacyMigrationWave2 } from "@/app/data/legacy-migration-wave-2";
import { legacyMigrationWave3 } from "@/app/data/legacy-migration-wave-3";
import { legacyMigrationWave4 } from "@/app/data/legacy-migration-wave-4";
import { parseLegacyMigrationWaveManifest } from "@/lib/legacy-migration-wave-manifest";

export const legacyMigrationWave5 = createLegacyMigrationWave({
  manifest: parseLegacyMigrationWaveManifest(waveData),
  allowedAreas: ["media"],
  prerequisiteWaves: [
    legacyMigrationWave1,
    legacyMigrationWave2,
    legacyMigrationWave3,
    legacyMigrationWave4,
  ],
  requireRouteDecisions: true,
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

export const legacyMigrationWave5Manifest = legacyMigrationWave5.manifest;
export const legacyMigrationWave5Records = legacyMigrationWave5.records;
export const legacyMigrationWave5PrerequisiteRecordIds = legacyMigrationWave5.prerequisiteRecordIds;
export const legacyMigrationWave5Summary = legacyMigrationWave5.summary;
export const legacyMigrationWave5WorksheetCsv = legacyMigrationWave5.worksheetCsv;
