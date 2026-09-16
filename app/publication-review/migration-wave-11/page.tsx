import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { legacyMigrationWave11 } from "@/app/data/legacy-migration-wave-11";
import { MigrationWaveWorkspace } from "@/app/publication-review/migration-wave-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 11",
  description: "Private SSKEMS evidence, consent and data-protection review packet for pupil achievement and result gallery routes.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyMigrationWave11Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-11");

  return <MigrationWaveWorkspace
    cohortDescription="Five historic gallery-index records whose labels concern pupils, achievements, felicitation or results and therefore require evidence, data-protection, consent, rights, privacy and retention review."
    cohortEyebrow="Bounded eleventh cohort"
    cohortHeading="Resolve five pupil achievement and result gallery routes."
    introduction="Review five public gallery-index records whose route treatments and content futures remain undecided. A legacy label is unverified index metadata, not result evidence, and earlier public availability is not current guardian consent. The records do not prove a pupil's identity or spelling, class or academic year, exam or award body, stage or level, rank or score, outcome, institutional attribution, endorsement, current standing or continuing permission to publish. Verify authoritative result evidence, purpose-specific guardian consent for minors or data-subject consent where applicable, pupil assent where appropriate, media rights, approved public fields and captions, withdrawal handling, and a retention end date only in the controlled system. Do not silently correct legacy wording: immutable labels remain source metadata, while any public rewrite requires evidence and approval. No claim, title, route, destination, merge or content decision is preselected. The matrix classification identityProtected: false does not prove that an image contains no child or personal data, or that consent and rights exist. Historic publication, posters and certificates are not evidence of current consent. This packet contains no marksheets, certificates, pupil-level marks, roll numbers, guardian details, consent records, supporting evidence, private locations or source media; it does not retrieve, display, import, copy, approve, activate, transform or publish media, captions, identities, claims, evidence, consent, rights metadata, derivatives or archived copy. Every eventual asset and caption still requires separate evidence and media approval, exact-byte binding and activation before public release."
    relatedWaves={[
      { href: "/publication-review/migration-wave-10", label: "Return to Wave 10" },
      { href: "/publication-review/migration-wave-12", label: "Continue to Wave 12" },
    ]}
    routeBase="/publication-review/migration-wave-11"
    routeSummaryNote="All five routes require explicit treatments and content decisions after separate result-evidence, consent and data-protection review."
    sequenceInstruction="Start from the combined Wave 10 master. This validator refuses to merge Wave 11 until all sixty-four earlier decisions are present and valid."
    wave={legacyMigrationWave11}
    waveNumber={11}
  />;
}
