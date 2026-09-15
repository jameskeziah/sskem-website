import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { legacyMigrationWave8 } from "@/app/data/legacy-migration-wave-8";
import { MigrationWaveWorkspace } from "@/app/publication-review/migration-wave-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 8",
  description: "Private SSKEMS clarification packet for ambiguous legacy gallery labels.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyMigrationWave8Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-8");

  return <MigrationWaveWorkspace
    cohortDescription="Two historic gallery-index records whose legacy labels are too ambiguous to interpret safely."
    cohortEyebrow="Bounded eighth cohort"
    cohortHeading="Clarify two ambiguous gallery routes."
    introduction="Review two public gallery-index records whose route treatments and content futures remain undecided. ‘Bondla Activity’ does not establish the activity, venue, participants, date or purpose. The commemoration label appears to conflate A. P. J. Abdul Kalam with Abul Kalam Azad, so this packet preserves the canonical wording only as unverified legacy metadata and does not correct or identify the person. No title, destination, merge or content decision is preselected. The matrix classification identityProtected: false does not prove that an image contains no child or that consent and rights exist. This packet does not retrieve or display underlying gallery content, and does not import, copy, approve, activate, transform or publish image or video bytes, captions, identities, consent, rights evidence, asset metadata, derivatives or archived copy; it cannot validate event claims or permit public release."
    relatedWaves={[
      { href: "/publication-review/migration-wave-7", label: "Return to Wave 7" },
    ]}
    routeBase="/publication-review/migration-wave-8"
    routeSummaryNote="Both routes require explicit treatments, clarified source context and content decisions."
    sequenceInstruction="Start from the combined Wave 7 master. This validator refuses to merge Wave 8 until all fifty-eight earlier decisions are present and valid."
    wave={legacyMigrationWave8}
    waveNumber={8}
  />;
}
