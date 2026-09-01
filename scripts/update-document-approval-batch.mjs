import { readFile } from "node:fs/promises";

import {
  DOCUMENT_APPROVAL_BATCH_UPDATE_ACKNOWLEDGEMENT,
  executeDocumentApprovalBatchUpdate,
} from "../lib/approval-manifest-update.mjs";

function parseArguments(argv) {
  const options = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--request") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--request requires a value.");
      options.requestPath = value;
      index += 1;
    } else if (argument.startsWith("--acknowledge-local-write=")) {
      options.acknowledgement = argument.slice("--acknowledge-local-write=".length);
    } else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (options.apply && !options.requestPath) throw new Error("--apply requires a completed --request bundle.");
  return options;
}

function usage() {
  return [
    "Review batch: npm run approvals:document-batch -- --request \"CONTROLLED_BATCH_PATH\"",
    `Record batch: npm run approvals:document-batch -- --request "CONTROLLED_BATCH_PATH" --apply --acknowledge-local-write=${DOCUMENT_APPROVAL_BATCH_UPDATE_ACKNOWLEDGEMENT}`,
    "",
    "The default mode is read-only. All twelve independently completed Appendix IX",
    "requests must match the current manifest before the atomic write is available.",
    "The command records supplied decisions; it does not grant approval, inspect",
    "documents, run a malware scan or activate publication.",
  ].join("\n");
}

const options = parseArguments(process.argv.slice(2));
if (options.help) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}
if (!options.requestPath) throw new Error(`--request is required.\n${usage()}`);

let batch;
try {
  batch = JSON.parse(await readFile(options.requestPath, "utf8"));
} catch {
  throw new Error("The controlled Appendix IX document approval batch is missing, unreadable or invalid JSON.");
}

const result = await executeDocumentApprovalBatchUpdate({
  batch,
  apply: options.apply,
  acknowledgement: options.acknowledgement,
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.mode === "local-document-batch-plan" && result.plan.status === "blocked") process.exitCode = 1;
