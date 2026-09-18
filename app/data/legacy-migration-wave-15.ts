import waveData from "@/content/legacy-migration-wave-15.json";
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
import { legacyMigrationWave13 } from "@/app/data/legacy-migration-wave-13";
import { legacyMigrationWave14 } from "@/app/data/legacy-migration-wave-14";
import { parseLegacyMigrationWaveManifest } from "@/lib/legacy-migration-wave-manifest";

export const legacyMigrationWave15 = createLegacyMigrationWave({
  manifest: parseLegacyMigrationWaveManifest(waveData),
  allowedAreas: ["news"],
  allowedSourceKinds: ["post"],
  allowedSourceStatuses: ["publish"],
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
    legacyMigrationWave13,
    legacyMigrationWave14,
  ],
  requireRouteDecisions: true,
  requiredReviews: [
    "accuracy",
    "currency",
    "editorial",
    "management-approval",
  ],
});

export const legacyMigrationWave15Manifest = legacyMigrationWave15.manifest;
export const legacyMigrationWave15Records = legacyMigrationWave15.records;
export const legacyMigrationWave15PrerequisiteRecordIds = legacyMigrationWave15.prerequisiteRecordIds;
export const legacyMigrationWave15Summary = legacyMigrationWave15.summary;
export const legacyMigrationWave15WorksheetCsv = legacyMigrationWave15.worksheetCsv;
