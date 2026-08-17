import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  PUBLIC_DOCUMENT_ACTIVATION_ACKNOWLEDGEMENT,
  executePublicDocumentActivation,
} from "../lib/public-document-activation.ts";

function parseArguments(argv) {
  const options = { apply: false, replace: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--replace") options.replace = true;
    else if (argument === "--record" || argument === "--metadata") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      options[argument.slice(2)] = value;
      index += 1;
    } else if (argument.startsWith("--acknowledge-local-write=")) {
      options.acknowledgement = argument.slice("--acknowledge-local-write=".length);
    } else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function usage() {
  return [
    "Review plan: npm run documents:activate -- --record RECORD_ID --metadata CONTROLLED_METADATA.json",
    `Activate: npm run documents:activate -- --record RECORD_ID --metadata CONTROLLED_METADATA.json --apply --acknowledge-local-write=${PUBLIC_DOCUMENT_ACTIVATION_ACKNOWLEDGEMENT}`,
    `Replace: npm run documents:activate -- --record RECORD_ID --metadata CONTROLLED_METADATA.json --replace --apply --acknowledge-local-write=${PUBLIC_DOCUMENT_ACTIVATION_ACKNOWLEDGEMENT}`,
    "",
    "The default mode is read-only. It verifies the staged receipt, exact public",
    "PDF, current manifest approval and public-safe metadata before proposing a",
    "registry change. It never grants approval or stores the metadata source path.",
  ].join("\n");
}

const options = parseArguments(process.argv.slice(2));
if (options.help) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}
if (!options.record || !options.metadata) throw new Error(`--record and --metadata are required.\n${usage()}`);

let metadata;
try {
  metadata = JSON.parse(await readFile(path.resolve(options.metadata), "utf8"));
} catch {
  throw new Error("The controlled activation metadata file is missing, unreadable or invalid JSON.");
}
const result = await executePublicDocumentActivation({
  recordId: options.record,
  metadata,
  apply: options.apply,
  acknowledgement: options.acknowledgement,
  replace: options.replace,
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.mode === "local-plan" && result.plan.status === "blocked") process.exitCode = 1;
