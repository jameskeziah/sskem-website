import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  admissionStatusExamples,
  admissionsCycle,
  admissionsFaq,
  ageRule,
  documentChecklist,
  officialAdmissionsSources,
  provisionalAgeBaselines,
} from "@/app/data/admissions";
import {
  AdmissionsPageFrame,
  AdmissionsReviewNotice,
  ProcessTimeline,
  VerificationValue,
} from "@/components/admissions";
import {
  AgeEligibilityChecker,
  ApplicationJourneyPrototype,
  EnquiryFormPrototype,
  StatusLookupPrototype,
  VisitRequestPrototype,
} from "@/components/admissions-forms";
import { ContactCard } from "@/components/content";
import { PageContainer } from "@/components/layout";
import { siteFacts } from "@/app/data/site";

const pageDetails = {
  process: {
    title: "Admission process",
    eyebrow: "Admissions · Parent journey",
    summary: "Eight visible stages separate an initial question from a formal, authorised admission decision.",
  },
  "age-criteria": {
    title: "Age criteria",
    eyebrow: "Admissions · Eligibility",
    summary: "Age guidance is generated from an approved Maharashtra rule record—not copied from an old page or typed as a permanent date range.",
  },
  enquire: {
    title: "Make an enquiry",
    eyebrow: "Admissions · First contact",
    summary: "A deliberately short first step for availability, fees, curriculum, transport, visits or accessibility questions.",
  },
  apply: {
    title: "Start an application",
    eyebrow: "Admissions · Formal application",
    summary: "Review the planned seven-step mobile application and the privacy and security gates required before it can accept real information.",
  },
  "application-status": {
    title: "Application status",
    eyebrow: "Admissions · Parent tracking",
    summary: "A parent-safe view of progress, actions and deadlines—protected by the application reference, registered mobile and a one-time password.",
  },
  "documents-required": {
    title: "Documents required",
    eyebrow: "Admissions · Conditional checklist",
    summary: "The documents depend on the class, admission category, previous board and transfer context. They are not required for a short enquiry.",
  },
  fees: {
    title: "Admission fees",
    eyebrow: "Admissions · Approved schedules",
    summary: "Fee information will be shown only with its academic year, approving authority, effective date and controlled public document.",
  },
  faq: {
    title: "Admissions FAQ",
    eyebrow: "Admissions · Quick answers",
    summary: "Plain-language answers about availability, age, documents, transfers, RTE and the review environment.",
  },
  contact: {
    title: "Contact admissions",
    eyebrow: "Admissions · Help",
    summary: "Use the verified general school channels while a dedicated admissions contact and service standard await approval.",
  },
  rte: {
    title: "RTE 25% admissions",
    eyebrow: "Admissions · Official Maharashtra process",
    summary: "The regular SSKEMS enquiry and application are not the official RTE application. Parents must use the Maharashtra Government process.",
  },
  "class-9-and-11-transfers": {
    title: "Class IX and XI transfers",
    eyebrow: "Admissions · Special review",
    summary: "Prior-class, board, subject and timing rules make these applications different from elementary entry.",
  },
  school: {
    title: "School admissions",
    eyebrow: "Admissions · Classes I–VIII",
    summary: "A Maharashtra-specific route for age, previous-class eligibility, documents, availability and family support.",
  },
  "senior-secondary": {
    title: "Senior-secondary admissions",
    eyebrow: "Admissions · Classes IX–XII",
    summary: "Direct-entry and transfer rules, programme confirmation and subject availability must be checked before an application is invited.",
  },
  visit: {
    title: "Visit SSKEMS",
    eyebrow: "Admissions · School visit",
    summary: "Speak with the school, understand routines and request any accessibility or communication support before your visit.",
  },
} as const;

type PageKey = keyof typeof pageDetails;
type RouteProps = { params: Promise<{ section: string[] }> };

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <div className="admissions-section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{children}</div>;
}

function ProcessPage() {
  return (
    <>
      <section className="admissions-band" aria-labelledby="process-steps-title">
        <PageContainer className="admissions-process-page">
          <SectionHeading eyebrow="01 · Parent-facing process" title="From eligibility to confirmation" />
          <ProcessTimeline />
        </PageContainer>
      </section>
      <section className="admissions-band admissions-band--soft" aria-labelledby="process-boundaries-title">
        <PageContainer>
          <SectionHeading eyebrow="02 · Clear boundaries" title="An application is not an admission decision">
            <p id="process-boundaries-title">Submitting an enquiry or formal application does not guarantee admission. Availability, eligibility, documents and authorised approval still apply.</p>
          </SectionHeading>
          <div className="admissions-policy-grid">
            <article><span>Elementary stage</span><h3>Non-selective orientation</h3><p>A family interaction may identify learning, language, transport, accessibility or health support. It must not become a selection test, parental interview or screening procedure.</p></article>
            <article><span>Provisional offer</span><h3>Conditions remain visible</h3><p>The class, year, outstanding documents, approved fee schedule and response deadline are stated before acceptance.</p></article>
            <article><span>Confirmation</span><h3>Authorised register entry</h3><p>Admission is confirmed only after approval, document checks, applicable fee recording and creation of the permanent admission number.</p></article>
          </div>
        </PageContainer>
      </section>
    </>
  );
}

function AgeCriteriaPage() {
  return (
    <>
      <PageContainer><AdmissionsReviewNotice>The calculator is active as a safe review tool, but it returns “Requires manual review” until the current Maharashtra order is archived and approved.</AdmissionsReviewNotice></PageContainer>
      <section className="admissions-band" aria-labelledby="age-rule-register-title">
        <PageContainer>
          <SectionHeading eyebrow="01 · Rule register" title="Current publication state" />
          <dl className="admissions-verification-grid" id="age-rule-register-title">
            <VerificationValue label="Academic year" value={ageRule.academicYear} />
            <VerificationValue label="Authority" value={ageRule.authority} />
            <VerificationValue label="Official Maharashtra cut-off" value="Government order required" pending />
            <VerificationValue label="Source government order" value="Archive record required" pending />
            <VerificationValue label="Rule verified on" value="Not yet verified" pending />
          </dl>
          <p className="admissions-source-note"><a href={officialAdmissionsSources.cbseDirectAdmission} target="_blank" rel="noreferrer">CBSE directs schools to follow the age limits established by the State or Union Territory <span className="visually-hidden">(opens in a new tab)</span></a> where the school is located. The national Grade I age-six baseline is documented by the <a href={officialAdmissionsSources.ministryGradeOneAge} target="_blank" rel="noreferrer">Ministry of Education <span className="visually-hidden">(opens in a new tab)</span></a>, but SSKEMS still needs the exact Maharashtra record for {admissionsCycle.academicYear}.</p>
        </PageContainer>
      </section>
      <section className="admissions-band admissions-band--soft" aria-labelledby="age-baseline-title">
        <PageContainer className="age-baseline-layout">
          <SectionHeading eyebrow="02 · Provisional planning baseline" title="Minimum ages awaiting order confirmation">
            <p>These values support planning only. No date-of-birth window, maximum age or relaxation is published until the exact rule is approved.</p>
          </SectionHeading>
          <div className="admissions-table-wrap">
            <table className="admissions-table">
              <caption id="age-baseline-title">Provisional entry-level age baselines for planning</caption>
              <thead><tr><th scope="col">Entry class</th><th scope="col">Minimum-age baseline</th><th scope="col">Status</th></tr></thead>
              <tbody>{provisionalAgeBaselines.map((row) => <tr key={row.entryClass}><th scope="row">{row.entryClass}</th><td data-label="Minimum-age baseline">{row.minimumAge}</td><td data-label="Status">Requires government-order verification</td></tr>)}</tbody>
            </table>
          </div>
        </PageContainer>
      </section>
      <section className="admissions-band" aria-label="Age eligibility checker"><PageContainer><AgeEligibilityChecker /></PageContainer></section>
    </>
  );
}

function EnquirePage() {
  return (
    <>
      <PageContainer><AdmissionsReviewNotice /></PageContainer>
      <section className="admissions-band" aria-label="Enquiry form prototype"><PageContainer><EnquiryFormPrototype /></PageContainer></section>
      <section className="admissions-band admissions-band--soft" aria-labelledby="enquiry-boundaries-title">
        <PageContainer className="enquiry-boundaries">
          <SectionHeading eyebrow="Privacy by stage" title="Certificates do not belong in an enquiry" />
          <div id="enquiry-boundaries-title">
            <h3>Ask now</h3><p>Availability, academic year, intended class, transport, visit, accessibility, curriculum, fees and callback preference.</p>
          </div>
          <div><h3>Collect later—only when applicable</h3><p>Age evidence, report cards, transfer records, category documents and restricted support information.</p></div>
          <div><h3>Never request here</h3><p>Aadhaar, bank details, birth or caste certificates, income evidence, detailed medical history, marksheets or occupation documents.</p></div>
        </PageContainer>
      </section>
    </>
  );
}

function ApplyPage() {
  return (
    <>
      <PageContainer><AdmissionsReviewNotice>The formal application is an interactive blueprint only. Save, resume, uploads and submission stay off until durable encrypted storage, private files, authentication and staff permissions are ready.</AdmissionsReviewNotice></PageContainer>
      <section className="admissions-band" aria-label="Application journey prototype"><PageContainer><ApplicationJourneyPrototype /></PageContainer></section>
      <section className="admissions-band admissions-band--soft" aria-labelledby="application-rules-title">
        <PageContainer>
          <SectionHeading eyebrow="Routing rules" title="Some classes require special review" />
          <div className="admissions-policy-grid" id="application-rules-title">
            <article><span>Class X</span><h3>Not an ordinary direct-entry class</h3><p>Class X requires restricted transfer review, completion of Class IX and the applicable CBSE conditions.</p></article>
            <article><span>Class XII</span><h3>Not an ordinary direct-entry class</h3><p>Class XII requires restricted transfer review, completion of Class XI and the applicable CBSE conditions.</p></article>
            <article><span>After 31 August</span><h3>Authority review required</h3><p>Class IX and above cannot be processed as an ordinary late admission where prior permission is required.</p></article>
          </div>
        </PageContainer>
      </section>
    </>
  );
}

function StatusPage() {
  return (
    <>
      <PageContainer><AdmissionsReviewNotice>Status lookup is not connected. The production route will require an application reference, registered mobile number and one-time password (OTP).</AdmissionsReviewNotice></PageContainer>
      <section className="admissions-band" aria-label="Status lookup prototype"><PageContainer className="status-layout"><StatusLookupPrototype /><div><SectionHeading eyebrow="Parent-safe history" title="Only useful progress is shown"><p>Internal notes, staff discussions and risk flags remain private and are never exposed to parents.</p></SectionHeading><ul className="status-history-fields"><li>Date</li><li>Status</li><li>Parent action required</li><li>Deadline</li><li>Message</li></ul></div></PageContainer></section>
      <section className="admissions-band admissions-band--soft" aria-labelledby="status-language-title"><PageContainer><SectionHeading eyebrow="Status language" title="Plain words, protected detail" /><div className="admissions-table-wrap"><table className="admissions-table"><caption id="status-language-title">Internal-to-parent status mapping</caption><thead><tr><th scope="col">Workflow state</th><th scope="col">Parent-facing status</th></tr></thead><tbody>{admissionStatusExamples.map(([internal, parent]) => <tr key={internal}><th scope="row">{internal}</th><td data-label="Parent-facing status">{parent}</td></tr>)}</tbody></table></div></PageContainer></section>
    </>
  );
}

function DocumentsPage() {
  return (
    <section className="admissions-band" aria-labelledby="documents-list-title"><PageContainer><SectionHeading eyebrow="Conditional checklist" title="Bring only what your route requires"><p>The production service will generate this list from the selected class and category.</p></SectionHeading><div className="document-checklist" id="documents-list-title">{documentChecklist.map((document, index) => <article key={document.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{document.title}</h3><p>{document.note}</p></div><strong>Conditional</strong></article>)}</div><div className="privacy-panel"><strong>Private-document standard</strong><p>Production uploads must use private storage, MIME and extension verification, malware scanning, expiring access links, staff-role checks and a view/download audit. Allowed formats are normally PDF, JPG, JPEG and PNG; approved size limits will be shown before upload.</p></div></PageContainer></section>
  );
}

function FeesPage() {
  return (
    <section className="admissions-band" aria-labelledby="fees-status-title"><PageContainer><SectionHeading eyebrow="2026–27 fee publication" title="No unapproved amount is shown"><p>The document archive contains the controlled fee-schedule record, but its academic year, authority, effective date and approved public file remain required.</p></SectionHeading><div className="fee-status-card" id="fees-status-title"><div><span>Current fee structure</span><strong>Approved public PDF pending</strong><p>Ask the school for current information and request a written, authorised schedule.</p></div><Link className="button button--secondary" href="/documents/current-fee-structure">Open the fee record</Link></div><div className="admissions-policy-grid"><article><span>Before an offer</span><h3>Clear schedule</h3><p>Parents should see authorised charges, what each charge covers, deadlines and any conditions.</p></article><article><span>After payment</span><h3>Recorded and receipted</h3><p>Only the accountant boundary may record authorised payments and issue receipts.</p></article><article><span>RTE</span><h3>No unofficial payment</h3><p>The school must not request unofficial payments for the official RTE process.</p></article></div></PageContainer></section>
  );
}

function FaqPage() {
  return <section className="admissions-band" aria-labelledby="faq-title"><PageContainer className="faq-layout"><SectionHeading eyebrow="Frequently asked questions" title="Short answers before you contact us" /><div className="admissions-faq" id="faq-title">{admissionsFaq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></PageContainer></section>;
}

function ContactPage() {
  return (
    <section className="admissions-band" aria-labelledby="contact-options-title"><PageContainer><SectionHeading eyebrow="Verified public channels" title="Contact the school office"><p>No dedicated admissions contact has been approved yet, so the site uses the verified school office details.</p></SectionHeading><div className="admissions-contact-grid" id="contact-options-title"><ContactCard title="School office" phone={siteFacts.phone} email={siteFacts.email} hours={`${siteFacts.workingHours.weekdays}; ${siteFacts.workingHours.saturday}`} /><ContactCard title="Principal's office" phone={siteFacts.mobile} email={siteFacts.principalEmail} hours="Contact the school office to arrange a suitable time" /><article className="contact-topic-card"><span>Include in your message</span><h3>Help us route the question</h3><ul><li>Academic year and class sought</li><li>Whether the question is about fees, transport, a visit or accessibility</li><li>Your preferred contact method and time</li></ul><p>Do not email sensitive certificates or detailed medical records unless the school provides an approved secure channel.</p></article></div></PageContainer></section>
  );
}

function RtePage() {
  return (
    <>
      <section className="admissions-band" aria-labelledby="rte-route-title"><PageContainer className="rte-route"><div><p className="eyebrow">Separate official route</p><h2 id="rte-route-title">Use the Maharashtra RTE portal</h2><p>The ordinary SSKEMS enquiry or regular school application is not the official RTE 25% application. Use the School Education and Sports Department process and follow the current official notification.</p><a className="button button--primary" href={officialAdmissionsSources.maharashtraRte} target="_blank" rel="noreferrer">Open Maharashtra education portal <span className="visually-hidden">(opens in a new tab)</span></a></div><aside><span>Before production publication</span><strong>Participation must be verified</strong><p>SSKEMS participation, entry class, dates, eligibility rules and post-allotment requirements are not yet approved for this page.</p></aside></PageContainer></section>
      <section className="admissions-band admissions-band--soft"><PageContainer><div className="admissions-policy-grid"><article><span>Apply</span><h3>Official state process</h3><p>Do not use the regular school form as a substitute.</p></article><article><span>After allotment</span><h3>School verification</h3><p>The school will publish the verified appointment and document procedure.</p></article><article><span>Payments</span><h3>No unofficial charges</h3><p>Report any request that conflicts with the official process.</p></article></div></PageContainer></section>
    </>
  );
}

function TransfersPage() {
  return (
    <section className="admissions-band" aria-labelledby="transfer-rules-title"><PageContainer><SectionHeading eyebrow="CBSE admission rules" title="Prior class, timing and authority matter" /><div className="transfer-rule-grid" id="transfer-rules-title"><article><span>Class IX</span><h3>Passed Class VIII</h3><p>The previous institution must be CBSE-affiliated, another recognised board, or recognised by the relevant State education department.</p></article><article><span>Class XI</span><h3>Passed Class X or equivalent</h3><p>Subject combinations, prerequisites and the programme actually offered by SSKEMS still require confirmation.</p></article><article><span>Class IX–XII</span><h3>After 31 August</h3><p>Admission after 31 August requires prior permission from the competent authority except in specified late-result circumstances. Attendance feasibility also matters.</p></article></div><p className="admissions-source-note">Official source: <a href={officialAdmissionsSources.cbseDirectAdmission} target="_blank" rel="noreferrer">CBSE Direct Admission rules <span className="visually-hidden">(opens in a new tab)</span></a>.</p></PageContainer></section>
  );
}

function SchoolPage() {
  return (
    <section className="admissions-band" aria-labelledby="school-route-title"><PageContainer><SectionHeading eyebrow="Classes I–VIII" title="Maharashtra-specific eligibility"><p>CBSE delegates admission through Class VIII to the applicable State rules. The school must therefore configure Maharashtra age and previous-class rules rather than present a generic “CBSE age rule”.</p></SectionHeading><div className="admissions-policy-grid" id="school-route-title"><article><span>Age</span><h3>Official cut-off record</h3><p>The 2026–27 Maharashtra order and any relaxation must be approved first.</p></article><article><span>Prior learning</span><h3>Previous-class eligibility</h3><p>For classes above entry level, age alone is not enough.</p></article><article><span>Family support</span><h3>Non-selective orientation</h3><p>Interactions help plan language, learning, accessibility, health and transport support; they are not screening tests.</p></article></div></PageContainer></section>
  );
}

function SeniorSecondaryPage() {
  return (
    <section className="admissions-band" aria-labelledby="senior-rules-title"><PageContainer><SectionHeading eyebrow="Classes IX–XII" title="Programme and transfer rules before promotion"><p><a href={officialAdmissionsSources.cbseSaras} target="_blank" rel="noreferrer">CBSE SARAS records SSKEMS as a Senior Secondary school <span className="visually-hidden">(opens in a new tab)</span></a>. A separately named Junior College or Maharashtra FYJC pathway must not be presented as current until management confirms its board and programme.</p></SectionHeading><div className="admissions-policy-grid" id="senior-rules-title"><article><span>Class X</span><h3>Restricted, not ordinary open entry</h3><p>Completion of Class IX and the specific CBSE transfer conditions must be checked.</p></article><article><span>Class XI</span><h3>Programme confirmation required</h3><p>A passed Class X or recognised equivalent, approved subjects and actual school availability are required.</p></article><article><span>Class XII</span><h3>Restricted, not ordinary open entry</h3><p>Completion of Class XI and the applicable transfer conditions must be checked.</p></article></div><div className="fyjc-note"><strong>Important FYJC distinction</strong><p>Maharashtra’s centralised Class XI portal applies to its State Board process. Do not direct a CBSE applicant there as mandatory unless SSKEMS confirms that the intended programme is governed by FYJC.</p><a href={officialAdmissionsSources.maharashtraClassEleven} target="_blank" rel="noreferrer">View the official Maharashtra FYJC portal <span className="visually-hidden">(opens in a new tab)</span></a></div></PageContainer></section>
  );
}

function VisitPage() {
  return (
    <><PageContainer><AdmissionsReviewNotice>Online visit booking is not active. The verified school office can arrange a current appointment.</AdmissionsReviewNotice></PageContainer><section className="admissions-band" aria-label="Visit request prototype"><PageContainer><VisitRequestPrototype /></PageContainer></section><section className="admissions-band admissions-band--soft" aria-labelledby="visit-prep-title"><PageContainer><SectionHeading eyebrow="Before you arrive" title="A useful, accessible visit" /><div className="admissions-policy-grid" id="visit-prep-title"><article><span>Confirm</span><h3>Date and arrival point</h3><p>School hours do not automatically mean an admissions appointment is available.</p></article><article><span>Request</span><h3>Accessibility support</h3><p>Tell the office about mobility, communication or interpretation needs when arranging the visit.</p></article><article><span>Ask</span><h3>Bring your priorities</h3><p>Curriculum, routines, support, transport and verified fee guidance can be discussed without bringing sensitive documents.</p></article></div></PageContainer></section></>
  );
}

function contentFor(page: PageKey) {
  switch (page) {
    case "process": return <ProcessPage />;
    case "age-criteria": return <AgeCriteriaPage />;
    case "enquire": return <EnquirePage />;
    case "apply": return <ApplyPage />;
    case "application-status": return <StatusPage />;
    case "documents-required": return <DocumentsPage />;
    case "fees": return <FeesPage />;
    case "faq": return <FaqPage />;
    case "contact": return <ContactPage />;
    case "rte": return <RtePage />;
    case "class-9-and-11-transfers": return <TransfersPage />;
    case "school": return <SchoolPage />;
    case "senior-secondary": return <SeniorSecondaryPage />;
    case "visit": return <VisitPage />;
  }
}

function pageKey(section: string[]): PageKey | null {
  if (section.length !== 1) return null;
  const candidate = section[0] as PageKey;
  return candidate in pageDetails ? candidate : null;
}

export function generateStaticParams() {
  return Object.keys(pageDetails).map((section) => ({ section: [section] }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { section } = await params;
  const key = pageKey(section);
  if (!key) return { title: "Admissions page not found" };
  const details = pageDetails[key];
  return {
    title: details.title,
    description: details.summary,
    alternates: { canonical: `/admissions/${key}` },
    robots: { index: false, follow: true },
  };
}

export default async function AdmissionsSubPage({ params }: RouteProps) {
  const { section } = await params;
  const key = pageKey(section);
  if (!key) notFound();
  const details = pageDetails[key];
  return <AdmissionsPageFrame eyebrow={details.eyebrow} title={details.title} summary={details.summary} actions={!(["process", "enquire", "apply", "application-status"] as PageKey[]).includes(key)}>{contentFor(key)}</AdmissionsPageFrame>;
}
