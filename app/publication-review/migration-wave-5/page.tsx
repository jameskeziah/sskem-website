import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { legacyMigrationWave5 } from "@/app/data/legacy-migration-wave-5";
import { MigrationWaveWorkspace } from "@/app/publication-review/migration-wave-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 5",
  description: "Private SSKEMS decision packet for unresolved historic media-page routes.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyMigrationWave5Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-5");

  return <MigrationWaveWorkspace
    cohortDescription="Gallery 2016 through Gallery 2019 and the Electronic Media page."
    cohortEyebrow="Bounded fifth cohort"
    cohortHeading="Decide five unresolved historic media routes."
    introduction="Review five public historical media-page records whose route treatments and content futures remain undecided. No destination is preselected. A page or route decision does not import or approve photographs, videos, captions, names, pupil identities, achievement claims, consent records, rights evidence or archival copy, and cannot authorize an asset or public release."
    relatedWaves={[
      { href: "/publication-review/migration-wave-4", label: "Return to Wave 4" },
    ]}
    routeBase="/publication-review/migration-wave-5"
    routeSummaryNote="All five routes require an explicit treatment as well as a content decision."
    sequenceInstruction="Start from the combined Wave 4 master. This validator refuses to merge Wave 5 until all thirty-six earlier decisions are present and valid."
    wave={legacyMigrationWave5}
    waveNumber={5}
  />;
}
