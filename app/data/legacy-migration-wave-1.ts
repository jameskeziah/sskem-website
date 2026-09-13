import waveData from "@/content/legacy-migration-wave-1.json";
import {
  createLegacyMigrationWave,
} from "@/app/data/legacy-migration-wave";
import { parseLegacyMigrationWaveManifest } from "@/lib/legacy-migration-wave-manifest";

export const legacyMigrationWave1 = createLegacyMigrationWave({
  manifest: parseLegacyMigrationWaveManifest(waveData),
  allowedAreas: ["home", "about", "academics", "admissions", "facilities", "contact", "other"],
  allowedSourceKinds: ["page"],
  allowedSourceStatuses: ["publish"],
});

export const legacyMigrationWave1Manifest = legacyMigrationWave1.manifest;
export const legacyMigrationWave1Records = legacyMigrationWave1.records;
export const legacyMigrationWave1Summary = legacyMigrationWave1.summary;
export const legacyMigrationWave1WorksheetCsv = legacyMigrationWave1.worksheetCsv;
