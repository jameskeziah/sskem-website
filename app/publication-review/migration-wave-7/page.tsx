import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { legacyMigrationWave7 } from "@/app/data/legacy-migration-wave-7";
import { MigrationWaveWorkspace } from "@/app/publication-review/migration-wave-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 7",
  description: "Private SSKEMS decision packet for repeated cultural and community gallery routes.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyMigrationWave7Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-7");

  return <MigrationWaveWorkspace
    cohortDescription="Five historic cultural and community gallery-index records with one uniform eight-review contract."
    cohortEyebrow="Bounded seventh cohort"
    cohortHeading="Decide five related gallery routes."
    introduction="Review five public gallery-index records whose route treatments and content futures remain undecided. Two Matru-Pitru and two Shiv Jayanti titles appear similar, but this packet does not assume that their events or assets are duplicates. No destination is preselected. The matrix classification identityProtected: false does not prove that an image contains no child or that consent and rights exist. This packet displays only unverified legacy index metadata. It does not retrieve or display underlying gallery content, and does not import, copy, approve, activate, transform or publish image or video bytes, captions, identities, consent, rights evidence, asset metadata, derivatives or archived copy; it cannot validate event claims, infer an individual's beliefs or permit public release."
    relatedWaves={[
      { href: "/publication-review/migration-wave-6", label: "Return to Wave 6" },
    ]}
    routeBase="/publication-review/migration-wave-7"
    routeSummaryNote="All five routes require explicit treatments and content decisions."
    sequenceInstruction="Start from the combined Wave 6 master. This validator refuses to merge Wave 7 until all fifty-three earlier decisions are present and valid."
    wave={legacyMigrationWave7}
    waveNumber={7}
  />;
}
