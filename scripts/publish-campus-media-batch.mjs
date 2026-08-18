import {
  CAMPUS_MEDIA_PUBLICATION_BATCH_ACKNOWLEDGEMENT,
  executeCampusMediaPublicationBatch,
} from "../lib/campus-media-publication-batch-execution.mjs";

function usage() {
  return [
    "Review the atomic four-record first-publication plan:",
    "npm run media:publish-batch",
    "npm run media:publish-batch -- --staging work/media-intake/campus-batch",
    "",
    "After reviewing the ready plan, publish that exact batch:",
    `npm run media:publish-batch -- --publication-batch-id=PLAN_ID --apply --acknowledge-local-write=${CAMPUS_MEDIA_PUBLICATION_BATCH_ACKNOWLEDGEMENT}`,
    "",
    "The command supports first publication only and refuses --replace. It prepares",
    "and reverifies all four public derivative sets before switching the exact binding",
    "registry. It grants no approval and performs no deployment.",
  ].join("\n");
}

function parseArguments(argv) {
  const options = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--staging") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--staging requires a value.");
      options.stagingPath = value;
      index += 1;
    } else if (argument.startsWith("--publication-batch-id=")) {
      options.publicationBatchId = argument.slice("--publication-batch-id=".length);
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

const result = await executeCampusMediaPublicationBatch(options);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.mode === "local-plan" && result.plan.status === "blocked") process.exitCode = 1;
