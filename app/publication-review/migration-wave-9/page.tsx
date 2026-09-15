import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { legacyMigrationWave9 } from "@/app/data/legacy-migration-wave-9";
import { MigrationWaveWorkspace } from "@/app/publication-review/migration-wave-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 9",
  description: "Private SSKEMS decision packet for institutional-model and evidence-sensitive gallery routes.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyMigrationWave9Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-9");

  return <MigrationWaveWorkspace
    cohortDescription="Two historic gallery-index records that require institutional-model and evidence review in addition to the standard media checks."
    cohortEyebrow="Bounded ninth cohort"
    cohortHeading="Resolve two institutional gallery routes."
    introduction="Review two public gallery-index records whose route treatments and content futures remain undecided. ‘5th Foundation day Celebration at SSKEMS’ does not establish the relevant regulatory entity, anniversary basis, event date or organiser. ‘Institute’ does not establish a legal operator, programme scope, enrolment or fee relationship, awarding authority, or a relationship with the CBSE School or Maharashtra Junior College. Institutional-model and evidence review happen in the controlled system; this worksheet only records route and content intent and cannot perform, approve or replace those checks. No claim, identity, title, destination, merge or content decision is preselected. The matrix classification identityProtected: false does not prove that an image contains no child or that consent and rights exist. This packet contains no supporting documents or private evidence locations, does not retrieve or display underlying gallery content, and does not import, copy, approve, activate, transform or publish media, captions, identities, evidence, consent, rights metadata, derivatives or archived copy; it cannot validate institutional or event claims or permit public release."
    relatedWaves={[
      { href: "/publication-review/migration-wave-8", label: "Return to Wave 8" },
      { href: "/publication-review/migration-wave-10", label: "Continue to Wave 10" },
    ]}
    routeBase="/publication-review/migration-wave-9"
    routeSummaryNote="Both routes require explicit treatments and content decisions after separate institutional-model and evidence review."
    sequenceInstruction="Start from the combined Wave 8 master. This validator refuses to merge Wave 9 until all sixty earlier decisions are present and valid."
    wave={legacyMigrationWave9}
    waveNumber={9}
  />;
}
