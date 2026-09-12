import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { legacyMigrationWave2 } from "@/app/data/legacy-migration-wave-2";
import { MigrationWaveWorkspace } from "@/app/publication-review/migration-wave-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 2",
  description: "Private SSKEMS decision packet for leadership, governance and service-page migration.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyMigrationWave2Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-2");

  return <MigrationWaveWorkspace
    cohortDescription="Chairman, president and principal messages; board and school-management governance; admission, registration and transfer-certificate service pages."
    cohortEyebrow="Bounded second cohort"
    cohortHeading="Resolve stewardship and service pages next."
    introduction="Review eight high-risk public pages whose destinations are already mapped, while keeping leadership identities, portraits, form data and source copy outside this repository."
    relatedWaves={[
      { href: "/publication-review/migration-wave-1", label: "Return to Wave 1" },
      { href: "/publication-review/migration-wave-3", label: "Continue to Wave 3" },
    ]}
    routeBase="/publication-review/migration-wave-2"
    routeSummaryNote="All eight routes already have controlled destinations."
    sequenceInstruction="Start from the combined Wave 1 master. This validator refuses to merge Wave 2 until all ten prior-wave decisions are present and valid."
    wave={legacyMigrationWave2}
    waveNumber={2}
  />;
}
