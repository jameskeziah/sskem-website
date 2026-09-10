import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PROGRAMMES_CONTENT_PACKAGE_CONFIRMATION,
  PROGRAMMES_CONTENT_PACKAGE_ID,
  createProgrammesContentPackage,
  programmeClaimRecordIds,
} from "../lib/programmes-content-package.ts";
import { programmesPrivateReviewCandidates } from "../app/data/programmes-private-review-candidates.ts";

const validInput = {
  academicYear: "2026-2027",
  institutionalModel: "both",
  cbseSeniorSecondary: {
    officialName: "SSKEMS CBSE Senior Secondary School",
    board: "Central Board of Secondary Education",
    affiliationOrRecognition: "CBSE affiliation 1130851; current status verified in the controlled record",
    classes: ["Class XI", "Class XII"],
    streams: ["Science"],
    subjects: ["English", "Physics", "Chemistry", "Mathematics", "Biology"],
    eligibility: "Passed Class X or a recognised equivalent, subject to approved availability and transfer rules.",
    feeSummary: "Use the separately approved current fee schedule.",
    admissionProcedure: "Submit the approved enquiry and documents to the school office for review.",
    publicSummary: "Approved public Senior Secondary summary.",
  },
  juniorCollege: {
    officialName: "SSKEMS Junior College",
    board: "Verified board from the controlled recognition record",
    affiliationOrRecognition: "Recognition reference retained in the controlled system",
    classes: ["Class XI", "Class XII"],
    streams: ["Science"],
    subjects: ["English", "Physics", "Chemistry", "Mathematics", "Biology"],
    eligibility: "Passed Class X or a recognised equivalent and met the approved admission rules.",
    feeSummary: "Use the separately approved current Junior College fee schedule.",
    admissionProcedure: "Follow the approved Junior College admission procedure.",
    publicSummary: "Approved public Junior College summary.",
  },
  examPreparation: {
    operator: "junior-college",
    operatorName: "SSKEMS Junior College",
    programmes: ["JEE Main", "NEET-UG", "MHT-CET"],
    studentGroups: ["Class XI Science", "Class XII Science"],
    curriculum: "Approved subject and assessment plan.",
    timetable: "Approved timetable summary.",
    facultySummary: "Approved role-based faculty summary without private contact details.",
    feeSummary: "Use the separately approved current programme fee schedule.",
    facilitiesSummary: "Approved classrooms, laboratories and study-support summary.",
    resultsPublication: "verified-results-approved",
    verifiedResultsSummary: "Approved aggregate result statement backed by the controlled result record.",
    publicSummary: "Approved public examination-preparation summary.",
  },
  publication: {
    juniorCollegeNavigation: "secondary",
    examPreparationNavigation: "under-junior-college",
    approvedMediaRecordIds: ["media-campus-main", "media-xii-science-2025-26", "media-result-admissions-2025-26"],
    approvedPublicClaims: [
      "Junior College is a current approved institutional pathway.",
      "The listed JEE and NEET preparation is operated by the approved Junior College pathway.",
    ],
  },
  controlledEvidenceReferences: ["CONTROLLED/PROGRAMMES-REVIEW-2026-001", "CONTROLLED/MANAGEMENT-MINUTES-2026-001"],
  approvedByRole: "school-management",
  approvedOn: "2026-08-29",
  expiresOn: "2027-05-31",
  managementConfirmation: PROGRAMMES_CONTENT_PACKAGE_CONFIRMATION,
};

test("creates one normalized, no-persistence Programmes content package", () => {
  const completion = createProgrammesContentPackage({ input: validInput, now: "2026-08-30T09:30:00.000Z" });
  assert.equal(completion.package.packageId, PROGRAMMES_CONTENT_PACKAGE_ID);
  assert.equal(completion.package.institutionalModel, "both");
  assert.equal(completion.package.programmes.cbseSeniorSecondary?.streams[0], "Science");
  assert.equal(completion.package.programmes.juniorCollege?.officialName, "SSKEMS Junior College");
  assert.equal(completion.package.programmes.examPreparation.operator, "junior-college");
  assert.deepEqual(completion.package.publication.relatedClaimRecordIds, programmeClaimRecordIds);
  assert.equal(completion.package.guardrails.serverPersistencePerformed, false);
  assert.equal(completion.package.guardrails.approvalManifestUpdated, false);
  assert.equal(completion.package.guardrails.publicContentPublished, false);
  assert.equal(completion.package.guardrails.approverIdentityIncluded, false);
  assert.equal(completion.validation.status, "ready-for-controlled-review-and-publication-planning");
  assert.match(completion.filename, /^sskem-programmes-content-package-2026-2027-2026-08-30\.json$/);
  assert.deepEqual(JSON.parse(completion.body), completion.package);
});

test("requires explicit management confirmation and complete current pathway facts", () => {
  assert.throws(() => createProgrammesContentPackage({ input: { ...validInput, managementConfirmation: undefined } }), /Explicit management confirmation/);
  assert.throws(() => createProgrammesContentPackage({ input: { ...validInput, academicYear: "2026-2028" } }), /consecutive YYYY-YYYY/);
  assert.throws(() => createProgrammesContentPackage({ input: { ...validInput, cbseSeniorSecondary: { ...validInput.cbseSeniorSecondary, subjects: [] } } }), /subjects requires at least 1/);
  assert.throws(() => createProgrammesContentPackage({ input: { ...validInput, institutionalModel: "cbse-senior-secondary-only", examPreparation: { ...validInput.examPreparation, operator: "cbse-school" }, publication: { ...validInput.publication, juniorCollegeNavigation: "secondary", examPreparationNavigation: "secondary" } } }), /Junior College navigation must remain hidden/);
});

test("rejects incompatible JEE/NEET, result, media and navigation decisions", () => {
  assert.throws(() => createProgrammesContentPackage({
    input: {
      ...validInput,
      institutionalModel: "cbse-senior-secondary-only",
      juniorCollege: undefined,
      examPreparation: { ...validInput.examPreparation, operator: "junior-college" },
      publication: { ...validInput.publication, juniorCollegeNavigation: "hidden", examPreparationNavigation: "secondary" },
    },
  }), /cannot be assigned to Junior College/);
  assert.throws(() => createProgrammesContentPackage({
    input: {
      ...validInput,
      examPreparation: { ...validInput.examPreparation, resultsPublication: "no-results-published", verifiedResultsSummary: "" },
    },
  }), /XII Science results artwork requires/);
  assert.throws(() => createProgrammesContentPackage({
    input: {
      ...validInput,
      examPreparation: { ...validInput.examPreparation, operator: "not-offered", publicSummary: "JEE and NEET preparation is not currently offered." },
      publication: { ...validInput.publication, examPreparationNavigation: "hidden" },
    },
  }), /engineering and medical guidance artwork cannot be selected/);
});

test("keeps evidence opaque and approval attribution role-only", () => {
  assert.throws(() => createProgrammesContentPackage({ input: { ...validInput, controlledEvidenceReferences: ["https://example.test/evidence", "CONTROLLED/MINUTES-001"] } }), /opaque IDs/);
  assert.throws(() => createProgrammesContentPackage({ input: { ...validInput, approvedByRole: "manager@example.test" } }), /role slug/);
  assert.throws(() => createProgrammesContentPackage({ input: { ...validInput, approvedOn: "2026-09-01" }, now: "2026-08-30T09:30:00.000Z" }), /cannot be in the future/);
});

test("ships a schema, private workspace, dashboard link and operating guide", async () => {
  const [schemaText, page, form, dashboard, sitemap, guide, manifestText, publicHome, publicLayout] = await Promise.all([
    readFile(new URL("../content/programmes-content-package.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/programmes-content-package/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/programmes-content-package/programmes-content-package-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/programmes-content-package.md", import.meta.url), "utf8"),
    readFile(new URL("../content/approval-manifest.json", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  const schema = JSON.parse(schemaText);
  const manifest = JSON.parse(manifestText);
  const nameClaim = manifest.records.find((record) => record.id === "claim-school-name");
  assert.equal(schema.properties.packageId.const, PROGRAMMES_CONTENT_PACKAGE_ID);
  assert.equal(schema.properties.guardrails.properties.publicContentPublished.const, false);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/programmes-content-package"\)/);
  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(form, /URL\.createObjectURL/);
  assert.match(form, /programmesPrivateReviewCandidates\.cbseSeniorSecondary\.officialName/);
  assert.doesNotMatch(form, /\bfetch\s*\(|\baction=/);
  assert.match(dashboard, /Complete Programmes content package/);
  assert.doesNotMatch(sitemap, /programmes-content-package/);
  assert.match(guide, /does not post or persist form data/i);
  assert.equal(programmesPrivateReviewCandidates.cbseSeniorSecondary.officialName, "Shree Samarth Krupa English Medium School");
  assert.equal(programmesPrivateReviewCandidates.cbseSeniorSecondary.supersededPrivateCandidateName, "SHREE SAMARTHA KRUPA ENGLISH MEDIUM SCHOOL (CBSE)");
  assert.equal(programmesPrivateReviewCandidates.cbseSeniorSecondary.publicationAuthorized, false);
  assert.equal(nameClaim.decision, "approved");
  assert.equal(nameClaim.checks["authoritative-source"], "verified");
  assert.equal(nameClaim.checks["management-approval"], "verified");
  assert.doesNotMatch(`${publicHome}\n${publicLayout}\n${sitemap}`, /programmes-private-review-candidates/);
});
