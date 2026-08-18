import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  CAMPUS_MEDIA_BATCH_STAGING_ACKNOWLEDGEMENT,
  executeCampusMediaBatchStaging,
} from "../lib/campus-media-batch-staging.mjs";

function usage() {
  return [
    "Plan an atomic four-master staging batch:",
    "npm run media:stage-batch -- --report PREFLIGHT.json --input media-campus-main=PATH --input media-campus-grounds=PATH --input media-campus-entrance=PATH --input media-campus-courtyard=PATH",
    "",
    "Apply only after reviewing the plan:",
    `Add --apply --acknowledge-local-write=${CAMPUS_MEDIA_BATCH_STAGING_ACKNOWLEDGEMENT}`,
    "Add --replace only to replace a reviewed existing private staging batch.",
    "No approval, public derivative or publication binding is created.",
  ].join("\n");
}

function parseArguments(argv) {
  const options = { inputs: {}, apply: false, replace: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--replace") options.replace = true;
    else if (argument.startsWith("--acknowledge-local-write=")) options.acknowledgement = argument.slice("--acknowledge-local-write=".length);
    else if (["--report", "--output"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      options[argument.slice(2)] = value;
      index += 1;
    } else if (argument === "--input") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--input requires a RECORD_ID=PATH value.");
      const separator = value.indexOf("=");
      if (separator <= 0 || separator === value.length - 1) throw new Error("--input requires a RECORD_ID=PATH value.");
      const recordId = value.slice(0, separator);
      if (Object.hasOwn(options.inputs, recordId)) throw new Error(`Duplicate input mapping for ${recordId}.`);
      options.inputs[recordId] = value.slice(separator + 1);
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
if (!options.report) throw new Error(`--report is required.\n${usage()}`);

let report;
try {
  report = JSON.parse(await readFile(path.resolve(options.report), "utf8"));
} catch {
  throw new Error("The browser preflight report could not be read as JSON.");
}

const result = await executeCampusMediaBatchStaging({
  report,
  inputs: options.inputs,
  outputPath: options.output,
  replace: options.replace,
  apply: options.apply,
  acknowledgement: options.acknowledgement,
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status === "blocked") process.exitCode = 1;
