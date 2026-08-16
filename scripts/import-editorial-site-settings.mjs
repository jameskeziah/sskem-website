import {
  executeSiteSettingsDraftImport,
  SITE_SETTINGS_IMPORT_ACKNOWLEDGEMENT,
} from "../lib/cms/site-settings-import.ts";

function parseArguments(argv) {
  const options = { apply: false };
  for (const argument of argv) {
    if (argument === "--apply") options.apply = true;
    else if (argument.startsWith("--acknowledge-external-write=")) {
      options.acknowledgement = argument.slice("--acknowledge-external-write=".length);
    } else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function usage() {
  return [
    "Local plan: npm run editorial:site-settings:import",
    `Create draft: npm run editorial:site-settings:import -- --apply --acknowledge-external-write=${SITE_SETTINGS_IMPORT_ACKNOWLEDGEMENT}`,
    "",
    "Local plan is the default and makes no network request. Draft creation is",
    "refused until both controlling claims are approved and SANITY_IMPORT_TOKEN",
    "is supplied to the process. The create operation never replaces a draft.",
  ].join("\n");
}

const options = parseArguments(process.argv.slice(2));
if (options.help) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}

const result = await executeSiteSettingsDraftImport(options);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
