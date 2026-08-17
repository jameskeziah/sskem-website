import { readFile } from "node:fs/promises";

import { createHomepagePosterDeliveryDecisionPlan } from "../lib/homepage-poster-delivery-decision.ts";

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--request") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--request requires a value.");
      options.requestPath = value;
      index += 1;
    } else if (argument === "--help") options.help = true;
    else if (argument === "--apply" || argument.startsWith("--apply=")) throw new Error("Poster delivery decision planning has no apply mode.");
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function usage() {
  return [
    "Review completed request: npm run poster:decision-plan -- --request \"CONTROLLED_REQUEST_PATH\"",
    "",
    "This command is read-only. It validates the exact contract and approval-record",
    "digests, selected scope, acknowledgements, opaque evidence references, role",
    "and timestamp. It cannot record a decision, generate an image or publish.",
  ].join("\n");
}

const options = parseArguments(process.argv.slice(2));
if (options.help) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}
if (!options.requestPath) throw new Error(`--request is required.\n${usage()}`);

let request;
try {
  request = JSON.parse(await readFile(options.requestPath, "utf8"));
} catch {
  throw new Error("The controlled poster delivery decision request is missing, unreadable or invalid JSON.");
}

const plan = createHomepagePosterDeliveryDecisionPlan({ request });
process.stdout.write(`${JSON.stringify({ mode: "local-plan", plan }, null, 2)}\n`);
if (plan.status === "blocked") process.exitCode = 1;
