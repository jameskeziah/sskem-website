import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadApprovalManifest } from "../lib/approval-manifest.mjs";
import { adaptProgrammesPublicationPackage } from "../lib/programmes-data-adapter.ts";
import { resolveProgrammeExpiryProjection } from "../lib/programmes-expiry.ts";
import { PROGRAMMES_PUBLICATION_ROUTES } from "../lib/programmes-publication-routes.ts";

const args = process.argv.slice(2);
const input = args.find((argument) => !argument.startsWith("--"));
const option = (name) => args.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
const evaluationTime = option("now");
const sourceValidationTime = option("source-validated-at") ?? evaluationTime;
const previousPath = option("previous-receipts");

function requireLocalPath(value, label) {
  if (/^(?:https?:|file:)/i.test(value)) throw new Error(`${label} must be a local JSON file, not a URL.`);
  return resolve(value);
}

function previousReceiptFor(value, route) {
  if (!value || typeof value !== "object") return undefined;
  if (value.receiptType === "programme-expiry-projection" && value.route === route) return value;
  if (value[route]?.receipt) return value[route].receipt;
  if (value.routes?.[route]?.receipt) return value.routes[route].receipt;
  return undefined;
}

if (!input) {
  process.stderr.write("Usage: npm run programmes:expiry:plan -- <approved-package.json> [--now=<ISO date-time>] [--source-validated-at=<ISO date-time>] [--previous-receipts=<expiry-plan.json>]\n");
  process.exitCode = 2;
} else {
  try {
    const packageData = JSON.parse(await readFile(requireLocalPath(input, "Input"), "utf8"));
    const previousReceipts = previousPath
      ? JSON.parse(await readFile(requireLocalPath(previousPath, "Previous receipts"), "utf8"))
      : null;
    const manifest = await loadApprovalManifest();
    const adapted = adaptProgrammesPublicationPackage({
      packageData,
      manifest,
      ...(sourceValidationTime ? { now: sourceValidationTime } : {}),
    });

    if (!adapted.ok) {
      process.stdout.write(`${JSON.stringify({
        planVersion: 1,
        planType: "programme-expiry-projection",
        status: "BLOCKED",
        issues: adapted.issues,
        guardrails: {
          receiptAuthorizesPublication: false,
          repositoryWritePerformed: false,
          approvalManifestUpdated: false,
          publicContentPublished: false,
          deploymentPerformed: false,
        },
      }, null, 2)}\n`);
      process.exitCode = 1;
    } else {
      const routes = Object.fromEntries(PROGRAMMES_PUBLICATION_ROUTES.map((route) => {
        const projection = resolveProgrammeExpiryProjection({
          page: adapted.pages[route],
          ...(evaluationTime ? { now: evaluationTime } : {}),
          ...(previousReceiptFor(previousReceipts, route)
            ? { previousReceipt: previousReceiptFor(previousReceipts, route) }
            : {}),
        });
        return [route, {
          status: Object.values(projection.sections).some((section) => section.state === "fallback")
            ? "SAFE_FALLBACK"
            : "CURRENT",
          sectionStates: Object.fromEntries(Object.entries(projection.sections).map(([section, decision]) => [section, decision.state])),
          receipt: projection.receipt,
        }];
      }));
      const plan = {
        planVersion: 1,
        planType: "programme-expiry-projection",
        status: "READY",
        packageDigest: adapted.packageDigest,
        routes,
        guardrails: {
          receiptAuthorizesPublication: false,
          sourceMustRemainApprovalBound: true,
          expiredValuesIncludedInOutput: false,
          repositoryWritePerformed: false,
          approvalManifestUpdated: false,
          publicContentPublished: false,
          deploymentPerformed: false,
        },
      };
      process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    }
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      status: "BLOCKED",
      code: "INVALID_PROGRAMME_EXPIRY_INPUT",
      message: error instanceof Error ? error.message : "Programme expiry projection could not be planned.",
      guardrails: {
        receiptAuthorizesPublication: false,
        repositoryWritePerformed: false,
        approvalManifestUpdated: false,
        publicContentPublished: false,
        deploymentPerformed: false,
      },
    }, null, 2)}\n`);
    process.exitCode = 1;
  }
}
