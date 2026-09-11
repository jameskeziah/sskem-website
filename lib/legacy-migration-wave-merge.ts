import {
  LEGACY_MIGRATION_DECISION_MAX_BYTES,
  createLegacyMigrationDecisionPlan,
  parseLegacyMigrationDecisionCsv,
  type LegacyMigrationDecisionIssue,
} from "./legacy-migration-decision-intake.ts";
import {
  fingerprintLegacyMigrationValue,
  legacyMigrationDecisionWorksheetHeaders,
  validateLegacyContentMigrationMatrix,
  type LegacyContentMigrationMatrix,
} from "./legacy-content-migration.ts";

export const legacyMigrationWaveMergeIssueCodes = [
  "canonical-matrix-invalid",
  "worksheet-empty",
  "worksheet-too-large",
  "csv-malformed",
  "header-contract-mismatch",
  "wave-row-count-mismatch",
  "master-row-count-mismatch",
  "column-count-mismatch",
  "wave-record-invalid",
  "wave-record-duplicate",
  "wave-record-missing",
  "wave-decision-conflict",
  "master-record-invalid",
  "master-record-duplicate",
  "master-record-missing",
  "prerequisite-record-invalid",
  "prerequisite-decision-missing",
  "wave-binding-stale",
  "decision-contract-blocked",
] as const;

export type LegacyMigrationWaveMergeIssueCode = (typeof legacyMigrationWaveMergeIssueCodes)[number];

export type LegacyMigrationWaveMergeIssue = {
  code: LegacyMigrationWaveMergeIssueCode | LegacyMigrationDecisionIssue["code"];
  source: "wave" | "master" | "decision-contract";
  row: number | null;
  column: string | null;
  message: string;
};

export type LegacyMigrationWaveMergePlan = {
  planId: string | null;
  status: "blocked" | "ready-for-download";
  generatedOn: string;
  mergedCsv: string | null;
  summary: {
    expectedWaveRecords: number;
    acceptedWaveRecords: number;
    prerequisiteRecordsRequired: number;
    prerequisiteRecordsPresent: number;
    masterRecords: number;
    carriedContentDecisions: number;
    remainingContentDecisions: number;
    remainingRouteDecisions: number;
    issueCount: number;
  };
  issues: LegacyMigrationWaveMergeIssue[];
  guardrails: {
    sourceContentIncluded: false;
    privateSourcePathsIncluded: false;
    repositoryWritePerformed: false;
    networkRequestPerformed: false;
    serverPersistencePerformed: false;
    approvalGranted: false;
    publicationAuthorized: false;
    implementationStatusChanged: false;
    cmsWritePerformed: false;
    navigationActivated: false;
    deploymentPerformed: false;
  };
};

const proposedColumnStart = legacyMigrationDecisionWorksheetHeaders.indexOf("proposed_route_action");
const recordIdColumn = legacyMigrationDecisionWorksheetHeaders.indexOf("record_id");
const currentRouteStatusColumn = legacyMigrationDecisionWorksheetHeaders.indexOf("current_route_status");
const currentContentDecisionColumn = legacyMigrationDecisionWorksheetHeaders.indexOf("current_content_decision");
const proposedContentDecisionColumn = legacyMigrationDecisionWorksheetHeaders.indexOf("proposed_content_decision");

function issueMessage(code: LegacyMigrationWaveMergeIssueCode, context: {
  waveName: string;
  expectedWaveRecords: number;
  expectedMasterRecords: number;
  prerequisiteRecordsRequired: number;
}) {
  const messages: Record<LegacyMigrationWaveMergeIssueCode, string> = {
    "canonical-matrix-invalid": "The canonical migration matrix failed its integrity checks.",
    "worksheet-empty": `Choose both the completed ${context.waveName} worksheet and a current full master worksheet.`,
    "worksheet-too-large": "A selected worksheet exceeds the one-megabyte intake limit.",
    "csv-malformed": "A selected worksheet contains malformed CSV quoting or rows.",
    "header-contract-mismatch": "Both files must use the exact current migration decision columns.",
    "wave-row-count-mismatch": `The ${context.waveName} worksheet must contain exactly ${context.expectedWaveRecords} current wave records.`,
    "master-row-count-mismatch": `The master worksheet must contain exactly all ${context.expectedMasterRecords} migration records.`,
    "column-count-mismatch": "A worksheet row does not contain the exact decision-contract columns.",
    "wave-record-invalid": `The ${context.waveName} worksheet contains a record outside the current wave.`,
    "wave-record-duplicate": `A ${context.waveName} record appears more than once.`,
    "wave-record-missing": `At least one current ${context.waveName} record is missing.`,
    "wave-decision-conflict": context.prerequisiteRecordsRequired > 0
      ? `The master already contains a different ${context.waveName} decision; start again from the combined master that contains every prerequisite wave.`
      : `The master already contains a different ${context.waveName} decision; start again from a fresh canonical master.`,
    "master-record-invalid": "The master worksheet contains an unknown migration record.",
    "master-record-duplicate": "A master migration record appears more than once.",
    "master-record-missing": "At least one canonical migration record is missing from the master worksheet.",
    "prerequisite-record-invalid": `A prerequisite for ${context.waveName} is unknown, duplicated or overlaps the current wave.`,
    "prerequisite-decision-missing": `Complete and merge every prerequisite wave before ${context.waveName}.`,
    "wave-binding-stale": `A ${context.waveName} binding or current-state field differs from the selected master worksheet.`,
    "decision-contract-blocked": "The merged worksheet failed the canonical migration decision contract.",
  };
  return messages[code];
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function serializeLegacyMigrationDecisionCsv(rows: readonly (readonly string[])[]) {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

function headerMatches(header: readonly string[]) {
  return header.length === legacyMigrationDecisionWorksheetHeaders.length
    && header.every((value, index) => value === legacyMigrationDecisionWorksheetHeaders[index]);
}

function safeNow(value?: string) {
  const now = value ?? new Date().toISOString();
  const parsed = new Date(now);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== now) {
    throw new Error("Legacy migration wave merge requires a canonical UTC timestamp.");
  }
  return now;
}

export async function createLegacyMigrationWaveMergePlan(options: {
  waveCsv: string;
  masterCsv: string;
  matrix: LegacyContentMigrationMatrix;
  waveId: string;
  waveName: string;
  waveRecordIds: readonly string[];
  prerequisiteRecordIds?: readonly string[];
  now?: string;
}): Promise<LegacyMigrationWaveMergePlan> {
  const {
    waveCsv,
    masterCsv,
    matrix,
    waveId,
    waveName,
    waveRecordIds,
    prerequisiteRecordIds = [],
  } = options;
  const generatedOn = safeNow(options.now);
  const context = {
    waveName,
    expectedWaveRecords: waveRecordIds.length,
    expectedMasterRecords: matrix.records.length,
    prerequisiteRecordsRequired: prerequisiteRecordIds.length,
  };
  const issues: LegacyMigrationWaveMergeIssue[] = [];
  const add = (
    code: LegacyMigrationWaveMergeIssueCode,
    source: "wave" | "master",
    row: number | null = null,
    column: string | null = null,
  ) => issues.push({ code, source, row, column, message: issueMessage(code, context) });

  if (validateLegacyContentMigrationMatrix(matrix).length > 0) add("canonical-matrix-invalid", "master");
  for (const [source, csv] of [["wave", waveCsv], ["master", masterCsv]] as const) {
    const bytes = new TextEncoder().encode(csv).byteLength;
    if (bytes === 0) add("worksheet-empty", source);
    if (bytes > LEGACY_MIGRATION_DECISION_MAX_BYTES) add("worksheet-too-large", source);
  }

  const waveParsed = parseLegacyMigrationDecisionCsv(waveCsv);
  const masterParsed = parseLegacyMigrationDecisionCsv(masterCsv);
  if (waveParsed.error) add("csv-malformed", "wave");
  if (masterParsed.error) add("csv-malformed", "master");
  const [waveHeader = [], ...waveRows] = waveParsed.rows;
  const [masterHeader = [], ...masterRows] = masterParsed.rows;
  if (!headerMatches(waveHeader)) add("header-contract-mismatch", "wave", 1);
  if (!headerMatches(masterHeader)) add("header-contract-mismatch", "master", 1);
  if (waveRows.length !== waveRecordIds.length) add("wave-row-count-mismatch", "wave");
  if (masterRows.length !== matrix.records.length) add("master-row-count-mismatch", "master");

  const canonicalIds = new Set(matrix.records.map((record) => record.id));
  const waveIds = new Set(waveRecordIds);
  const prerequisiteIds = new Set(prerequisiteRecordIds);
  if (waveIds.size !== waveRecordIds.length || waveRecordIds.some((recordId) => !canonicalIds.has(recordId))) {
    add("wave-record-invalid", "wave", null, "record_id");
  }
  if (prerequisiteIds.size !== prerequisiteRecordIds.length
    || prerequisiteRecordIds.some((recordId) => !canonicalIds.has(recordId) || waveIds.has(recordId))) {
    add("prerequisite-record-invalid", "master", null, "record_id");
  }
  const masterById = new Map<string, { row: string[]; rowNumber: number }>();
  const waveById = new Map<string, { row: string[]; rowNumber: number }>();

  for (const [index, row] of masterRows.entries()) {
    const rowNumber = index + 2;
    if (row.length !== legacyMigrationDecisionWorksheetHeaders.length) {
      add("column-count-mismatch", "master", rowNumber);
      continue;
    }
    const recordId = row[recordIdColumn];
    if (!canonicalIds.has(recordId)) add("master-record-invalid", "master", rowNumber, "record_id");
    if (masterById.has(recordId)) add("master-record-duplicate", "master", rowNumber, "record_id");
    else masterById.set(recordId, { row, rowNumber });
  }
  for (const recordId of canonicalIds) {
    if (!masterById.has(recordId)) add("master-record-missing", "master", null, "record_id");
  }

  for (const [index, row] of waveRows.entries()) {
    const rowNumber = index + 2;
    if (row.length !== legacyMigrationDecisionWorksheetHeaders.length) {
      add("column-count-mismatch", "wave", rowNumber);
      continue;
    }
    const recordId = row[recordIdColumn];
    if (!waveIds.has(recordId)) add("wave-record-invalid", "wave", rowNumber, "record_id");
    if (waveById.has(recordId)) add("wave-record-duplicate", "wave", rowNumber, "record_id");
    else waveById.set(recordId, { row, rowNumber });
  }
  for (const recordId of waveIds) {
    if (!waveById.has(recordId)) add("wave-record-missing", "wave", null, "record_id");
  }

  for (const recordId of waveIds) {
    const waveEntry = waveById.get(recordId);
    const masterEntry = masterById.get(recordId);
    if (!waveEntry || !masterEntry) continue;
    for (let index = 0; index < proposedColumnStart; index += 1) {
      if (waveEntry.row[index] !== masterEntry.row[index]) {
        add("wave-binding-stale", "wave", waveEntry.rowNumber, legacyMigrationDecisionWorksheetHeaders[index]);
        break;
      }
    }
    for (let index = proposedColumnStart; index < legacyMigrationDecisionWorksheetHeaders.length; index += 1) {
      const existingValue = masterEntry.row[index];
      if (existingValue !== "" && existingValue !== waveEntry.row[index]) {
        add("wave-decision-conflict", "master", masterEntry.rowNumber, legacyMigrationDecisionWorksheetHeaders[index]);
        break;
      }
    }
  }

  let prerequisiteRecordsPresent = 0;
  for (const recordId of prerequisiteIds) {
    const masterEntry = masterById.get(recordId);
    if (!masterEntry) continue;
    const contentReady = masterEntry.row[currentContentDecisionColumn] !== "unselected"
      || masterEntry.row[proposedContentDecisionColumn] !== "";
    const routeReady = masterEntry.row[currentRouteStatusColumn] !== "decision-required"
      || masterEntry.row[proposedColumnStart] !== "";
    if (contentReady && routeReady) prerequisiteRecordsPresent += 1;
    else add("prerequisite-decision-missing", "master", masterEntry.rowNumber, contentReady ? "proposed_route_action" : "proposed_content_decision");
  }

  let mergedCsv: string | null = null;
  let acceptedWaveRecords = 0;
  let carriedContentDecisions = 0;
  let remainingContentDecisions = matrix.records.length;
  let remainingRouteDecisions = matrix.records.filter((record) => record.routeContinuity.status === "decision-required").length;

  if (issues.length === 0) {
    const mergedRows = masterRows.map((row) => [...row]);
    const mergedRowById = new Map(mergedRows.map((row, index) => [row[recordIdColumn], { row, index }]));
    for (const recordId of waveRecordIds) {
      const sourceRow = waveById.get(recordId)!.row;
      const targetRow = mergedRowById.get(recordId)!.row;
      for (let index = proposedColumnStart; index < legacyMigrationDecisionWorksheetHeaders.length; index += 1) {
        targetRow[index] = sourceRow[index];
      }
    }

    const candidateCsv = serializeLegacyMigrationDecisionCsv([legacyMigrationDecisionWorksheetHeaders, ...mergedRows]);
    const canonicalPlan = await createLegacyMigrationDecisionPlan({ csv: candidateCsv, matrix, now: generatedOn });
    const expectedIncomplete = new Set(["content-decision-missing", "route-decision-missing"]);
    const blockingContractIssues = canonicalPlan.issues.filter((issue) => {
      if (!issue.row || !expectedIncomplete.has(issue.code)) return true;
      const row = mergedRows[issue.row - 2];
      const recordId = row?.[recordIdColumn];
      if (waveIds.has(recordId) || prerequisiteIds.has(recordId)) return true;
      const proposedValue = issue.code === "content-decision-missing"
        ? row?.[proposedContentDecisionColumn]
        : row?.[proposedColumnStart];
      return proposedValue !== "";
    });
    for (const issue of blockingContractIssues) {
      issues.push({
        code: issue.code,
        source: "decision-contract",
        row: issue.row,
        column: issue.column,
        message: issue.message,
      });
    }

    const waveRowsWithIssues = new Set(
      blockingContractIssues
        .filter((issue) => issue.row)
        .map((issue) => mergedRows[issue.row! - 2]?.[recordIdColumn])
        .filter((recordId): recordId is string => Boolean(recordId) && waveIds.has(recordId)),
    );
    acceptedWaveRecords = waveRecordIds.length - waveRowsWithIssues.size;
    carriedContentDecisions = mergedRows.filter((row) => {
      const current = row[currentContentDecisionColumn];
      const proposed = row[proposedContentDecisionColumn];
      return current !== "unselected" || proposed !== "";
    }).length;
    remainingContentDecisions = matrix.records.length - carriedContentDecisions;
    remainingRouteDecisions = mergedRows.filter((row) => {
      if (row[currentRouteStatusColumn] !== "decision-required") return false;
      return row[proposedColumnStart] === "";
    }).length;

    if (issues.length === 0) mergedCsv = candidateCsv;
  }

  const planCore = mergedCsv ? {
    matrixId: matrix.matrixId,
    matrixBuiltOn: matrix.builtOn,
    waveId,
    waveRecordIds,
    prerequisiteRecordIds,
    mergedWorksheetDigest: await fingerprintLegacyMigrationValue(mergedCsv),
  } : null;
  const planDigest = planCore ? await fingerprintLegacyMigrationValue(planCore) : null;

  return {
    planId: planDigest ? `legacy-wave-merge-${planDigest.slice(0, 24)}` : null,
    status: mergedCsv ? "ready-for-download" : "blocked",
    generatedOn,
    mergedCsv,
    summary: {
      expectedWaveRecords: waveRecordIds.length,
      acceptedWaveRecords,
      prerequisiteRecordsRequired: prerequisiteRecordIds.length,
      prerequisiteRecordsPresent,
      masterRecords: masterRows.length,
      carriedContentDecisions,
      remainingContentDecisions,
      remainingRouteDecisions,
      issueCount: issues.length,
    },
    issues,
    guardrails: {
      sourceContentIncluded: false,
      privateSourcePathsIncluded: false,
      repositoryWritePerformed: false,
      networkRequestPerformed: false,
      serverPersistencePerformed: false,
      approvalGranted: false,
      publicationAuthorized: false,
      implementationStatusChanged: false,
      cmsWritePerformed: false,
      navigationActivated: false,
      deploymentPerformed: false,
    },
  };
}
