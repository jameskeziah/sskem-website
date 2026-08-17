import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { verifyCampusMediaBindingArtifacts } from "../lib/campus-media-activation.ts";
import {
  campusMediaPublicationRegistry,
  createCampusMediaBindingProposal,
  validateCampusMediaPublicationRegistry,
} from "../lib/campus-media-publication.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const publicRoot = path.resolve(projectRoot, "public", "media", "home", "production");
const issues = validateCampusMediaPublicationRegistry();

function withinDirectory(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

if (!issues.length && Array.isArray(campusMediaPublicationRegistry.bindings)) {
  for (const binding of campusMediaPublicationRegistry.bindings) {
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
}

if (issues.length) {
  console.error(`Campus media publication audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  const count = Array.isArray(campusMediaPublicationRegistry.bindings) ? campusMediaPublicationRegistry.bindings.length : 0;
  console.log(`Campus media publication audit passed: ${count} exact derivative binding(s).`);
}
