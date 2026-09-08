import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { planProgrammeExpiryRollback } from "../lib/programmes-expiry.ts";

const args = process.argv.slice(2);
const option = (name) => args.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
const activePath = option("active");
const targetPath = option("target");
const route = option("route");
const now = option("now");

function requireLocalPath(value, label) {
  if (/^(?:https?:|file:)/i.test(value)) throw new Error(`${label} must be a local JSON file, not a URL.`);
  return resolve(value);
}

function receiptFrom(value, label) {
  if (value?.receiptType === "programme-expiry-projection") return value;
  if (route && value?.[route]?.receipt) return value[route].receipt;
  if (route && value?.routes?.[route]?.receipt) return value.routes[route].receipt;
  throw new Error(`${label} must be a receipt or an expiry plan containing --route=${route ?? "<required>"}.`);
}

if (!activePath || !targetPath) {
  process.stderr.write("Usage: npm run programmes:expiry:rollback-plan -- --active=<active-receipt-or-plan.json> --target=<target-receipt-or-plan.json> [--route=</programme/route>] [--now=<ISO date-time>]\n");
  process.exitCode = 2;
} else {
  try {
    const activeValue = JSON.parse(await readFile(requireLocalPath(activePath, "Active receipt"), "utf8"));
    const targetValue = JSON.parse(await readFile(requireLocalPath(targetPath, "Target receipt"), "utf8"));
    const plan = planProgrammeExpiryRollback({
      activeReceipt: receiptFrom(activeValue, "Active input"),
      targetReceipt: receiptFrom(targetValue, "Target input"),
      ...(now ? { now } : {}),
    });
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    if (plan.status === "blocked") process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      status: "blocked",
      code: "INVALID_PROGRAMME_ROLLBACK_INPUT",
      message: error instanceof Error ? error.message : "Programme rollback could not be planned.",
      controls: {
        expiredContentRestorationAllowed: false,
        repositoryWritePerformed: false,
        deploymentPerformed: false,
      },
    }, null, 2)}\n`);
    process.exitCode = 1;
  }
}
