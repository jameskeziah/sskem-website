import { verifyHomepageAchievementBindingArtifact } from "./homepage-achievement-activation.ts";
import {
  homepageAchievementPublicationRegistry,
  validateHomepageAchievementPublicationRegistry,
} from "./homepage-achievement-publication.ts";

export async function auditHomepageAchievementPublicationArtifacts(options = {}) {
  const registry = options.registry ?? homepageAchievementPublicationRegistry;
  const issues = validateHomepageAchievementPublicationRegistry({
    registry,
    manifest: options.manifest,
    now: options.now,
  });
  if (issues.length || !Array.isArray(registry.bindings)) return issues;
  for (const binding of registry.bindings) {
    issues.push(...await verifyHomepageAchievementBindingArtifact({ binding, assetRoot: options.assetRoot }));
  }
  return issues;
}
