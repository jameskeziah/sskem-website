import {
  inspectHomepagePosterOptimization,
  prepareHomepagePosterOptimization,
} from "../lib/homepage-poster-optimization.mjs";

function parseArguments(argv) {
  const options = { inspect: false, replace: false };
  for (const argument of argv) {
    if (argument === "--inspect") options.inspect = true;
    else if (argument === "--replace") options.replace = true;
    else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (options.inspect && options.replace) throw new Error("--replace applies only to staging preparation.");
  return options;
}

function usage() {
  return [
    "Read-only inspection: npm run poster:inspect",
    "Prepare ignored candidate: npm run poster:prepare",
    "Replace staged candidate: npm run poster:prepare -- --replace",
    "",
    "The workflow is lossless, uncropped, unresized and staging-only. It never",
    "changes public/og.png or the performance budget. If exact pixels cannot meet",
    "the limit, a format or artwork change requires separate explicit approval.",
  ].join("\n");
}

const options = parseArguments(process.argv.slice(2));
if (options.help) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}

const result = options.inspect
  ? await inspectHomepagePosterOptimization()
  : await prepareHomepagePosterOptimization({ replace: options.replace });
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
