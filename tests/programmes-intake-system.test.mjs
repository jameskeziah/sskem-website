import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { programmesPrivateReviewCandidates } from "../app/data/programmes-private-review-candidates.ts";

const intakeText = await readFile(new URL("../content/programmes-intake-system.json", import.meta.url), "utf8");
const intake = JSON.parse(intakeText);

function allFormFields() {
  return intake.googleForm.sections.flatMap((section) => section.fields);
}

test("defines one aligned Form, Sheet, Drive and tracker contract", () => {
  assert.equal(intake.schemaVersion, 2);
  assert.equal(intake.contractVersion, "1.1.0-draft");
  assert.equal(intake.intakeId, "sskem-programmes-intake-system");
  assert.equal(intake.authoritativeBoundaries.programmesPackageSchema, "content/programmes-content-package.schema.json");
  assert.equal(intake.authoritativeBoundaries.programmesReviewWorkspace, "/publication-review/programmes-content-package");
  assert.equal(intake.authoritativeBoundaries.programmesPublicationContractDraft, "content/programmes-publication-v1.1-draft.schema.json");
  assert.deepEqual(intake.identifiers.programmes.map((programme) => programme.id), [
    "PRG-CBSE-SS",
    "PRG-JUNIOR-COLLEGE",
    "PRG-EXAM-PREP",
  ]);
  assert.deepEqual(intake.googleSheet.tabs.map((tab) => tab.name), [
    "Programmes",
    "Organisations",
    "Programme Governance",
    "Faculty",
    "Fees",
    "Results",
    "Scholarships",
    "Campus",
    "Programme Documents",
    "Admissions Actions",
    "Organisation Relationships",
    "Board & Status",
    "Institution Identifiers",
    "Campus Availability",
    "Media & Evidence",
    "Publication Tracker",
    "Lists",
  ]);
  assert.equal(intake.controlledDrive.folders[0].path, "00-Governance");
  assert.equal(intake.publicationTracker.states.includes("ready-for-implementation"), true);
});

test("maps the management Form to the existing Programmes package", () => {
  const fieldIds = new Set(allFormFields().map((field) => field.id));
  for (const requiredId of [
    "academicYear",
    "shortDisplayName",
    "programmeCategories",
    "programmeStatuses",
    "requestedWebsitePublicationState",
    "institutionalModel",
    "ownership.officialOperatorOrganisationId",
    "ownership.enrolmentOrganisationId",
    "ownership.governanceEvidenceIds",
    "organisationRelationship.relationshipType",
    "organisationRelationship.academicWingTermDecision",
    "organisationRelationship.integratedTermDecision",
    "organisationRelationship.evidenceIds",
    "cbseSeniorSecondary.officialName",
    "cbseSeniorSecondary.officialRecognisedInstitutionName",
    "cbseSeniorSecondary.affiliationOrRecognitionNumber",
    "cbseSeniorSecondary.providesClassesXiXii",
    "cbseSeniorSecondary.xiXiiEnrolmentOrganisation",
    "cbseSeniorSecondary.durationSummary",
    "cbseSeniorSecondary.deliveryMode",
    "cbseSeniorSecondary.admissionsWindowState",
    "cbseSeniorSecondary.admissionsCtaDestination",
    "cbseSeniorSecondary.publicContactRoute",
    "juniorCollege.officialName",
    "examPreparation.operator",
    "examPreparation.durationSummary",
    "examPreparation.admissionsWindowState",
    "examPreparation.intakeCapacity",
    "examPreparation.resultsPublication",
    "governance.publicationPolicyPermission",
    "governance.privacyPermission",
    "governance.informationValidUntil",
    "governance.nextReviewDate",
    "governance.futureUpdateOwnerRole",
    "governance.internalOnlyNotes",
    "publication.juniorCollegeNavigation",
    "publication.examPreparationNavigation",
    "publication.approvedPublicClaims",
    "approval.controlledEvidenceReferences",
    "approval.approvedByRole",
    "approval.approvedOn",
    "approval.confirmation",
  ]) {
    assert.equal(fieldIds.has(requiredId), true, `missing Form field ${requiredId}`);
  }
  const confirmation = allFormFields().find((field) => field.id === "approval.confirmation");
  assert.equal(confirmation.value, "confirm-management-approved-programmes-content-package");
  assert.match("EVD-2026-001", new RegExp(intake.identifiers.evidenceIdPattern));
  assert.match("EVD-2026-0001", new RegExp(intake.identifiers.evidenceIdPattern));
  assert.doesNotMatch(intakeText, /SSKEMS-ProTrack relationship|ProTrack role/);
});

test("keeps operational data in controlled systems and fails closed", () => {
  assert.equal(intake.authoritativeBoundaries.completedWorkbookLocation, "controlled-google-drive-only");
  assert.equal(intake.privacy.forbiddenInRepositoryOrSanity.includes("pupil or applicant records"), true);
  assert.equal(intake.privacy.forbiddenInRepositoryOrSanity.includes("private Drive links"), true);
  assert.match(intake.publicationTracker.readyRule, /every required gate passes/i);
  assert.equal(intake.publicationTracker.requiredGates.some((gate) => /critical fact.*confirmed/i.test(gate)), true);
  assert.equal(intake.publicationTracker.requiredGates.some((gate) => /privacy permissions/i.test(gate)), true);
  assert.match(intake.publicationTracker.sanityRule, /not approval evidence/i);
  assert.deepEqual(intake.guardrails, {
    googleAssetsProvisioned: false,
    realProgrammeDataCollected: false,
    v11ContractActivated: false,
    unverifiedCandidateUsedAsApproval: false,
    privateEvidenceIncluded: false,
    managementApprovalGranted: false,
    approvalManifestUpdated: false,
    sanityWritePerformed: false,
    publicContentPublished: false,
    navigationActivated: false,
    deploymentPerformed: false,
  });
});

test("records supplied rows only as a blocked private-review candidate", async () => {
  const candidate = programmesPrivateReviewCandidates.suppliedProgrammeIntake;
  const [home, layout, sitemap, navigation] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/navigation.ts", import.meta.url), "utf8"),
  ]);
  assert.equal(candidate.identity.academicYearRaw, "2026-27");
  assert.equal(candidate.identity.academicYearNormalized, "2026-2027");
  assert.equal(candidate.identity.shortDisplayNameRaw, "SSKEM");
  assert.equal(candidate.identity.shortDisplayName, "SSKEMS");
  assert.equal(candidate.identity.shortDisplayNameStatus, "user-confirmed-private-review");
  assert.equal(candidate.identity.institutionalModel, "both");
  assert.equal(candidate.identity.institutionalModelStatus, "user-confirmed-private-review");
  assert.equal(candidate.identity.requestedPublicationState, "request-publication-review");
  assert.equal(candidate.classesXiXii.enrolmentOrganisationRaw, "yes");
  assert.equal(candidate.classesXiXii.enrolmentOrganisationCandidate, "SSKEMS");
  assert.equal(candidate.classesXiXii.enrolmentOrganisationStatus, "user-confirmed-private-review");
  assert.equal(candidate.legacyProTrackRestriction.relationshipTypeCandidate, "no-current-relationship");
  assert.equal(candidate.legacyProTrackRestriction.sourceStatus, "superseded-historical-intake-section");
  assert.equal(candidate.recognition.supportingDocumentState, "not-confirmed");
  assert.equal(candidate.blockers.length, 10);
  assert.equal(candidate.blockers.some((blocker) => blocker.includes("institutional model")), false);
  assert.equal(candidate.blockers.some((blocker) => blocker.includes("short display name")), false);
  assert.equal(candidate.blockers.some((blocker) => blocker.includes("wrong type")), false);
  assert.equal(candidate.publicationRequested, true);
  assert.equal(candidate.publicationAuthorized, false);
  assert.doesNotMatch(`${home}\n${layout}\n${sitemap}\n${navigation}`, /suppliedProgrammeIntake/);
});

test("records the official reconciliation and keeps the full package separate from the approved profile subset", async () => {
  const [home, layout, sitemap, navigation, disclosure, privatePage] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/navigation.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/disclosure.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/programmes-contract-v1-1/page.tsx", import.meta.url), "utf8"),
  ]);
  const assessment = programmesPrivateReviewCandidates.institutionalEvidenceAssessment;
  const { cbseSchool, juniorCollege, entranceExamInstitute } = assessment.entities;

  assert.deepEqual(assessment.evidenceRegister.map((record) => record.id), ["EVD-2026-001", "EVD-2026-002", "EVD-2026-003"]);
  assert.equal(cbseSchool.officialName, "Shree Samarth Krupa English Medium School");
  assert.equal(cbseSchool.affiliationNumber, "1130851");
  assert.equal(cbseSchool.schoolCode, "30780");
  assert.equal(cbseSchool.udiseCode, "27320420205");
  assert.deepEqual(cbseSchool.renewalPeriod, { validFrom: "2027-04-01", validUntil: "2032-03-31" });
  assert.equal(juniorCollege.collegeNumber, "25.04.028");
  assert.equal(juniorCollege.udiseCode, "27320420206");
  assert.notEqual(cbseSchool.udiseCode, juniorCollege.udiseCode);
  assert.deepEqual(juniorCollege.latestBoardPerformanceStreams, ["Science"]);
  assert.deepEqual(juniorCollege.currentAdmissionsPortalStreams, ["Science", "Commerce"]);
  assert.deepEqual(juniorCollege.historicallyEvidencedStreams, ["Commerce"]);
  assert.deepEqual(juniorCollege.withheldCurrentStreamClaims, ["Commerce", "Arts"]);
  assert.equal(entranceExamInstitute.operatorNameCandidate, "Shree Samarth Krupa Institute");
  assert.deepEqual(entranceExamInstitute.verifiedProgrammeScope, ["NEET-UG preparation"]);
  assert.deepEqual(entranceExamInstitute.evidenceIds, ["EVD-2026-003"]);
  assert.deepEqual(entranceExamInstitute.withheldProgrammeScope, ["detailed JEE programme claims"]);
  assert.equal(assessment.institutionalSeparation.sameRegulatoryEntity, false);
  assert.equal(assessment.institutionalSeparation.publicInformationArchitecture, "sibling-sections");
  assert.equal(assessment.staleLegacyClaimControl.currentPublicBuildContainsClaim, false);
  assert.deepEqual(assessment.routeReadiness, { schoolAcademics: false, juniorCollege: false, jeeNeet: false });
  assert.deepEqual(assessment.verifiedPublicProfileReadiness, { schoolAcademics: true, juniorCollege: true, neetInstitute: true, scope: "approved-facts-only" });
  assert.equal(assessment.publicationAuthorized, false);
  assert.equal(assessment.navigationAuthorized, false);
  assert.equal(assessment.deploymentAuthorized, false);
  assert.equal(programmesPrivateReviewCandidates.verifiedPublicSubsetAuthorization.decision, "approved");
  assert.doesNotMatch(`${home}\n${layout}\n${sitemap}\n${navigation}\n${disclosure}`, /Affiliated up to 31\/03\/2022/i);
  assert.doesNotMatch(`${home}\n${layout}\n${sitemap}\n${navigation}`, /institutionalEvidenceAssessment/);
  assert.match(privatePage, /Three programme entities are now distinguished/);
  assert.match(privatePage, /CBSE School and Junior College must not be merged/);
});

test("rejects the declared management approval without leaking approver identity or weakening publication gates", async () => {
  const [home, layout, sitemap, navigation, privatePage] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/navigation.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/programmes-contract-v1-1/page.tsx", import.meta.url), "utf8"),
  ]);
  const assessment = programmesPrivateReviewCandidates.managementSubmissionAssessment;
  assert.equal(assessment.submittedDecision, "approved-for-publication");
  assert.equal(assessment.contractValidationStatus, "rejected-incomplete");
  assert.equal(assessment.suppliedRowCount, 140);
  assert.equal(assessment.nonBlankValueCount, 61);
  assert.equal(assessment.blankValueCount, 79);
  assert.deepEqual(assessment.absentRowNumbers, [137]);
  assert.equal(assessment.approvalRecordValidated, false);
  assert.deepEqual(assessment.routeReadiness, { schoolAcademics: false, juniorCollege: false, jeeNeet: false });
  assert.equal(assessment.blockingRowGroups.length, 14);
  assert.equal(assessment.privacyDecisions.individualConsentStillRequired, true);
  assert.equal(assessment.publicationAuthorized, false);
  assert.equal(assessment.navigationAuthorized, false);
  assert.equal(assessment.deploymentAuthorized, false);
  assert.equal(JSON.stringify(assessment).toLowerCase().includes("robert"), false);
  assert.doesNotMatch(`${home}\n${layout}\n${sitemap}\n${navigation}`, /managementSubmissionAssessment/);
  assert.match(privatePage, /Approval was declared, but the publication contract rejected the package/);
});

test("documents the external work as remaining rather than complete", async () => {
  const guide = await readFile(new URL("../docs/programmes-intake-system.md", import.meta.url), "utf8");
  assert.match(guide, /Google assets are not yet\s+provisioned/i);
  assert.match(guide, /Google Drive connection and restricted folder provisioning/);
  assert.match(guide, /does not approve a claim/i);
  assert.doesNotMatch(intakeText, /"(?:password|apiToken|secret)"\s*:/i);
});
