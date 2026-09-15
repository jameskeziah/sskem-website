import waveData from "@/content/legacy-migration-wave-7.json";
import {
  createLegacyMigrationWave,
} from "@/app/data/legacy-migration-wave";
import { legacyMigrationWave1 } from "@/app/data/legacy-migration-wave-1";
import { legacyMigrationWave2 } from "@/app/data/legacy-migration-wave-2";
import { legacyMigrationWave3 } from "@/app/data/legacy-migration-wave-3";
import { legacyMigrationWave4 } from "@/app/data/legacy-migration-wave-4";
import { legacyMigrationWave5 } from "@/app/data/legacy-migration-wave-5";
import { legacyMigrationWave6 } from "@/app/data/legacy-migration-wave-6";
import { parseLegacyMigrationWaveManifest } from "@/lib/legacy-migration-wave-manifest";

export const legacyMigrationWave7 = createLegacyMigrationWave({
  manifest: parseLegacyMigrationWaveManifest(waveData),
  allowedAreas: ["media"],
  allowedSourceKinds: ["sk_igallery"],
  allowedSourceStatuses: ["public-index"],
  prerequisiteWaves: [
    legacyMigrationWave1,
    legacyMigrationWave2,
    legacyMigrationWave3,
    legacyMigrationWave4,
    legacyMigrationWave5,
    legacyMigrationWave6,
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

export const legacyMigrationWave7Manifest = legacyMigrationWave7.manifest;
export const legacyMigrationWave7Records = legacyMigrationWave7.records;
export const legacyMigrationWave7PrerequisiteRecordIds = legacyMigrationWave7.prerequisiteRecordIds;
export const legacyMigrationWave7Summary = legacyMigrationWave7.summary;
export const legacyMigrationWave7WorksheetCsv = legacyMigrationWave7.worksheetCsv;
