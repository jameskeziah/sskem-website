import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { legacyMigrationWave1 } from "@/app/data/legacy-migration-wave-1";
import { MigrationWaveWorkspace } from "@/app/publication-review/migration-wave-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 1",
  description: "Private SSKEMS decision packet for the first core-information migration wave.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyMigrationWave1Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-1");

  return <MigrationWaveWorkspace
    cohortDescription="Homepage, school overview, vision, facilities, clubs, uniform guidance, admissions guidance, enrolment and contact."
    cohortEyebrow="Bounded first cohort"
    cohortHeading="Start with the information families use first."
    introduction="Review ten high-value public pages without mixing in galleries, results, staff identities, fees, notices or regulatory documents."
    relatedWave={{ href: "/publication-review/migration-wave-2", label: "Continue to Wave 2" }}
    routeBase="/publication-review/migration-wave-1"
    routeSummaryNote="About Us still needs a route treatment."
    sequenceInstruction="Use the browser-only validator above to merge these ten rows into a current full worksheet; the authoritative intake still requires all 115 decisions before recording."
    wave={legacyMigrationWave1}
    waveNumber={1}
  />;
}
