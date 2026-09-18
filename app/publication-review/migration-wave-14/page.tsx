import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { legacyMigrationWave14 } from "@/app/data/legacy-migration-wave-14";
import { MigrationWaveWorkspace } from "@/app/publication-review/migration-wave-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 14",
  description: "Private SSKEMS route and content-decision packet for three legacy meal-themed news posts.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyMigrationWave14Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-14");

  return <MigrationWaveWorkspace
    cohortDescription="Three public 2017 WordPress post records with meal-themed labels and one title-to-slug mismatch. Each needs an explicit route treatment and content decision."
    cohortEyebrow="Bounded fourteenth cohort"
    cohortHeading="Resolve three meal-themed legacy post routes."
    introduction="Review three public legacy post records whose route treatments and content futures remain undecided. Their labels and slugs are observed archive metadata, not proof that the school authored the material, served the named food, operated a meal or nutrition programme, published a menu, or intends to make any current dietary, ingredient, allergen, nutrition, health or food-safety claim. The records may be old theme or demonstration content; archive presence alone does not establish school relevance, provenance, accuracy, ownership or publication rights. One record labelled ‘Lunch with Sandwich’ uses a cinnamon-pancakes legacy slug. Preserve that mismatch as immutable binding metadata and verify the controlled source before deciding whether the records are distinct, duplicated or unrelated. Preserve ‘Sesame butterflied Chicken’ as the bound source label; any corrected public title requires an evidence-backed rewrite rather than a silent metadata change. Do not silently correct, merge or redirect these records from their labels or slugs alone. The Wave 13 `/category/lunch` index decision does not decide, approve or publish these posts, and decisions here do not decide the category route or its membership. Decide explicitly whether each route should be retained, redirected, archived, retired or kept private, and separately whether its post record should migrate, be rewritten, merged, archived, redirect only or retired. Do not redirect to Home, News or another generic page merely to avoid a 404; any target must be semantically equivalent and supported by the final information architecture. No route, destination, merge, corrected title, school attribution, meal claim, canonical or noindex treatment, or content decision is preselected. This packet contains no post bodies, excerpts, author or user records, recipes, ingredient or allergen details, nutrition information, comments, embedded links, media, captions, supporting evidence, private locations or archived copy; it does not retrieve, display, import, copy, approve, activate, transform or publish any of them. Any underlying identities or assets remain subject to separate evidence, privacy, consent and rights review."
    relatedWaves={[
      { href: "/publication-review/migration-wave-13", label: "Return to Wave 13" },
      { href: "/publication-review/migration-wave-15", label: "Continue to Wave 15" },
    ]}
    routeBase="/publication-review/migration-wave-14"
    routeSummaryNote="All three routes require explicit treatments and content decisions after provenance, relevance and exact semantic-equivalence review."
    sequenceInstruction="Start from the combined Wave 13 master. This validator refuses to merge Wave 14 until all seventy-six earlier decisions are present and valid."
    wave={legacyMigrationWave14}
    waveNumber={14}
  />;
}
