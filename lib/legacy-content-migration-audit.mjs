import { readFile } from "node:fs/promises";

import {
  legacyContentMigrationSummary,
  validateLegacyContentMigrationMatrix,
} from "./legacy-content-migration.ts";

export const legacyContentMigrationMatrixUrl = new URL("../content/legacy-content-migration-matrix.json", import.meta.url);

export async function loadLegacyContentMigrationMatrix() {
  return JSON.parse(await readFile(legacyContentMigrationMatrixUrl, "utf8"));
}

export async function auditLegacyContentMigrationMatrix() {
  const matrix = await loadLegacyContentMigrationMatrix();
  const issues = validateLegacyContentMigrationMatrix(matrix);
  const summary = legacyContentMigrationSummary(matrix);
  return { matrix, issues, summary };
}
