import { access, readFile } from "node:fs/promises";

const projectRoot = new URL("../", import.meta.url);
const privateReviewMode = process.env.HOMEPAGE_REVIEW_MODE === "private";
const reviewAssetPaths = [
  "public/media/home/class-x-results-2025-26.jpeg",
  "public/media/home/xii-science-2025-26.jpeg",
  "public/media/home/rangotsav-2025-26.jpeg",
  "public/media/home/result-and-admissions-2025-26.jpg",
];

async function exists(path) {
  try {
    await access(new URL(path, projectRoot));
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

const [achievementMotion, homepage, assetChecks] = await Promise.all([
  readFile(new URL("components/motion/home-achievements-motion.tsx", projectRoot), "utf8"),
  readFile(new URL("app/page.tsx", projectRoot), "utf8"),
  Promise.all(reviewAssetPaths.map(async (path) => ({ path, exists: await exists(path) }))),
]);

const presentAssets = assetChecks.filter((asset) => asset.exists).map((asset) => asset.path);
const requiresReview =
  achievementMotion.includes('data-publication-review="required"') ||
  homepage.includes("These supplied creatives are staged for private review") ||
  presentAssets.length > 0;

if (!requiresReview) {
  process.stdout.write("Homepage publication gate: no review-required artwork detected.\n");
} else if (privateReviewMode) {
  process.stdout.write(
    `Homepage publication gate: private-review build acknowledged (${presentAssets.length} protected assets).\n`,
  );
} else {
  const listedAssets = presentAssets.length
    ? `\nDetected review assets:\n- ${presentAssets.join("\n- ")}`
    : "";
  throw new Error(
    [
      "Public build blocked: the homepage still contains pupil artwork marked for publication review.",
      "The visible approval message is not access control.",
      "Use `npm run build:review` only for an access-controlled private review.",
      "For public release, complete the approval register and remove the review requirement through an intentional code change.",
      listedAssets,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}
