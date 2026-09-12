import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { legacyMigrationWave4 } from "@/app/data/legacy-migration-wave-4";
import { MigrationWaveWorkspace } from "@/app/publication-review/migration-wave-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 4",
  description: "Private SSKEMS decision packet for media and gallery index-page migration.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyMigrationWave4Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-4");

  return <MigrationWaveWorkspace
    cohortDescription="Achievements, Gallery 2020 through Gallery 2026, the Media landing page and the Fit India Movement 2020 video page."
    cohortEyebrow="Bounded fourth cohort"
    cohortHeading="Decide the future of media index pages."
    introduction="Review ten public page records whose destinations are already mapped. A page decision does not import or approve photographs, videos, captions, pupil identities, achievement claims, consent records, rights evidence or archival copy."
    relatedWaves={[
      { href: "/publication-review/migration-wave-3", label: "Return to Wave 3" },
      { href: "/publication-review/migration-wave-5", label: "Continue to Wave 5" },
    ]}
    routeBase="/publication-review/migration-wave-4"
    routeSummaryNote="All ten routes already have controlled destinations."
    sequenceInstruction="Start from the combined Wave 3 master. This validator refuses to merge Wave 4 until all twenty-six earlier decisions are present and valid."
    wave={legacyMigrationWave4}
    waveNumber={4}
  />;
}
