import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { legacyMigrationWave13 } from "@/app/data/legacy-migration-wave-13";
import { MigrationWaveWorkspace } from "@/app/publication-review/migration-wave-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 13",
  description: "Private SSKEMS route and content-decision packet for legacy category and post-format archive indexes.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyMigrationWave13Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-13");

  return <MigrationWaveWorkspace
    cohortDescription="Five structural archive-index records: four legacy categories and one WordPress post-format route. Each needs an explicit route treatment and content decision."
    cohortEyebrow="Bounded thirteenth cohort"
    cohortHeading="Resolve five legacy taxonomy archive routes."
    introduction="Review four legacy category indexes and one image post-format index whose route treatments and content futures remain undecided. A category or post-format label is observed archive metadata, not approved navigation, a current editorial taxonomy, an SEO destination, an endorsement of the archived grouping, or proof that any linked post should be migrated. A decision for an archive index does not decide, approve, merge, rewrite or publish any child post. ‘Activities 2016’ is a historic label, not proof that its collection is complete, correctly dated or suitable as current content. ‘Lunch’ does not establish a current meal, menu or nutrition programme. ‘School life’ is not automatically equivalent to the new Student Life section. ‘Uncategorized’ is a WordPress fallback classification and must not automatically become a public destination. The ‘Not Found’ label at /type/image is response-derived legacy metadata; it does not establish a meaningful title, active post-format archive, image collection or navigation item, nor prove that the route lacks links, traffic or migration value. Verify archived membership, the intended current taxonomy, internal and external links, indexed URLs, traffic or search evidence where available, and exact semantic equivalence before selecting a treatment. Do not redirect to Home or another generic page merely to avoid a 404. Decide explicitly whether each route should be retained, redirected, archived, retired or kept private, and separately whether its index record should migrate, be rewritten, merged, archived, redirect only or retired. Any redirect or merge target must reflect the final information architecture and must not silently approve the underlying posts. No route, destination, merge, taxonomy name, canonical or noindex treatment, or content decision is preselected. This packet contains no term descriptions or assignments, post bodies, excerpts, author or user records, linked-media inventory, captions, source files, supporting evidence, private locations or archived copy; it does not retrieve, display, import, copy, approve, activate, transform or publish any of them. All child posts and assets remain undecided and require their own bounded review. Historic public availability does not establish currency, accuracy, ownership, rights or current publication approval."
    relatedWaves={[
      { href: "/publication-review/migration-wave-12", label: "Return to Wave 12" },
      { href: "/publication-review/migration-wave-14", label: "Continue to Wave 14" },
    ]}
    routeBase="/publication-review/migration-wave-13"
    routeSummaryNote="All five structural index routes require explicit route and content decisions; those decisions do not approve any linked post or asset."
    sequenceInstruction="Start from the combined Wave 12 master. This validator refuses to merge Wave 13 until all seventy-one earlier decisions are present and valid."
    wave={legacyMigrationWave13}
    waveNumber={13}
  />;
}
