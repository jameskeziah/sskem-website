import waveData from "@/content/legacy-migration-wave-10.json";
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
import { legacyMigrationWave8 } from "@/app/data/legacy-migration-wave-8";
import { legacyMigrationWave9 } from "@/app/data/legacy-migration-wave-9";
import { parseLegacyMigrationWaveManifest } from "@/lib/legacy-migration-wave-manifest";

export const legacyMigrationWave10 = createLegacyMigrationWave({
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
    legacyMigrationWave8,
    legacyMigrationWave9,
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
    "evidence",
  ],
});

export const legacyMigrationWave10Manifest = legacyMigrationWave10.manifest;
export const legacyMigrationWave10Records = legacyMigrationWave10.records;
export const legacyMigrationWave10PrerequisiteRecordIds = legacyMigrationWave10.prerequisiteRecordIds;
export const legacyMigrationWave10Summary = legacyMigrationWave10.summary;
export const legacyMigrationWave10WorksheetCsv = legacyMigrationWave10.worksheetCsv;
