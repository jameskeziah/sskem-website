import path from "node:path";

import {
  inspectCampusMedia,
  prepareCampusMedia,
} from "../lib/campus-media-pipeline.mjs";
import { createCampusMediaBindingProposal } from "../lib/campus-media-publication.ts";

function parseArguments(argv) {
  const options = { inspect: false, publish: false, replace: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--inspect") options.inspect = true;
    else if (argument === "--publish") options.publish = true;
    else if (argument === "--replace") options.replace = true;
    else if (["--record", "--input", "--output", "--profile"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      options[argument.slice(2)] = value;
      index += 1;
    } else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function usage() {
  return [
    "Inspect: npm run media:inspect -- --record RECORD_ID --input PATH",
    "Prepare: npm run media:prepare -- --record RECORD_ID --input PATH [--output PATH] [--replace]",
    "Publish: npm run media:publish -- --record RECORD_ID --input PATH [--replace]",
    "",
    "Preparation writes only to work/media-intake. Publication writes only to",
    "public/media/home/production and is refused until the manifest record is approved.",
  ].join("\n");
}

const options = parseArguments(process.argv.slice(2));
if (options.help) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}
if (!options.record || !options.input) throw new Error(`--record and --input are required.\n${usage()}`);
if (options.inspect && options.publish) throw new Error("--inspect and --publish cannot be combined.");

const inputPath = path.resolve(options.input);
if (options.inspect) {
  const inspection = await inspectCampusMedia({ recordId: options.record, inputPath, profileName: options.profile });
  process.stdout.write(`${JSON.stringify(inspection, null, 2)}\n`);
  if (!inspection.eligible) process.exitCode = 1;
} else {
  const result = await prepareCampusMedia({
    recordId: options.record,
    inputPath,
    outputPath: options.output,
    profileName: options.profile,
    publish: options.publish,
    replace: options.replace,
  });
  process.stdout.write(`${JSON.stringify({
    recordId: options.record,
    mode: result.receipt.mode,
    outputDirectory: result.outputDirectory,
    variants: result.receipt.output.variants.length,
    sourceSha256: result.receipt.source.sha256,
    ...(options.publish ? { bindingProposal: createCampusMediaBindingProposal(result.receipt) } : {}),
  }, null, 2)}\n`);
}
