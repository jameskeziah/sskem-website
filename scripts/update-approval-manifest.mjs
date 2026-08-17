import { readFile } from "node:fs/promises";

import {
  APPROVAL_MANIFEST_UPDATE_ACKNOWLEDGEMENT,
  executeApprovalManifestUpdate,
} from "../lib/approval-manifest-update.mjs";

function parseArguments(argv) {
  const options = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--record" || argument === "--request") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      if (argument === "--record") options.recordId = value;
      else options.requestPath = value;
      index += 1;
    } else if (argument.startsWith("--acknowledge-local-write=")) {
      options.acknowledgement = argument.slice("--acknowledge-local-write=".length);
    } else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (options.recordId && options.requestPath) throw new Error("Use --record to generate a template or --request to review/apply one, not both.");
  if (options.apply && !options.requestPath) throw new Error("--apply requires a completed --request; a template can never be applied.");
  return options;
}

function usage() {
  return [
    "Generate template: npm run approvals:update -- --record RECORD_ID",
    "Review request: npm run approvals:update -- --request \"CONTROLLED_REQUEST_PATH\"",
    `Record decision: npm run approvals:update -- --request "CONTROLLED_REQUEST_PATH" --apply --acknowledge-local-write=${APPROVAL_MANIFEST_UPDATE_ACKNOWLEDGEMENT}`,
    "",
    "Template generation and request review are read-only. Fill the template only",
    "after independent checks in the school-controlled system. Store only opaque",
    "evidence references and a role identifier; never include evidence or identity.",
  ].join("\n");
}

const options = parseArguments(process.argv.slice(2));
if (options.help) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}
if (!options.recordId && !options.requestPath) throw new Error(`--record or --request is required.\n${usage()}`);

let request;
if (options.requestPath) {
  try {
    request = JSON.parse(await readFile(options.requestPath, "utf8"));
  } catch {
    throw new Error("The controlled approval request is missing, unreadable or invalid JSON.");
  }
}

const result = await executeApprovalManifestUpdate({
  recordId: options.recordId,
  request,
  apply: options.apply,
  acknowledgement: options.acknowledgement,
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.mode === "local-plan" && result.plan.status === "blocked") process.exitCode = 1;
