import { readFile } from "node:fs/promises";

import {
  inspectProgrammesWorkbook,
  programmesWorkbookIssueLabels,
  validateProgrammesWorkbookIntakeReceipt,
} from "../lib/programmes-workbook-intake.ts";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const workbookPath = argument("--workbook");
const jsonOutput = process.argv.includes("--json");
const requireReady = process.argv.includes("--require-ready");

if (!workbookPath) {
  console.error("Usage: npm run programmes:workbook:audit -- --workbook <controlled-workbook.xlsx> [--json] [--require-ready]");
  process.exit(2);
}

let receipt;
try {
  const source = await readFile(workbookPath);
  receipt = await inspectProgrammesWorkbook({ bytes: new Uint8Array(source) });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Workbook audit failed.");
  process.exit(2);
}

const validationIssues = validateProgrammesWorkbookIntakeReceipt(receipt);
if (validationIssues.length) {
  console.error(`Generated receipt is invalid: ${validationIssues[0]}`);
  process.exit(2);
}

if (jsonOutput) {
  console.log(JSON.stringify(receipt, null, 2));
} else {
  console.log(`Programme workbook intake: ${receipt.status}`);
  console.log(`Fingerprint: sha256:${receipt.sourceFingerprint.value}`);
  console.log(`Recognized source worksheets: ${receipt.structure.matchedRequiredWorksheetCount}/${receipt.structure.requiredWorksheetCount}`);
  console.log(`Canonical intake tabs: ${receipt.contractBinding.matchedWorksheetCount}/${receipt.contractBinding.expectedWorksheetCount}`);
  console.log(`Responses marked NOT CONFIRMED: ${receipt.totals.notConfirmedResponses}/${receipt.totals.responseFields}`);
  console.log(`Unresolved critical responses: ${receipt.totals.unresolvedCriticalResponses}/${receipt.totals.criticalFields}`);
  console.log(`Management-confirmed forms: ${receipt.totals.managementConfirmedForms}/${receipt.totals.programmeForms}`);
  console.log(`Approved-for-publication forms: ${receipt.totals.approvedForPublicationForms}/${receipt.totals.programmeForms}`);
  console.log(`Publication-ready tracker rows: ${receipt.totals.trackerPublicationReadyRows}/${receipt.repeatingRows.publicationTracker}`);
  for (const code of receipt.issueCodes) console.log(`- ${programmesWorkbookIssueLabels[code]}`);
  console.log("No source filename, source path, cell text, person, contact, fee amount or evidence text is emitted in the receipt.");
}

if (requireReady && receipt.status !== "ready-for-controlled-reconciliation") process.exit(1);
