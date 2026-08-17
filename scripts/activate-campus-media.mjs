import {
  CAMPUS_MEDIA_ACTIVATION_ACKNOWLEDGEMENT,
  executeCampusMediaActivation,
} from "../lib/campus-media-activation.ts";

function parseArguments(argv) {
  const options = { apply: false, replace: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--replace") options.replace = true;
    else if (argument === "--record") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--record requires a value.");
      options.recordId = value;
      index += 1;
    } else if (argument.startsWith("--acknowledge-local-write=")) {
      options.acknowledgement = argument.slice("--acknowledge-local-write=".length);
    } else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function usage() {
  return [
    "Review plan: npm run media:activate -- --record RECORD_ID",
    `Activate: npm run media:activate -- --record RECORD_ID --apply --acknowledge-local-write=${CAMPUS_MEDIA_ACTIVATION_ACKNOWLEDGEMENT}`,
    `Replace: npm run media:activate -- --record RECORD_ID --replace --apply --acknowledge-local-write=${CAMPUS_MEDIA_ACTIVATION_ACKNOWLEDGEMENT}`,
    "",
    "The default mode is read-only. It verifies the exact public receipt and all",
    "15 derivatives before proposing a registry change. Activation never grants",
    "approval and never stores source paths, private evidence or approver identity.",
  ].join("\n");
}

const options = parseArguments(process.argv.slice(2));
if (options.help) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}
if (!options.recordId) throw new Error(`--record is required.\n${usage()}`);

const result = await executeCampusMediaActivation(options);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.mode === "local-plan" && result.plan.status === "blocked") process.exitCode = 1;
