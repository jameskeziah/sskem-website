import path from "node:path";

import { inspectPublicDocument, preparePublicDocument } from "../lib/document-ingestion-pipeline.mjs";

function parseArguments(argv) {
  const options = { inspect: false, publish: false, replace: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--inspect") options.inspect = true;
    else if (argument === "--publish") options.publish = true;
    else if (argument === "--replace") options.replace = true;
    else if (["--record", "--input", "--output", "--receipt", "--public-filename"].includes(argument)) {
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
    "Inspect: npm run documents:inspect -- --record RECORD_ID --input PATH",
    "Prepare: npm run documents:prepare -- --record RECORD_ID --input PATH [--output PATH] [--replace]",
    "Publish: npm run documents:publish -- --record RECORD_ID --input PATH --public-filename NAME.pdf [--receipt PATH] [--replace]",
    "",
    "Preparation writes only to work/document-intake. Publication writes only to",
    "public/documents/production and requires an approved manifest record plus an exact staged-receipt hash match.",
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
  const inspection = await inspectPublicDocument({ recordId: options.record, inputPath });
  process.stdout.write(`${JSON.stringify(inspection, null, 2)}\n`);
  if (!inspection.eligibleForStaging) process.exitCode = 1;
} else {
  const result = await preparePublicDocument({
    recordId: options.record,
    inputPath,
    outputPath: options.output,
    receiptPath: options.receipt,
    publicFilename: options["public-filename"],
    publish: options.publish,
    replace: options.replace,
  });
  process.stdout.write(`${JSON.stringify({
    recordId: options.record,
    mode: result.receipt.mode,
    outputDirectory: result.outputDirectory,
    pages: result.receipt.source.pages,
    sourceSha256: result.receipt.source.sha256,
    accessibility: result.receipt.accessibility.assessment,
    malwareScanner: result.receipt.safety.malwareScanner,
  }, null, 2)}\n`);
}
