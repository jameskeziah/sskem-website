import { createCampusMediaPublicationBatchPlan } from "../lib/campus-media-publication-batch-plan.mjs";

function usage() {
  return [
    "Plan the first atomic four-record campus publication:",
    "npm run media:publish-batch-plan",
    "npm run media:publish-batch-plan -- --staging work/media-intake/campus-batch",
    "",
    "This command is permanently read-only. It verifies the complete staged batch,",
    "all four current approvals, empty public targets and the exact proposed registry.",
    "It does not accept --apply or --replace and cannot publish or activate media.",
  ].join("\n");
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--staging") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--staging requires a value.");
      options.stagingPath = value;
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

const plan = await createCampusMediaPublicationBatchPlan(options);
process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
if (plan.status === "blocked") process.exitCode = 1;
