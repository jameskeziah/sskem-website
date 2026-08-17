import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { verifyCampusMediaBindingArtifacts } from "./campus-media-activation.ts";
import {
  campusMediaPublicationRegistry,
  createCampusMediaBindingProposal,
  validateCampusMediaPublicationRegistry,
} from "./campus-media-publication.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const defaultPublicRoot = path.resolve(projectRoot, "public", "media", "home", "production");

function withinDirectory(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export async function auditCampusMediaPublicationArtifacts(options = {}) {
  const registry = options.registry ?? campusMediaPublicationRegistry;
  const publicRoot = path.resolve(options.publicRoot ?? defaultPublicRoot);
  const issues = validateCampusMediaPublicationRegistry({ registry, manifest: options.manifest, now: options.now });
  if (issues.length || !Array.isArray(registry.bindings)) return issues;

  for (const binding of registry.bindings) {
    const outputDirectory = path.resolve(publicRoot, binding.recordId);
    if (!withinDirectory(outputDirectory, publicRoot)) {
      issues.push(`${binding.recordId} resolves outside the production media root.`);
      continue;
    }
    let receipt;
    try {
      receipt = JSON.parse(await readFile(path.join(outputDirectory, "intake-receipt.json"), "utf8"));
    } catch {
      issues.push(`${binding.recordId} is missing its exact public intake receipt.`);
      continue;
    }
    try {
      const proposal = createCampusMediaBindingProposal(receipt);
      if (!isDeepStrictEqual(proposal, binding)) issues.push(`${binding.recordId} does not exactly match its public intake receipt.`);
    } catch (error) {
      issues.push(error instanceof Error ? error.message : `${binding.recordId} has an invalid public receipt.`);
      continue;
    }
    issues.push(...await verifyCampusMediaBindingArtifacts({ binding, publicRoot }));
  }
  return issues;
}
