import {
  PUBLIC_DOCUMENT_ACTIVATION_BATCH_ACKNOWLEDGEMENT,
  executePublicDocumentActivationBatch,
} from "../lib/public-document-activation-batch-execution.mjs";
import { loadPublicDocumentActivationBatch } from "../lib/public-document-activation-batch-plan.mjs";

function usage() {
  return [
    "Review the guarded twelve-document Appendix IX activation plan:",
    "npm run documents:activate-batch -- --metadata-batch \"CONTROLLED_METADATA_BATCH.json\"",
    "",
    "After reviewing the ready plan, activate that exact registry:",
    `npm run documents:activate-batch -- --metadata-batch \"CONTROLLED_METADATA_BATCH.json\" --activation-batch-id=PLAN_ID --apply --acknowledge-local-write=${PUBLIC_DOCUMENT_ACTIVATION_BATCH_ACKNOWLEDGEMENT}`,
    "",
    "This first-batch command refuses --replace. It reverifies all twelve staged",
    "receipts, approvals, external-scan evidence and public PDFs before one atomic",
    "local registry switch. It does not write PDFs, grant approval, scan or deploy.",
  ].join("\n");
}

function parseArguments(argv) {
  const options = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--metadata-batch") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--metadata-batch requires a value.");
      options.metadataBatchPath = value;
      index += 1;
    } else if (argument.startsWith("--activation-batch-id=")) {
      options.activationBatchId = argument.slice("--activation-batch-id=".length);
    } else if (argument.startsWith("--acknowledge-local-write=")) {
      options.acknowledgement = argument.slice("--acknowledge-local-write=".length);
    } else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

const options = parseArguments(process.argv.slice(2));
if (options.help) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}
if (!options.metadataBatchPath) throw new Error(`--metadata-batch is required.\n${usage()}`);

const batch = await loadPublicDocumentActivationBatch(options.metadataBatchPath);
const result = await executePublicDocumentActivationBatch({ ...options, batch });
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.mode === "local-plan" && result.plan.status === "blocked") process.exitCode = 1;
