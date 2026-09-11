import {
  fingerprintLegacyMigrationValue,
  legacyMigrationDecisionContractVersion,
  legacyMigrationDecisionWorksheetHeaders,
  migrationContentDecisions,
  migrationDecisionOwnerRoles,
  migrationRouteActions,
  validMigrationDecisionReason,
  validLegacyMigrationDate,
  validNonReservedLegacyMigrationTargetPath,
  validPublicMigrationPath,
  validateLegacyContentMigrationMatrix,
  type LegacyContentMigrationMatrix,
  type LegacyContentMigrationRecord,
  type MigrationContentDecision,
  type MigrationRouteAction,
} from "./legacy-content-migration.ts";

export const LEGACY_MIGRATION_DECISION_CONTRACT_VERSION = legacyMigrationDecisionContractVersion;
export const LEGACY_MIGRATION_DECISION_MAX_BYTES = 1024 * 1024;
export const LEGACY_MIGRATION_DECISION_ACKNOWLEDGEMENT = "record-controlled-legacy-content-migration-decisions";

export const legacyMigrationDecisionIssueCodes = [
  "canonical-matrix-invalid",
  "worksheet-empty",
  "worksheet-too-large",
  "worksheet-encoding",
  "cell-too-long",
  "csv-malformed",
  "header-contract-mismatch",
  "row-count-mismatch",
  "column-count-mismatch",
  "record-id-invalid",
  "record-id-duplicate",
  "record-id-missing",
  "matrix-binding-stale",
  "record-binding-stale",
  "immutable-field-changed",
  "formula-like-input",
  "route-decision-missing",
  "route-decision-immutable",
  "route-target-invalid",
  "identity-route-unsafe",
  "content-decision-missing",
  "content-decision-immutable",
  "content-target-invalid",
  "merge-target-invalid",
  "merge-cycle",
  "rationale-invalid",
  "private-data-risk",
  "owner-role-invalid",
  "review-date-invalid",
  "no-changes",
] as const;

export type LegacyMigrationDecisionIssueCode = (typeof legacyMigrationDecisionIssueCodes)[number];

export const legacyMigrationDecisionIssueLabels: Record<LegacyMigrationDecisionIssueCode, string> = {
  "canonical-matrix-invalid": "The canonical migration matrix failed its own integrity audit.",
  "worksheet-empty": "Choose a non-empty UTF-8 CSV worksheet.",
  "worksheet-too-large": "The worksheet exceeds the one-megabyte intake limit.",
  "worksheet-encoding": "The worksheet contains unsupported NUL or control characters.",
  "cell-too-long": "A worksheet cell exceeds the bounded decision-contract length.",
  "csv-malformed": "The CSV quoting or row structure is malformed.",
  "header-contract-mismatch": "Use a freshly downloaded decision-contract worksheet with the exact columns and order.",
  "row-count-mismatch": "The worksheet must contain exactly all 115 migration records.",
  "column-count-mismatch": "A worksheet row does not contain the exact decision-contract columns.",
  "record-id-invalid": "A row does not bind to a current opaque migration record ID.",
  "record-id-duplicate": "A migration record ID appears more than once.",
  "record-id-missing": "At least one canonical migration record is absent.",
  "matrix-binding-stale": "The worksheet does not match the current canonical matrix and must be downloaded again.",
  "record-binding-stale": "A record digest or source binding is stale or changed.",
  "immutable-field-changed": "A source, current-state or implementation field was changed; only proposed decision fields are editable.",
  "formula-like-input": "A proposed cell starts like a spreadsheet formula and is rejected.",
  "route-decision-missing": "An unresolved route requires a final proposed treatment.",
  "route-decision-immutable": "An existing route treatment cannot be replaced by this first-decision intake.",
  "route-target-invalid": "The route treatment and internal target are incompatible.",
  "identity-route-unsafe": "An identity-protected source may only be archived, retired or kept private.",
  "content-decision-missing": "Every record requires a final proposed content decision.",
  "content-decision-immutable": "An existing content decision cannot be replaced by this first-decision intake.",
  "content-target-invalid": "The content decision and internal target are incompatible.",
  "merge-target-invalid": "A merge must point to another public, non-identity canonical record.",
  "merge-cycle": "Merge decisions cannot form a cycle.",
  "rationale-invalid": "Use the exact controlled reason code for the selected content decision.",
  "private-data-risk": "A proposed field appears to contain identity, contact, evidence-location or private-source data.",
  "owner-role-invalid": "Use one of the controlled institutional role codes; free-form names are not accepted.",
  "review-date-invalid": "Use a real review date from the archive capture date through today.",
  "no-changes": "The worksheet contains no new route or content decisions to record.",
};

export type LegacyMigrationDecisionIssue = {
  code: LegacyMigrationDecisionIssueCode;
  row: number | null;
  column: string | null;
  message: string;
};

type DecisionState = LegacyContentMigrationRecord["contentDecision"];
type RouteState = LegacyContentMigrationRecord["routeContinuity"];

export type LegacyMigrationDecisionPlanRecord = {
  recordId: string;
  sourceReference: string;
  sourceDigest: string;
  expectedRecordDigest: string;
  expected: {
    routeContinuity: RouteState;
    contentDecision: DecisionState;
    implementationStatus: LegacyContentMigrationRecord["implementationStatus"];
  };
  proposed: {
    routeContinuity: RouteState;
    contentDecision: DecisionState;
  };
  changes: {
    route: boolean;
    content: boolean;
  };
};

export type LegacyMigrationDecisionPlan = {
  $schema: "./legacy-migration-decision-plan.schema.json";
  schemaVersion: 1;
  planId: string | null;
  generatedOn: string;
  status: "blocked" | "ready-for-explicit-atomic-write";
  binding: {
    contractVersion: 2;
    matrixId: string;
    matrixBuiltOn: string;
    matrixDigest: string;
    archiveId: string;
    archiveChecksumSha256: string;
    worksheetDigest: string;
  };
  summary: {
    expectedRecords: number;
    worksheetRows: number;
    acceptedRecords: number;
    changedRecords: number;
    routeChanges: number;
    contentChanges: number;
    issueCount: number;
  };
  issues: LegacyMigrationDecisionIssue[];
  records: LegacyMigrationDecisionPlanRecord[];
  guardrails: {
    sourceContentIncluded: false;
    privateSourcePathsIncluded: false;
    implementationStatusChanged: false;
    approvalGranted: false;
    publicationAuthorized: false;
    repositoryWritePerformed: false;
    networkRequestPerformed: false;
    serverPersistencePerformed: false;
    cmsWritePerformed: false;
    navigationActivated: false;
    deploymentPerformed: false;
    malwareScanPerformed: false;
  };
};

export type LegacyMigrationParsedCsv = { rows: string[][]; error: boolean };

export function parseLegacyMigrationDecisionCsv(input: string): LegacyMigrationParsedCsv {
  const source = input.startsWith("\uFEFF") ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let closedQuote = false;
  let error = false;

  const finishCell = () => {
    row.push(cell);
    cell = "";
    closedQuote = false;
  };
  const finishRow = () => {
    finishCell();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (closedQuote && ![",", "\r", "\n"].includes(character)) {
      error = true;
      cell += character;
      continue;
    }
    if (character === '"') {
      if (cell.length > 0) error = true;
      else quoted = true;
    } else if (character === ",") {
      finishCell();
    } else if (character === "\n") {
      finishRow();
      if (rows.length > 500) return { rows, error: true };
    } else if (character === "\r") {
      if (source[index + 1] === "\n") index += 1;
      finishRow();
      if (rows.length > 500) return { rows, error: true };
    } else {
      cell += character;
    }
  }

  if (quoted) error = true;
  if (cell.length > 0 || row.length > 0) finishRow();
  return { rows, error };
}

function nullable(value: string) {
  return value === "" ? null : value;
}

function exact(value: string | null) {
  return value ?? "";
}

function isFormulaLike(value: string) {
  const effective = value
    .normalize("NFKC")
    .replace(/^[\s\uFEFF\u200B-\u200D\u202A-\u202E\u2060\u2066-\u2069]*/u, "");
  return /^[=+\-@]/.test(effective) || /^'[=+\-@]/.test(effective);
}

function isPublicTarget(value: string | null): value is string {
  return validPublicMigrationPath(value);
}

function normalizedPlanNow(value?: string) {
  const wallClock = new Date();
  if (value === undefined) return wallClock.toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error("Legacy migration decision planning requires a canonical UTC timestamp.");
  }
  if (Math.abs(parsed.getTime() - wallClock.getTime()) > 5 * 60 * 1000) {
    throw new Error("Legacy migration decision planning rejects a timestamp outside the current five-minute validation window.");
  }
  return value;
}

function sameRoute(left: RouteState, right: RouteState) {
  return left.status === right.status
    && left.action === right.action
    && left.targetPath === right.targetPath
    && left.cutoverRecordId === right.cutoverRecordId;
}

function sameDecision(left: DecisionState, right: DecisionState) {
  return left.decision === right.decision
    && left.targetPath === right.targetPath
    && left.mergeIntoRecordId === right.mergeIntoRecordId
    && left.rationale === right.rationale
    && left.ownerRole === right.ownerRole
    && left.reviewedOn === right.reviewedOn;
}

function immutablePairs(record: LegacyContentMigrationRecord, matrix: LegacyContentMigrationMatrix, matrixDigest: string, recordDigest: string): Array<[string, string]> {
  return [
    ["decision_contract_version", String(LEGACY_MIGRATION_DECISION_CONTRACT_VERSION)],
    ["matrix_id", matrix.matrixId],
    ["matrix_built_on", matrix.builtOn],
    ["archive_id", matrix.archive.id],
    ["archive_checksum_sha256", matrix.archive.checksumManifestSha256],
    ["expected_matrix_digest", matrixDigest],
    ["record_id", record.id],
    ["expected_record_digest", recordDigest],
    ["source_reference", record.sourceRef],
    ["source_digest", record.sourceDigest],
    ["label", record.label],
    ["source_kind", record.sourceKind],
    ["area", record.area],
    ["visibility", record.sourceVisibility],
    ["legacy_path", exact(record.legacyPath)],
    ["required_reviews", record.requiredReviews.join(" | ")],
    ["current_route_status", record.routeContinuity.status],
    ["current_route_action", record.routeContinuity.action],
    ["current_route_target", exact(record.routeContinuity.targetPath)],
    ["current_cutover_record_id", exact(record.routeContinuity.cutoverRecordId)],
    ["current_content_decision", record.contentDecision.decision],
    ["current_content_target", exact(record.contentDecision.targetPath)],
    ["current_merge_into_record_id", exact(record.contentDecision.mergeIntoRecordId)],
    ["current_reason_code", exact(record.contentDecision.rationale)],
    ["current_owner_role", exact(record.contentDecision.ownerRole)],
    ["current_reviewed_on", exact(record.contentDecision.reviewedOn)],
    ["implementation_status", record.implementationStatus],
  ];
}

function detectMergeCycles(records: readonly LegacyMigrationDecisionPlanRecord[]) {
  const mergeTargets = new Map(
    records
      .filter((record) => record.proposed.contentDecision.decision === "merge")
      .map((record) => [record.recordId, record.proposed.contentDecision.mergeIntoRecordId!]),
  );
  const cyclic = new Set<string>();
  for (const start of mergeTargets.keys()) {
    const path: string[] = [];
    const seen = new Map<string, number>();
    let current: string | undefined = start;
    while (current && mergeTargets.has(current)) {
      if (seen.has(current)) {
        for (const recordId of path.slice(seen.get(current))) cyclic.add(recordId);
        break;
      }
      seen.set(current, path.length);
      path.push(current);
      current = mergeTargets.get(current);
    }
  }
  return cyclic;
}

export async function createLegacyMigrationDecisionPlan(options: {
  csv: string;
  matrix: LegacyContentMigrationMatrix;
  now?: string;
}): Promise<LegacyMigrationDecisionPlan> {
  const { csv, matrix } = options;
  const now = normalizedPlanNow(options.now);
  const issues: LegacyMigrationDecisionIssue[] = [];
  const add = (code: LegacyMigrationDecisionIssueCode, row: number | null = null, column: string | null = null) => {
    if (issues.length >= 250) return;
    issues.push({ code, row, column, message: legacyMigrationDecisionIssueLabels[code] });
  };

  const canonicalIssues = validateLegacyContentMigrationMatrix(matrix);
  if (canonicalIssues.length > 0) add("canonical-matrix-invalid");
  const byteLength = new TextEncoder().encode(csv).byteLength;
  if (byteLength === 0) add("worksheet-empty");
  if (byteLength > LEGACY_MIGRATION_DECISION_MAX_BYTES) add("worksheet-too-large");
  if (/[\u0000\uFFFD\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069]/u.test(csv)) add("worksheet-encoding");

  const parsed = byteLength > LEGACY_MIGRATION_DECISION_MAX_BYTES
    ? { rows: [], error: false }
    : parseLegacyMigrationDecisionCsv(csv);
  if (parsed.error) add("csv-malformed");
  const [header = [], ...rows] = parsed.rows;
  if (header.length !== legacyMigrationDecisionWorksheetHeaders.length
    || header.some((value, index) => value !== legacyMigrationDecisionWorksheetHeaders[index])) {
    add("header-contract-mismatch", 1);
  }
  if (rows.length !== matrix.records.length) add("row-count-mismatch");

  const matrixDigest = await fingerprintLegacyMigrationValue(matrix);
  const worksheetDigest = await fingerprintLegacyMigrationValue(csv);
  const recordDigests = await Promise.all(matrix.records.map(fingerprintLegacyMigrationValue));
  const recordsById = new Map(matrix.records.map((record, index) => [record.id, { record, digest: recordDigests[index] }]));
  const indexes = new Map(legacyMigrationDecisionWorksheetHeaders.map((name, index) => [name, index]));
  const seen = new Set<string>();
  const normalized: LegacyMigrationDecisionPlanRecord[] = [];
  const today = now.slice(0, 10);

  for (const [rowIndex, cells] of rows.entries()) {
    const rowNumber = rowIndex + 2;
    if (cells.length !== legacyMigrationDecisionWorksheetHeaders.length) {
      add("column-count-mismatch", rowNumber);
      continue;
    }
    if (cells.some((cell) => cell.length > 2048)) add("cell-too-long", rowNumber);
    const field = (name: (typeof legacyMigrationDecisionWorksheetHeaders)[number]) => cells[indexes.get(name)!] ?? "";
    const recordId = field("record_id");
    if (seen.has(recordId)) add("record-id-duplicate", rowNumber, "record_id");
    seen.add(recordId);
    const canonical = recordsById.get(recordId);
    if (!canonical) {
      add("record-id-invalid", rowNumber, "record_id");
      continue;
    }
    const { record, digest: recordDigest } = canonical;
    const rowIssueStart = issues.length;

    for (const [name, expectedValue] of immutablePairs(record, matrix, matrixDigest, recordDigest)) {
      const actual = field(name as (typeof legacyMigrationDecisionWorksheetHeaders)[number]);
      if (actual !== expectedValue) {
        const bindingField = ["decision_contract_version", "matrix_id", "matrix_built_on", "archive_id", "archive_checksum_sha256", "expected_matrix_digest"].includes(name);
        const recordBindingField = ["record_id", "expected_record_digest", "source_reference", "source_digest"].includes(name);
        add(bindingField ? "matrix-binding-stale" : recordBindingField ? "record-binding-stale" : "immutable-field-changed", rowNumber, name);
      }
    }

    for (const name of ["proposed_route_action", "proposed_route_target", "proposed_content_decision", "proposed_content_target", "proposed_merge_into_record_id", "proposed_reason_code", "proposed_owner_role", "proposed_reviewed_on"] as const) {
      if (isFormulaLike(field(name))) add("formula-like-input", rowNumber, name);
    }

    const proposedRouteAction = field("proposed_route_action") as MigrationRouteAction;
    const proposedRouteTarget = nullable(field("proposed_route_target"));
    let proposedRoute: RouteState;
    if (record.routeContinuity.status === "decision-required") {
      if (!migrationRouteActions.includes(proposedRouteAction) || proposedRouteAction === "unselected") {
        add("route-decision-missing", rowNumber, "proposed_route_action");
        proposedRoute = record.routeContinuity;
      } else {
        proposedRoute = { status: "planned", action: proposedRouteAction, targetPath: proposedRouteTarget, cutoverRecordId: null };
        const targetRequired = proposedRouteAction === "retain" || proposedRouteAction === "redirect";
        const targetValid = proposedRouteAction === "retain"
          ? validNonReservedLegacyMigrationTargetPath(proposedRouteTarget)
          : proposedRouteAction === "redirect"
            ? isPublicTarget(proposedRouteTarget)
            : proposedRouteTarget === null;
        if ((targetRequired && !targetValid) || (!targetRequired && proposedRouteTarget !== null)) {
          add("route-target-invalid", rowNumber, "proposed_route_target");
        }
        if (record.identityProtected) {
          if (!["archive", "retire", "private-only"].includes(proposedRouteAction)) add("identity-route-unsafe", rowNumber, "proposed_route_action");
        } else {
          if (proposedRouteAction === "private-only") add("route-target-invalid", rowNumber, "proposed_route_action");
          if (proposedRouteAction === "retain" && proposedRouteTarget !== record.legacyPath) add("route-target-invalid", rowNumber, "proposed_route_target");
          if (proposedRouteAction === "redirect" && proposedRouteTarget === record.legacyPath) add("route-target-invalid", rowNumber, "proposed_route_target");
        }
      }
    } else {
      proposedRoute = {
        ...record.routeContinuity,
        action: proposedRouteAction,
        targetPath: proposedRouteTarget,
      };
      if (!sameRoute(proposedRoute, record.routeContinuity)) add("route-decision-immutable", rowNumber, "proposed_route_action");
    }

    const proposedDecisionName = field("proposed_content_decision") as MigrationContentDecision;
    const proposedDecision: DecisionState = {
      decision: proposedDecisionName,
      targetPath: nullable(field("proposed_content_target")),
      mergeIntoRecordId: nullable(field("proposed_merge_into_record_id")),
      rationale: nullable(field("proposed_reason_code")?.trim()),
      ownerRole: nullable(field("proposed_owner_role")?.trim()),
      reviewedOn: nullable(field("proposed_reviewed_on")?.trim()),
    };

    if (!migrationContentDecisions.includes(proposedDecisionName) || proposedDecisionName === "unselected") {
      add("content-decision-missing", rowNumber, "proposed_content_decision");
    } else {
      const requiresTarget = ["migrate", "rewrite", "redirect-only"].includes(proposedDecisionName);
      if ((requiresTarget && !isPublicTarget(proposedDecision.targetPath))
        || (!requiresTarget && proposedDecision.targetPath !== null)) {
        add("content-target-invalid", rowNumber, "proposed_content_target");
      }
      if (proposedDecisionName === "merge") {
        const target = proposedDecision.mergeIntoRecordId ? recordsById.get(proposedDecision.mergeIntoRecordId)?.record : undefined;
        if (!target || target.id === record.id || target.identityProtected || target.sourceVisibility !== "public") add("merge-target-invalid", rowNumber, "proposed_merge_into_record_id");
      } else if (proposedDecision.mergeIntoRecordId !== null) {
        add("merge-target-invalid", rowNumber, "proposed_merge_into_record_id");
      }
      if (record.identityProtected && !["archive", "retire"].includes(proposedDecisionName)) add("private-data-risk", rowNumber, "proposed_content_decision");
      if (proposedDecisionName === "redirect-only" && (proposedRoute.action !== "redirect" || proposedDecision.targetPath !== proposedRoute.targetPath)) {
        add("content-target-invalid", rowNumber, "proposed_content_target");
      }
      if (!validMigrationDecisionReason(proposedDecisionName, proposedDecision.rationale)) {
        add("rationale-invalid", rowNumber, "proposed_reason_code");
      }
      if (!proposedDecision.ownerRole
        || !migrationDecisionOwnerRoles.includes(proposedDecision.ownerRole as (typeof migrationDecisionOwnerRoles)[number])) {
        add("owner-role-invalid", rowNumber, "proposed_owner_role");
      }
      if (!validLegacyMigrationDate(proposedDecision.reviewedOn)
        || proposedDecision.reviewedOn! < matrix.archive.capturedOn
        || proposedDecision.reviewedOn! > today) {
        add("review-date-invalid", rowNumber, "proposed_reviewed_on");
      }
    }

    if (record.contentDecision.decision !== "unselected" && !sameDecision(proposedDecision, record.contentDecision)) {
      add("content-decision-immutable", rowNumber, "proposed_content_decision");
    }

    if (issues.length === rowIssueStart) {
      normalized.push({
        recordId,
        sourceReference: record.sourceRef,
        sourceDigest: record.sourceDigest,
        expectedRecordDigest: recordDigest,
        expected: {
          routeContinuity: structuredClone(record.routeContinuity),
          contentDecision: structuredClone(record.contentDecision),
          implementationStatus: record.implementationStatus,
        },
        proposed: {
          routeContinuity: proposedRoute,
          contentDecision: proposedDecision,
        },
        changes: {
          route: !sameRoute(proposedRoute, record.routeContinuity),
          content: !sameDecision(proposedDecision, record.contentDecision),
        },
      });
    }
  }

  for (const record of matrix.records) if (!seen.has(record.id)) add("record-id-missing", null, "record_id");
  const cyclic = detectMergeCycles(normalized);
  for (const recordId of cyclic) {
    const rowIndex = rows.findIndex((row) => row[indexes.get("record_id")!] === recordId);
    add("merge-cycle", rowIndex >= 0 ? rowIndex + 2 : null, "proposed_merge_into_record_id");
  }

  const changedRecords = normalized.filter((record) => record.changes.route || record.changes.content).length;
  if (issues.length === 0 && changedRecords === 0) add("no-changes");
  const ready = issues.length === 0 && normalized.length === matrix.records.length;
  const planCore = ready ? {
    matrixDigest,
    worksheetDigest,
    records: normalized.map((record) => ({
      recordId: record.recordId,
      expectedRecordDigest: record.expectedRecordDigest,
      proposed: record.proposed,
    })),
  } : null;
  const planDigest = planCore ? await fingerprintLegacyMigrationValue(planCore) : null;
  const planId = planDigest ? `legacy-migration-decisions-${planDigest.slice(0, 24)}` : null;

  return {
    $schema: "./legacy-migration-decision-plan.schema.json",
    schemaVersion: 1,
    planId,
    generatedOn: now,
    status: ready ? "ready-for-explicit-atomic-write" : "blocked",
    binding: {
      contractVersion: LEGACY_MIGRATION_DECISION_CONTRACT_VERSION,
      matrixId: matrix.matrixId,
      matrixBuiltOn: matrix.builtOn,
      matrixDigest,
      archiveId: matrix.archive.id,
      archiveChecksumSha256: matrix.archive.checksumManifestSha256,
      worksheetDigest,
    },
    summary: {
      expectedRecords: matrix.records.length,
      worksheetRows: rows.length,
      acceptedRecords: normalized.length,
      changedRecords,
      routeChanges: normalized.filter((record) => record.changes.route).length,
      contentChanges: normalized.filter((record) => record.changes.content).length,
      issueCount: issues.length,
    },
    issues,
    records: ready ? normalized : [],
    guardrails: {
      sourceContentIncluded: false,
      privateSourcePathsIncluded: false,
      implementationStatusChanged: false,
      approvalGranted: false,
      publicationAuthorized: false,
      repositoryWritePerformed: false,
      networkRequestPerformed: false,
      serverPersistencePerformed: false,
      cmsWritePerformed: false,
      navigationActivated: false,
      deploymentPerformed: false,
      malwareScanPerformed: false,
    },
  };
}
