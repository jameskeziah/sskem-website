import { readFile } from "node:fs/promises";
import path from "node:path";

import { inspectCampusMediaBatch } from "../lib/campus-media-batch-inspection.mjs";

function usage() {
  return [
    "Inspect four exact campus masters in one read-only batch:",
    "npm run media:inspect-batch -- --report PREFLIGHT.json --input media-campus-main=PATH --input media-campus-grounds=PATH --input media-campus-entrance=PATH --input media-campus-courtyard=PATH",
    "",
    "The downloaded browser preflight must match all four file hashes and byte counts.",
    "No derivative, approval, binding or public file is written.",
  ].join("\n");
}

function parseArguments(argv) {
  const options = { inputs: {} };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--report") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--report requires a value.");
      options.report = value;
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
    } else if (argument === "--help") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
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

const result = await inspectCampusMediaBatch({ report, inputs: options.inputs });
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== "ready-for-staging") process.exitCode = 1;
