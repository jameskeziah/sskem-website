import matrixData from "@/content/legacy-content-migration-matrix.json";
import {
  legacyContentMigrationCsv,
  legacyContentMigrationSummary,
  validateLegacyContentMigrationMatrix,
  type LegacyContentMigrationMatrix,
  type LegacyContentMigrationRecord,
  type MigrationArea,
  type MigrationSourceKind,
} from "@/lib/legacy-content-migration";

export const legacyContentMigrationMatrix = matrixData as unknown as LegacyContentMigrationMatrix;
const matrixIssues = validateLegacyContentMigrationMatrix(legacyContentMigrationMatrix);
if (matrixIssues.length) {
  throw new Error(`Legacy content migration matrix is invalid: ${matrixIssues[0].path} ${matrixIssues[0].message}`);
}

export const legacyContentMigrationDashboard = legacyContentMigrationSummary(legacyContentMigrationMatrix);

export type LegacyContentMigrationFilters = {
  query?: string;
  kind?: MigrationSourceKind | "";
  area?: MigrationArea | "";
  visibility?: "public" | "private-review" | "";
  route?: "implemented" | "decision-required" | "";
};

export function filterLegacyContentMigrationRecords(filters: LegacyContentMigrationFilters): LegacyContentMigrationRecord[] {
  const query = filters.query?.trim().toLocaleLowerCase("en") ?? "";
  return legacyContentMigrationMatrix.records.filter((record) => {
    if (filters.kind && record.sourceKind !== filters.kind) return false;
    if (filters.area && record.area !== filters.area) return false;
    if (filters.visibility && record.sourceVisibility !== filters.visibility) return false;
    if (filters.route && record.routeContinuity.status !== filters.route) return false;
    if (!query) return true;
    return [record.label, record.sourceRef, record.legacyPath, record.routeContinuity.targetPath]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase("en").includes(query));
  });
}

export async function legacyContentMigrationWorksheetCsv() {
  return legacyContentMigrationCsv(legacyContentMigrationMatrix);
}
