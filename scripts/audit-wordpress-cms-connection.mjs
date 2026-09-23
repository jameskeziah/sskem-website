import { getWordPressCmsInventory } from "../lib/cms/wordpress-rest.server.ts";

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

const origin = argument("origin") ?? process.env.WORDPRESS_CMS_ORIGIN ?? "";
const inventory = await getWordPressCmsInventory({
  env: { WORDPRESS_CMS_ORIGIN: origin },
});

const result = {
  source: inventory.status.source,
  status: inventory.status.reason === "review-ready" ? "ready" : "blocked",
  reason: inventory.status.reason,
  origin: inventory.origin,
  collections: inventory.collections,
  reviewCandidates: inventory.status.reviewCandidates,
  publicAccepted: inventory.status.publicAccepted,
  rejected: inventory.status.rejected,
  sampleSlugs: inventory.candidates.slice(0, 12).map((candidate) => ({
    collection: candidate.collection,
    slug: candidate.slug,
    modifiedGmt: candidate.modifiedGmt,
    fingerprintSha256: candidate.fingerprintSha256,
  })),
  safeguards: inventory.policy,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== "ready") process.exitCode = 1;
