export type LegacyMigrationWaveManifest = {
  $schema: "./legacy-migration-wave.schema.json";
  schemaVersion: 1;
  waveId: string;
  label: string;
  matrixId: string;
  matrixBuiltOn: string;
  prerequisiteWaveIds: string[];
  recordIds: string[];
  policy: {
    sourceContentIncluded: false;
    decisionsPreselected: false;
    repositoryWritePerformed: false;
    publicationAuthorized: false;
  };
};

const waveIdPattern = /^legacy-[a-z0-9-]+-wave-[1-9][0-9]*$/;
const recordIdPattern = /^migration-[a-f0-9]{16}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function waveNumber(value: string) {
  const match = /-wave-([1-9][0-9]*)$/.exec(value);
  return match ? Number(match[1]) : null;
}

export function hasCumulativeLegacyMigrationWavePrerequisites(
  waveId: unknown,
  prerequisiteWaveIds: unknown,
) {
  if (typeof waveId !== "string" || !waveIdPattern.test(waveId)
    || !Array.isArray(prerequisiteWaveIds)
    || !prerequisiteWaveIds.every((value) => typeof value === "string" && waveIdPattern.test(value))) {
    return false;
  }
  const currentWaveNumber = waveNumber(waveId);
  return currentWaveNumber !== null
    && prerequisiteWaveIds.length === currentWaveNumber - 1
    && prerequisiteWaveIds.every((value, index) => waveNumber(value) === index + 1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function hasClosedPolicy(value: unknown, keys: readonly string[]) {
  return isRecord(value)
    && hasExactKeys(value, keys)
    && keys.every((key) => value[key] === false);
}

function isCanonicalDate(value: string) {
  if (!datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function parseLegacyMigrationWaveManifest(value: unknown): LegacyMigrationWaveManifest {
  const manifestKeys = [
    "$schema",
    "schemaVersion",
    "waveId",
    "label",
    "matrixId",
    "matrixBuiltOn",
    "prerequisiteWaveIds",
    "recordIds",
    "policy",
  ] as const;
  const policyKeys = [
    "sourceContentIncluded",
    "decisionsPreselected",
    "repositoryWritePerformed",
    "publicationAuthorized",
  ] as const;
  if (!isRecord(value) || !hasExactKeys(value, manifestKeys)
    || value.$schema !== "./legacy-migration-wave.schema.json"
    || value.schemaVersion !== 1
    || typeof value.waveId !== "string" || !waveIdPattern.test(value.waveId)
    || typeof value.label !== "string" || value.label.length < 1 || value.label.length > 80
    || typeof value.matrixId !== "string"
    || typeof value.matrixBuiltOn !== "string" || !isCanonicalDate(value.matrixBuiltOn)
    || !Array.isArray(value.prerequisiteWaveIds) || value.prerequisiteWaveIds.length > 20
    || !value.prerequisiteWaveIds.every((waveId) => typeof waveId === "string" && waveIdPattern.test(waveId))
    || new Set(value.prerequisiteWaveIds).size !== value.prerequisiteWaveIds.length
    || value.prerequisiteWaveIds.includes(value.waveId)
    || !hasCumulativeLegacyMigrationWavePrerequisites(value.waveId, value.prerequisiteWaveIds)
    || !Array.isArray(value.recordIds) || value.recordIds.length < 1 || value.recordIds.length > 12
    || !value.recordIds.every((recordId) => typeof recordId === "string" && recordIdPattern.test(recordId))
    || new Set(value.recordIds).size !== value.recordIds.length
    || !hasClosedPolicy(value.policy, policyKeys)) {
    throw new Error("Legacy migration wave manifest failed its closed schema contract.");
  }
  return value as LegacyMigrationWaveManifest;
}
