import { readFile } from "node:fs/promises";

import {
  executeHomepagePosterDeliveryDecisionBinding,
  POSTER_DECISION_BINDING_ACKNOWLEDGEMENT,
} from "../lib/homepage-poster-delivery-decision-binding-recorder.ts";

function parseArguments(argv) {
  const options = { apply: false, replace: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--request") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--request requires a value.");
      options.requestPath = value;
      index += 1;
    } else if (argument === "--apply") options.apply = true;
    else if (argument === "--replace") options.replace = true;
    else if (argument.startsWith("--acknowledge-local-write=")) options.acknowledgement = argument.slice("--acknowledge-local-write=".length);
    else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (options.replace && !options.apply) throw new Error("--replace requires --apply.");
  return options;
}

function usage() {
  return [
    "Review binding plan: npm run poster:decision-record -- --request \"CONTROLLED_REQUEST_PATH\"",
    `Record binding: npm run poster:decision-record -- --request "CONTROLLED_REQUEST_PATH" --apply --acknowledge-local-write=${POSTER_DECISION_BINDING_ACKNOWLEDGEMENT}`,
    `Replace binding: npm run poster:decision-record -- --request "CONTROLLED_REQUEST_PATH" --replace --apply --acknowledge-local-write=${POSTER_DECISION_BINDING_ACKNOWLEDGEMENT}`,
    "",
    "Default mode is read-only. The registry stores one exact scope, request hash",
    "and opaque decision reference; it never stores evidence, identity or paths.",
    "Recording does not generate a candidate or grant publication approval.",
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

const result = await executeHomepagePosterDeliveryDecisionBinding({
  request,
  apply: options.apply,
  replace: options.replace,
  acknowledgement: options.acknowledgement,
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.mode === "local-plan" && result.plan.status === "blocked") process.exitCode = 1;
