import waveData from "@/content/legacy-migration-wave-13.json";
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
import { legacyMigrationWave12 } from "@/app/data/legacy-migration-wave-12";
import { parseLegacyMigrationWaveManifest } from "@/lib/legacy-migration-wave-manifest";

export const legacyMigrationWave13 = createLegacyMigrationWave({
  manifest: parseLegacyMigrationWaveManifest(waveData),
  allowedAreas: ["taxonomy"],
  allowedSourceKinds: ["category", "post_format"],
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
    legacyMigrationWave12,
  ],
  requireRouteDecisions: true,
  requiredReviews: [
    "accuracy",
    "currency",
    "editorial",
    "management-approval",
  ],
});

export const legacyMigrationWave13Manifest = legacyMigrationWave13.manifest;
export const legacyMigrationWave13Records = legacyMigrationWave13.records;
export const legacyMigrationWave13PrerequisiteRecordIds = legacyMigrationWave13.prerequisiteRecordIds;
export const legacyMigrationWave13Summary = legacyMigrationWave13.summary;
export const legacyMigrationWave13WorksheetCsv = legacyMigrationWave13.worksheetCsv;
