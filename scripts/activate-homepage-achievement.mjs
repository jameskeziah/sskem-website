import {
  HOMEPAGE_ACHIEVEMENT_ACTIVATION_ACKNOWLEDGEMENT,
  executeHomepageAchievementActivation,
} from "../lib/homepage-achievement-activation.ts";

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
    "Review plan: npm run achievements:activate -- --record RECORD_ID",
    `Activate: npm run achievements:activate -- --record RECORD_ID --apply --acknowledge-local-write=${HOMEPAGE_ACHIEVEMENT_ACTIVATION_ACKNOWLEDGEMENT}`,
    `Replace: npm run achievements:activate -- --record RECORD_ID --replace --apply --acknowledge-local-write=${HOMEPAGE_ACHIEVEMENT_ACTIVATION_ACKNOWLEDGEMENT}`,
    "",
    "The default mode is read-only. Activation requires current approval for the",
    "exact media and paired claim records and binds only the current artwork hash.",
    "It never grants approval or changes an image.",
  ].join("\n");
}

const options = parseArguments(process.argv.slice(2));
if (options.help) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}
if (!options.recordId) throw new Error(`--record is required.\n${usage()}`);

const result = await executeHomepageAchievementActivation(options);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.mode === "local-plan" && result.plan.status === "blocked") process.exitCode = 1;
