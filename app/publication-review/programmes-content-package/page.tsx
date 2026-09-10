import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { approvalManifest, decisionLabels } from "@/app/data/publication-approval";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { programmeClaimRecordIds } from "@/lib/programmes-content-package";

import { ProgrammesContentPackageForm } from "./programmes-content-package-form";

import "../review.css";
import "./workspace.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Programmes Content Package",
  description: "Private management worksheet for SSKEMS Senior Secondary, Junior College and JEE/NEET programme facts.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ProgrammesContentPackagePage() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/programmes-content-package");

  const governedClaims = programmeClaimRecordIds.map((recordId) => {
    const record = approvalManifest.records.find((candidate) => candidate.id === recordId);
    if (!record) notFound();
    return { id: record.id, title: record.title, decision: decisionLabels[record.decision] };
  });

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="publication-review-page programmes-package-page">
        <header className="review-hero">
          <PageContainer className="review-hero__grid">
            <div>
              <p className="eyebrow">Authenticated management workspace</p>
              <h1>Programmes content package</h1>
              <p className="lead">Confirm the institutional model and exact public facts for Classes XI-XII, Junior College and JEE/NEET before any route or claim is activated.</p>
            </div>
            <aside className="review-hero__status" aria-label="Programmes package status">
              <span>Governed claim records</span>
              <strong>{governedClaims.length}</strong>
              <p>All remain subject to their independent publication approvals.</p>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <nav className="programmes-package-toolbar" aria-label="Programmes content package navigation">
            <Link href="/publication-review">Back to approval queue</Link>
            <Link href="/publication-review/programmes-workbook-intake">Review workbook preflight</Link>
            <Link href="/publication-review/programmes-contract-v1-1">Review contract v1.1 draft</Link>
            <Link href="/junior-college">View current pending pathway</Link>
          </nav>

          <section className="review-safety programmes-package-boundary" aria-labelledby="programmes-package-boundary-title">
            <div>
              <p className="eyebrow">Decision boundary</p>
              <h2 id="programmes-package-boundary-title">Approved facts in; no automatic publication out.</h2>
            </div>
            <p>The worksheet runs in the browser and downloads one JSON handoff. It sends no form data to the server, stores no evidence, changes no approval record and activates no navigation, media, document or public page.</p>
          </section>

          <section className="programmes-package-sequence" aria-labelledby="programmes-package-sequence-title">
            <div>
              <p className="eyebrow">Correct operating order</p>
              <h2 id="programmes-package-sequence-title">Verify structure, approve wording, then plan implementation.</h2>
            </div>
            <ol>
              <li>Confirm whether CBSE Senior Secondary, a separate Junior College, both or neither are current.</li>
              <li>Approve programme, admission, fee and JEE/NEET facts against controlled records.</li>
              <li>Choose public claims, requested media and navigation placement.</li>
              <li>Download the package and retain it in the controlled system for implementation review.</li>
            </ol>
          </section>

          <section className="programmes-package-claims" aria-labelledby="programmes-package-claims-title">
            <div>
              <p className="eyebrow">Existing publication gates</p>
              <h2 id="programmes-package-claims-title">The package does not replace these decisions.</h2>
            </div>
            <ul>
              {governedClaims.map((record) => (
                <li key={record.id}><span>{record.title}</span><strong>{record.decision}</strong><code>{record.id}</code></li>
              ))}
            </ul>
          </section>

          <ProgrammesContentPackageForm />

          <section className="programmes-package-next" aria-labelledby="programmes-package-next-title">
            <div>
              <p className="eyebrow">After download</p>
              <h2 id="programmes-package-next-title">Review the exact package before building public programme pages.</h2>
            </div>
            <p>Keep the JSON and referenced evidence in the controlled system. The later implementation must recheck the academic year, claim approvals, document approvals, media approvals and route placement before changing public content.</p>
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
