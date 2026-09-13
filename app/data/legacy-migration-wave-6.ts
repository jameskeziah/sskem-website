import waveData from "@/content/legacy-migration-wave-6.json";
import {
  createLegacyMigrationWave,
} from "@/app/data/legacy-migration-wave";
import { legacyMigrationWave1 } from "@/app/data/legacy-migration-wave-1";
import { legacyMigrationWave2 } from "@/app/data/legacy-migration-wave-2";
import { legacyMigrationWave3 } from "@/app/data/legacy-migration-wave-3";
import { legacyMigrationWave4 } from "@/app/data/legacy-migration-wave-4";
import { legacyMigrationWave5 } from "@/app/data/legacy-migration-wave-5";
import { parseLegacyMigrationWaveManifest } from "@/lib/legacy-migration-wave-manifest";

export const legacyMigrationWave6 = createLegacyMigrationWave({
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

export const legacyMigrationWave6Manifest = legacyMigrationWave6.manifest;
export const legacyMigrationWave6Records = legacyMigrationWave6.records;
export const legacyMigrationWave6PrerequisiteRecordIds = legacyMigrationWave6.prerequisiteRecordIds;
export const legacyMigrationWave6Summary = legacyMigrationWave6.summary;
export const legacyMigrationWave6WorksheetCsv = legacyMigrationWave6.worksheetCsv;
