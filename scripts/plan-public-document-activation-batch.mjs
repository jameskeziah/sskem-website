import {
  createPublicDocumentActivationBatchPlan,
  loadPublicDocumentActivationBatch,
} from "../lib/public-document-activation-batch-plan.mjs";

function usage() {
  return [
    "Plan the complete twelve-document Appendix IX activation batch:",
    "npm run documents:activate-batch-plan -- --metadata-batch \"CONTROLLED_METADATA_BATCH.json\"",
    "",
    "This command is permanently read-only. It validates all twelve public metadata",
    "records, staged receipts, current approvals, external-scan evidence, public PDFs",
    "and the exact proposed registry. It accepts neither --apply nor --replace.",
  ].join("\n");
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--metadata-batch") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--metadata-batch requires a value.");
      options.metadataBatchPath = value;
      index += 1;
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
const plan = await createPublicDocumentActivationBatchPlan({ batch });
process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
if (plan.status === "blocked") process.exitCode = 1;
