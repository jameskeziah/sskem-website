import waveData from "@/content/legacy-migration-wave-8.json";
import {
  createLegacyMigrationWave,
} from "@/app/data/legacy-migration-wave";
import { legacyMigrationWave1 } from "@/app/data/legacy-migration-wave-1";
import { legacyMigrationWave2 } from "@/app/data/legacy-migration-wave-2";
import { legacyMigrationWave3 } from "@/app/data/legacy-migration-wave-3";
import { legacyMigrationWave4 } from "@/app/data/legacy-migration-wave-4";
import { legacyMigrationWave5 } from "@/app/data/legacy-migration-wave-5";
import { legacyMigrationWave6 } from "@/app/data/legacy-migration-wave-6";
import { legacyMigrationWave7 } from "@/app/data/legacy-migration-wave-7";
import { parseLegacyMigrationWaveManifest } from "@/lib/legacy-migration-wave-manifest";

export const legacyMigrationWave8 = createLegacyMigrationWave({
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
    legacyMigrationWave7,
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

export const legacyMigrationWave8Manifest = legacyMigrationWave8.manifest;
export const legacyMigrationWave8Records = legacyMigrationWave8.records;
export const legacyMigrationWave8PrerequisiteRecordIds = legacyMigrationWave8.prerequisiteRecordIds;
export const legacyMigrationWave8Summary = legacyMigrationWave8.summary;
export const legacyMigrationWave8WorksheetCsv = legacyMigrationWave8.worksheetCsv;
