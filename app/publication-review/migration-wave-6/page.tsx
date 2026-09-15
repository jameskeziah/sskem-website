import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { legacyMigrationWave6 } from "@/app/data/legacy-migration-wave-6";
import { MigrationWaveWorkspace } from "@/app/publication-review/migration-wave-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 6",
  description: "Private SSKEMS decision packet for historic celebration gallery records.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyMigrationWave6Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-6");

  return <MigrationWaveWorkspace
    cohortDescription="Twelve historic cultural, civic and school-celebration gallery records with one uniform eight-review contract."
    cohortEyebrow="Bounded sixth cohort"
    cohortHeading="Decide the future of twelve celebration galleries."
    introduction="Review twelve public gallery-index records whose route treatments and content futures remain undecided. No destination is preselected. The matrix classification identityProtected: false does not prove that an image contains no child or that consent and rights exist. This packet displays only unverified legacy index metadata. It does not retrieve or display underlying gallery content, and does not import, copy, approve, activate, transform or publish image or video bytes, captions, identities, consent, rights evidence, asset metadata, derivatives or archived copy; it cannot validate event claims, infer an individual's beliefs or permit public release."
    relatedWaves={[
      { href: "/publication-review/migration-wave-5", label: "Return to Wave 5" },
      { href: "/publication-review/migration-wave-7", label: "Continue to Wave 7" },
    ]}
    routeBase="/publication-review/migration-wave-6"
    routeSummaryNote="All twelve routes require explicit treatments and content decisions."
    sequenceInstruction="Start from the combined Wave 5 master. This validator refuses to merge Wave 6 until all forty-one earlier decisions are present and valid."
    wave={legacyMigrationWave6}
    waveNumber={6}
  />;
}
