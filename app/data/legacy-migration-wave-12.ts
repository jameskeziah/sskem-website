import waveData from "@/content/legacy-migration-wave-12.json";
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
import { legacyMigrationWave10 } from "@/app/data/legacy-migration-wave-10";
import { legacyMigrationWave11 } from "@/app/data/legacy-migration-wave-11";
import { parseLegacyMigrationWaveManifest } from "@/lib/legacy-migration-wave-manifest";

export const legacyMigrationWave12 = createLegacyMigrationWave({
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
    legacyMigrationWave10,
    legacyMigrationWave11,
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
    "data-protection",
  ],
});

export const legacyMigrationWave12Manifest = legacyMigrationWave12.manifest;
export const legacyMigrationWave12Records = legacyMigrationWave12.records;
export const legacyMigrationWave12PrerequisiteRecordIds = legacyMigrationWave12.prerequisiteRecordIds;
export const legacyMigrationWave12Summary = legacyMigrationWave12.summary;
export const legacyMigrationWave12WorksheetCsv = legacyMigrationWave12.worksheetCsv;
