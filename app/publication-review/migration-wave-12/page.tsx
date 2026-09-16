import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { legacyMigrationWave12 } from "@/app/data/legacy-migration-wave-12";
import { MigrationWaveWorkspace } from "@/app/publication-review/migration-wave-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 12",
  description: "Private SSKEMS health-event privacy, evidence, consent and retention review packet for student-health gallery routes.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyMigrationWave12Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-12");

  return <MigrationWaveWorkspace
    cohortDescription="Two historic gallery-index records whose labels concern student health activity and therefore require evidence, data-protection, consent, rights, privacy and retention review."
    cohortEyebrow="Bounded twelfth cohort"
    cohortHeading="Resolve two student-health event gallery routes."
    introduction="Review two public gallery-index records whose route treatments and content futures remain undecided. A legacy event label is unverified index metadata: it does not prove that a health service occurred as described, who organised or delivered it, the date or location, the applicable authority, the eligible group, the service scope, or that any pupil received an examination, treatment or vaccination. The legacy age range is historical event metadata, not current vaccination eligibility or public-health guidance. Images of pupils in a healthcare context may reveal sensitive personal or health information even when no medical record is shown. Do not infer a pupil's attendance, health or vaccination status, eligibility, diagnosis, treatment, disability or medical history from a photograph. Health-checkup wording does not establish provider credentials, screening performed, findings, diagnosis, treatment, outcome or recommendation; vaccination wording does not establish vaccine type, dose, disease, uptake, completion, safety, efficacy or current immunisation status. Verify the event facts, provider and institutional authority, safeguarding purpose, minimum necessary aggregate public wording, purpose-specific guardian consent for minors or data-subject consent where applicable, pupil assent where appropriate, photographer and provider rights, approved captions, withdrawal handling, and a retention end date only in the controlled system. Consent to receive a health service is not consent to publish a pupil's identity, image or participation. Any later publication should prefer aggregate event-level copy and non-identifying media. Historic public availability or attendance is not current consent. No health claim, provider identity, route, destination, merge or content decision is preselected. The matrix classification identityProtected: false does not prove that an image contains no child or sensitive data, or that consent and rights exist. This packet contains no pupil names, dates of birth, classes, admission or roll identifiers, attendance lists, patient or vaccination status, measurements, diagnoses, clinical findings, test or treatment details, guardian contact details, registration or consent forms, certificates, clinical records, supporting evidence, private locations, asset metadata or source media; it does not retrieve, display, import, copy, approve, activate, transform or publish them. Every eventual asset and caption still requires separate health-event evidence and media approval, exact-byte binding and activation before public release. If evidence, consent, minimisation or retention requirements are missing, expired or withdrawn, the content remains unpublished; archive, retire, redirect-only or private-only remain available route or content treatments but none is preselected."
    relatedWaves={[
      { href: "/publication-review/migration-wave-11", label: "Return to Wave 11" },
      { href: "/publication-review/migration-wave-13", label: "Continue to Wave 13" },
    ]}
    routeBase="/publication-review/migration-wave-12"
    routeSummaryNote="Both routes require explicit treatments and content decisions after separate health-event evidence, consent and data-protection review."
    sequenceInstruction="Start from the combined Wave 11 master. This validator refuses to merge Wave 12 until all sixty-nine earlier decisions are present and valid."
    wave={legacyMigrationWave12}
    waveNumber={12}
  />;
}
