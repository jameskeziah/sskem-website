import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { legacyMigrationWave3 } from "@/app/data/legacy-migration-wave-3";
import { MigrationWaveWorkspace } from "@/app/publication-review/migration-wave-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 3",
  description: "Private SSKEMS decision packet for academic, eligibility and compliance-record migration.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyMigrationWave3Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-3");

  return <MigrationWaveWorkspace
    cohortDescription="Academic calendar, competitive-exam overview, faculty landing page, tentative timetable, age rule, OASIS, SARAS and school-information records."
    cohortEyebrow="Bounded third cohort"
    cohortHeading="Resolve current academic and compliance records."
    introduction="Review eight high-risk public pages whose destinations are already mapped, without importing old schedules, eligibility rules, faculty identities, documents or affiliation claims."
    relatedWaves={[
      { href: "/publication-review/migration-wave-2", label: "Return to Wave 2" },
    ]}
    routeBase="/publication-review/migration-wave-3"
    routeSummaryNote="All eight routes already have controlled destinations."
    sequenceInstruction="Start from the combined Wave 2 master. This validator refuses to merge Wave 3 until all eighteen earlier decisions are present and valid."
    wave={legacyMigrationWave3}
    waveNumber={3}
  />;
}
