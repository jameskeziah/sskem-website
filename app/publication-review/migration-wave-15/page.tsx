import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { legacyMigrationWave15 } from "@/app/data/legacy-migration-wave-15";
import { MigrationWaveWorkspace } from "@/app/publication-review/migration-wave-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 15",
  description: "Private SSKEMS provenance and route-decision packet for two related Open School legacy posts.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyMigrationWave15Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-15");

  return <MigrationWaveWorkspace
    cohortDescription="Two public 2017 WordPress post records with related Open School labels. Each requires provenance, institutional-relevance, route and content review."
    cohortEyebrow="Bounded fifteenth cohort"
    cohortHeading="Resolve two Open School legacy post routes."
    introduction="Review two public legacy post records whose route treatments and content futures remain undecided. Their labels and paths are observed archive metadata, not proof that SSKEMS authored the material, operated or belonged to an organisation called Open School, maintained an institute under that name, endorsed a third party, or offered a programme, pedagogy, affiliation or service described by the posts. The records may be old theme or demonstration content; archive presence and historic public availability do not establish school relevance, provenance, accuracy, ownership, rights or current approval. Preserve ‘Open School’s Institut’ and ‘Open School’s Institut Constructivism’ as immutable source labels. Do not silently correct ‘Institut’, expand the titles, infer that ‘Constructivism’ describes SSKEMS teaching practice, or merge the records solely because their labels are similar. Verify both controlled sources, their authorship, dates, intended subjects, links, media and relationship before choosing any treatment. These records do not establish a relationship with the current CBSE School, Junior College, Shree Samarth Krupa Institute, JEE/NEET programme or any other institutional entity. Do not redirect or merge them into `/institute`, `/programmes/jee-neet`, About, Academics or News merely to avoid a 404; any target must be semantically equivalent and supported by current approved information. Decide explicitly whether each route should be retained, redirected, archived, retired or kept private, and separately whether its post record should migrate, be rewritten, merged, archived, redirect only or retired. No route, destination, merge, corrected title, institutional relationship, pedagogy claim, canonical or noindex treatment, or content decision is preselected. This packet contains no post bodies, excerpts, author or user records, programme descriptions, teaching-method claims, links, media, captions, comments, supporting evidence, private locations or archived copy; it does not retrieve, display, import, copy, approve, activate, transform or publish any of them. Any underlying identities or assets remain subject to separate evidence, privacy, consent and rights review."
    relatedWaves={[
      { href: "/publication-review/migration-wave-14", label: "Return to Wave 14" },
    ]}
    routeBase="/publication-review/migration-wave-15"
    routeSummaryNote="Both routes require explicit treatments and content decisions after source provenance and institutional-relevance review."
    sequenceInstruction="Start from the combined Wave 14 master. This validator refuses to merge Wave 15 until all seventy-nine earlier decisions are present and valid."
    wave={legacyMigrationWave15}
    waveNumber={15}
  />;
}
