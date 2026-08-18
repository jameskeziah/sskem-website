import { createHash } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import {
  createHomepagePosterDeliveryDecisionBindingProposal,
  validateHomepagePosterDeliveryDecisionBindingRegistry,
  type HomepagePosterDeliveryDecisionBindingRegistryInput,
} from "./homepage-poster-delivery-decision-binding.ts";
import { createHomepagePosterDeliveryDecisionPacket } from "./homepage-poster-delivery-decision.ts";

type DecisionRegistry = HomepagePosterDeliveryDecisionBindingRegistryInput;

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const defaultRegistryPath = path.resolve(projectRoot, "content", "homepage-poster-delivery-decision-bindings.json");

export const POSTER_DECISION_BINDING_ACKNOWLEDGEMENT = "record-controlled-poster-delivery-decision";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function readJsonObject(filePath: string, label: string) {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch {
    throw new Error(`${label} is missing or unreadable.`);
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  if (!isRecord(value)) throw new Error(`${label} must contain one JSON object.`);
  return { text, value };
}

export async function createHomepagePosterDeliveryDecisionBindingPlan(options: {
  request: unknown;
  replace?: boolean;
  registryPath?: string;
  now?: Date | string | number;
  manifest?: Parameters<typeof createHomepagePosterDeliveryDecisionPacket>[0]["manifest"];
  contract?: Parameters<typeof createHomepagePosterDeliveryDecisionPacket>[0]["contract"];
}) {
  const registryPath = path.resolve(options.registryPath ?? defaultRegistryPath);
  const { text: registryText, value: registryValue } = await readJsonObject(registryPath, "Poster delivery decision binding registry");
  const currentIssues = validateHomepagePosterDeliveryDecisionBindingRegistry({ ...options, registry: registryValue });
  if (currentIssues.length) throw new Error(`Poster delivery decision binding registry is invalid: ${currentIssues.join(" ")}`);
  const registry = registryValue as unknown as DecisionRegistry;
  const proposal = createHomepagePosterDeliveryDecisionBindingProposal(options);
  const existing = registry.bindings[0] ?? null;
  const unchanged = existing !== null && isDeepStrictEqual(existing, { ...proposal, recordedAt: existing.recordedAt });
  const replacementBlocked = existing !== null && !unchanged && !options.replace;
  const nextRegistry = {
    ...registry,
    bindings: unchanged || replacementBlocked ? registry.bindings : [proposal],
  } as unknown as DecisionRegistry;
  const blockers = [
    ...(replacementBlocked ? ["A different poster delivery decision binding already exists; use --replace only after reviewing the new completed request."] : []),
    ...validateHomepagePosterDeliveryDecisionBindingRegistry({ ...options, registry: nextRegistry }),
  ];
  const status = blockers.length ? "blocked" : unchanged ? "already-recorded" : "ready-for-explicit-write";
  return {
    planVersion: 1,
    status,
    blockers: [...new Set(blockers)],
    proposal,
    nextRegistry,
    registrySha256Before: sha256(registryText),
    replacesBindingId: existing && !unchanged ? existing.bindingId : null,
    guardrails: {
      localWritePerformed: false,
      defaultMode: "local-plan",
      completedRequestRequired: true,
      exactDigestsRequired: true,
      replacementRequiresFlag: true,
      privateEvidenceIncluded: false,
      approverIdentityIncluded: false,
      candidateGenerated: false,
      sourceModified: false,
      publicWritePerformed: false,
      publicationApprovalGranted: false,
    },
  } as const;
}

export async function executeHomepagePosterDeliveryDecisionBinding(options: Parameters<typeof createHomepagePosterDeliveryDecisionBindingPlan>[0] & {
  apply?: boolean;
  acknowledgement?: string;
}) {
  const plan = await createHomepagePosterDeliveryDecisionBindingPlan(options);
  if (!options.apply) return { mode: "local-plan", plan } as const;
  if (plan.status === "already-recorded") return { mode: "no-change", bindingId: plan.proposal.bindingId } as const;
  if (plan.status !== "ready-for-explicit-write") throw new Error(`Poster delivery decision recording is blocked: ${plan.blockers.join(" ")} No registry write was made.`);
  if (options.acknowledgement !== POSTER_DECISION_BINDING_ACKNOWLEDGEMENT) {
    throw new Error(`Poster delivery decision recording requires --acknowledge-local-write=${POSTER_DECISION_BINDING_ACKNOWLEDGEMENT}. No registry write was made.`);
  }

  const registryPath = path.resolve(options.registryPath ?? defaultRegistryPath);
  const currentText = await readFile(registryPath, "utf8");
  if (sha256(currentText) !== plan.registrySha256Before) throw new Error("The poster delivery decision binding registry changed after planning. Review a fresh plan; no registry write was made.");
  const temporaryPath = path.join(path.dirname(registryPath), `.${path.basename(registryPath)}.${process.pid}-${Date.now()}.tmp`);
  try {
    await writeFile(temporaryPath, `${JSON.stringify(plan.nextRegistry, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, registryPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }

  return {
    mode: "local-registry-write",
    receipt: {
      receiptVersion: 1,
      bindingId: plan.proposal.bindingId,
      selectedOption: plan.proposal.selectedOption,
      completedRequestDigest: plan.proposal.completedRequestDigest,
      replacedBindingId: plan.replacesBindingId,
      localWritePerformed: true,
      privateEvidenceIncluded: false,
      approverIdentityIncluded: false,
      candidateGenerated: false,
      publicWritePerformed: false,
      publicationApprovalGranted: false,
    },
  } as const;
}
