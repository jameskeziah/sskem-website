import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const intakeText = await readFile(new URL("../content/programmes-intake-system.json", import.meta.url), "utf8");
const intake = JSON.parse(intakeText);

function allFormFields() {
  return intake.googleForm.sections.flatMap((section) => section.fields);
}

test("defines one aligned Form, Sheet, Drive and tracker contract", () => {
  assert.equal(intake.intakeId, "sskem-programmes-intake-system");
  assert.equal(intake.authoritativeBoundaries.programmesPackageSchema, "content/programmes-content-package.schema.json");
  assert.equal(intake.authoritativeBoundaries.programmesReviewWorkspace, "/publication-review/programmes-content-package");
  assert.deepEqual(intake.identifiers.programmes.map((programme) => programme.id), [
    "PRG-CBSE-SS",
    "PRG-JUNIOR-COLLEGE",
    "PRG-EXAM-PREP",
  ]);
  assert.deepEqual(intake.googleSheet.tabs.map((tab) => tab.name), [
    "Programmes",
    "Faculty",
    "Fees",
    "Results",
    "Scholarships",
    "Campus",
    "Evidence Register",
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
    "institutionalModel",
    "cbseSeniorSecondary.officialName",
    "juniorCollege.officialName",
    "examPreparation.operator",
    "examPreparation.resultsPublication",
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
});

test("keeps operational data in controlled systems and fails closed", () => {
  assert.equal(intake.authoritativeBoundaries.completedWorkbookLocation, "controlled-google-drive-only");
  assert.equal(intake.privacy.forbiddenInRepositoryOrSanity.includes("pupil or applicant records"), true);
  assert.equal(intake.privacy.forbiddenInRepositoryOrSanity.includes("private Drive links"), true);
  assert.match(intake.publicationTracker.readyRule, /every required gate passes/i);
  assert.match(intake.publicationTracker.sanityRule, /not approval evidence/i);
  assert.deepEqual(intake.guardrails, {
    googleAssetsProvisioned: false,
    realProgrammeDataCollected: false,
    privateEvidenceIncluded: false,
    managementApprovalGranted: false,
    approvalManifestUpdated: false,
    sanityWritePerformed: false,
    publicContentPublished: false,
    navigationActivated: false,
    deploymentPerformed: false,
  });
});

test("documents the external work as remaining rather than complete", async () => {
  const guide = await readFile(new URL("../docs/programmes-intake-system.md", import.meta.url), "utf8");
  assert.match(guide, /Google assets are not yet\s+provisioned/i);
  assert.match(guide, /Google Drive connection and restricted folder provisioning/);
  assert.match(guide, /does not approve a claim/i);
  assert.doesNotMatch(intakeText, /"(?:password|apiToken|secret)"\s*:/i);
});
