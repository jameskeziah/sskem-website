import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { legacyMigrationWave10 } from "@/app/data/legacy-migration-wave-10";
import { MigrationWaveWorkspace } from "@/app/publication-review/migration-wave-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 10",
  description: "Private SSKEMS identity, role and evidence review packet for named-visitor gallery routes.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyMigrationWave10Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-10");

  return <MigrationWaveWorkspace
    cohortDescription="Two historic gallery-index records whose labels identify or describe visitors and therefore require identity, role, event-evidence, rights, privacy and retention review."
    cohortEyebrow="Bounded tenth cohort"
    cohortHeading="Resolve two named-visitor gallery routes."
    introduction="Review two public gallery-index records whose route treatments and content futures remain undecided. ‘Deputy collector (khed) visit to SSKEMS’ does not prove the visitor’s identity, exact office, jurisdiction, official capacity, event date, purpose or authority to reuse photographs. ‘Dr. Sonawane (Dervan) Visit to SSKEMS’ does not establish a full identity, professional title or credentials, organisation, event purpose, date or any endorsement relationship. A legacy label is not evidence and must not be used to imply a current role, partnership, recommendation or endorsement. Verify identity, role at the time of the event, spelling, event context and publication rights only in the controlled system. No identity, title, role, claim, route, destination, merge or content decision is preselected. The matrix classification identityProtected: false does not prove that an image contains no child or that consent and rights exist. This packet contains no supporting documents or private evidence locations, does not retrieve or display underlying gallery content, and does not import, copy, approve, activate, transform or publish media, captions, identities, evidence, consent records, rights metadata, derivatives or archived copy; it cannot validate a visitor or event claim or permit public release."
    relatedWaves={[
      { href: "/publication-review/migration-wave-9", label: "Return to Wave 9" },
      { href: "/publication-review/migration-wave-11", label: "Continue to Wave 11" },
    ]}
    routeBase="/publication-review/migration-wave-10"
    routeSummaryNote="Both routes require explicit treatments and content decisions after separate identity, role and event-evidence review."
    sequenceInstruction="Start from the combined Wave 9 master. This validator refuses to merge Wave 10 until all sixty-two earlier decisions are present and valid."
    wave={legacyMigrationWave10}
    waveNumber={10}
  />;
}
