import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadApprovalManifest } from "../lib/approval-manifest.mjs";
import { createProgrammesImplementationPlan } from "../lib/programmes-publication.ts";

const input = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const nowArgument = process.argv.slice(2).find((argument) => argument.startsWith("--now="));

if (!input) {
  process.stderr.write("Usage: npm run programmes:plan -- <approved-package.json> [--now=<ISO date-time>]\n");
  process.exitCode = 2;
} else {
  try {
    if (/^(?:https?:|file:)/i.test(input)) throw new Error("Input must be a local JSON file, not a URL.");
    const source = await readFile(resolve(input), "utf8");
    const packageData = JSON.parse(source);
    const manifest = await loadApprovalManifest();
    const plan = createProgrammesImplementationPlan({
      packageData,
      manifest,
      ...(nowArgument ? { now: nowArgument.slice("--now=".length) } : {}),
    });
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    if (!plan.receipt.publicationAuthorized) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      status: "BLOCKED",
      code: "INVALID_PROGRAMMES_PACKAGE_INPUT",
      message: error instanceof Error ? error.message : "Programmes package could not be read.",
      guardrails: {
        repositoryWritePerformed: false,
        approvalManifestUpdated: false,
        publicContentPublished: false,
        deploymentPerformed: false
      }
    }, null, 2)}\n`);
    process.exitCode = 1;
  }
}
