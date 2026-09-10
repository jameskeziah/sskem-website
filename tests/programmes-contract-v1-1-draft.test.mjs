import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PROGRAMME_DOCUMENT_KINDS } from "../lib/programmes-document-integration.ts";
import { validateProgrammesPublicationPackage } from "../lib/programmes-publication.ts";
import {
  PROGRAMMES_PUBLICATION_V11_DRAFT_COLLECTIONS,
  PROGRAMMES_PUBLICATION_V11_DRAFT_PACKAGE_TYPE,
  PROGRAMMES_PUBLICATION_V11_DRAFT_VERSION,
  PROGRAMMES_PUBLICATION_V1_SCHEMA_SHA256,
  validateProgrammesPublicationV11DraftSupplement,
} from "../lib/programmes-publication-v1-1-draft.ts";

const SHA = "a".repeat(64);

function makeDraft() {
  return {
    schemaVersion: PROGRAMMES_PUBLICATION_V11_DRAFT_VERSION,
    packageType: PROGRAMMES_PUBLICATION_V11_DRAFT_PACKAGE_TYPE,
    status: "draft-not-activated",
    basePackage: {
      schemaVersion: "1.0.0",
      schemaSha256: PROGRAMMES_PUBLICATION_V1_SCHEMA_SHA256,
      packageId: "programmes-2026-2027-v1",
      packageSha256: SHA,
    },
    academicYear: "2026-2027",
    publicDocuments: [],
    admissionsActions: [],
    programmeGovernance: [],
    organisationRelationships: [],
    boardAndStatus: [],
    institutionalIdentifiers: [],
    campusAvailability: [],
    guardrails: {
      draftOnly: true,
      v1SchemaModified: false,
      approvalGranted: false,
      approvalManifestUpdated: false,
      publicContentPublished: false,
      navigationActivated: false,
      documentApprovalGranted: false,
      schemaActivated: false,
      deploymentPerformed: false,
      privateEvidenceIncluded: false,
    },
  };
}

function populatedDraft() {
  const draft = makeDraft();
  draft.publicDocuments.push({
    id: "DOCREF-SCHOOL-TIMETABLE",
    programmeId: "school-academics",
    route: "/school/academics",
    kind: "timetable",
    catalogueStatus: "registered",
    publicDocumentId: "mpd-c-2",
    pipelineRecordId: "document-mpd-c-2",
    evidenceIds: [],
    claimIds: [],
    reviewStatus: "review-required",
  });
  draft.publicDocuments.push({
    id: "DOCREF-SCHOOL-BROCHURE",
    programmeId: "school-academics",
    route: "/school/academics",
    kind: "brochure",
    catalogueStatus: "catalogue-extension-required",
    publicDocumentId: null,
    pipelineRecordId: null,
    evidenceIds: [],
    claimIds: [],
    reviewStatus: "draft",
  });
  draft.admissionsActions.push({
    id: "CTA-SCHOOL-ADMISSIONS",
    programmeId: "school-academics",
    route: "/school/academics",
    purpose: "admissions-enquiry",
    label: "Ask about admissions",
    destination: "/admissions",
    publicContactRoute: "/admissions",
    windowState: "dated",
    opensOn: "2026-09-01",
    closesOn: "2027-03-31",
    decisionBy: "2027-04-30",
    evidenceIds: ["EVD-ADMISSIONS-CURRENT"],
    claimIds: ["CLAIM-ADMISSIONS-CTA"],
    factState: "confirmed",
    reviewStatus: "review-required",
  });
  draft.programmeGovernance.push({
    id: "GOV-SCHOOL-OPERATOR",
    programmeId: "school-academics",
    route: "/school/academics",
    academicYear: "2026-2027",
    responsibilityType: "official-operator",
    organisationId: "ORG-SCHOOL",
    publicWording: null,
    claimIds: [],
    evidenceIds: ["EVD-GOVERNANCE-CURRENT"],
    factState: "confirmed",
    validFrom: "2026-06-01",
    validUntil: "2027-05-31",
    reviewStatus: "review-required",
  });
  draft.organisationRelationships.push({
    id: "REL-SCHOOL-PARTNER",
    fromOrganisationId: "ORG-SCHOOL",
    toOrganisationId: "ORG-PARTNER",
    programmeIds: ["jee-neet"],
    relationshipType: "academic-partner",
    publicWording: "Reviewed relationship wording",
    termDecisions: {
      academicWing: "no",
      coachingWing: "no",
      partner: "yes",
      integrated: "no",
    },
    claimId: "CLAIM-PARTNER-RELATIONSHIP",
    evidenceIds: ["EVD-PARTNERSHIP-CURRENT"],
    factState: "confirmed",
    validFrom: "2026-06-01",
    validUntil: "2027-05-31",
    reviewStatus: "review-required",
  });
  draft.boardAndStatus.push({
    id: "STATUS-SCHOOL-CBSE",
    programmeId: "school-academics",
    organisationId: "ORG-SCHOOL",
    route: "/school/academics",
    boardType: "cbse",
    boardName: "Reviewed board name",
    institutionalStatus: "affiliated",
    officialRecognisedInstitutionName: "Reviewed institution name",
    publicStatusWording: "Reviewed institutional-status wording",
    claimId: "CLAIM-SCHOOL-STATUS",
    evidenceIds: ["EVD-AFFILIATION-CURRENT"],
    factState: "confirmed",
    validFrom: "2026-06-01",
    validUntil: "2027-05-31",
    reviewStatus: "review-required",
  });
  draft.institutionalIdentifiers.push({
    id: "IDENT-SCHOOL-AFFILIATION",
    programmeId: "school-academics",
    organisationId: "ORG-SCHOOL",
    route: "/school/academics",
    identifierType: "affiliation-or-recognition-number",
    publicValue: "REVIEWED-IDENTIFIER",
    claimId: "CLAIM-SCHOOL-IDENTIFIER",
    evidenceIds: ["EVD-AFFILIATION-CURRENT"],
    factState: "confirmed",
    validFrom: "2026-06-01",
    validUntil: "2027-05-31",
    reviewStatus: "review-required",
  });
  draft.campusAvailability.push({
    id: "CAMPUS-AVAIL-SCHOOL-2026",
    campusId: "CMP-MAIN",
    programmeId: "school-academics",
    route: "/school/academics",
    academicYear: "2026-2027",
    availability: "available",
    deliveryMode: "on-campus",
    durationSummary: "Current academic year",
    batchCount: 2,
    intakeCapacity: 120,
    publicAvailabilityWording: "Reviewed campus availability wording",
    evidenceIds: ["EVD-CAMPUS-CURRENT"],
    claimIds: ["CLAIM-CAMPUS-AVAILABILITY"],
    factState: "confirmed",
    validFrom: "2026-06-01",
    validUntil: "2027-05-31",
    reviewStatus: "review-required",
  });
  return draft;
}

test("pins the unchanged v1.0 schema and keeps v1.1 outside the live validator", async () => {
  const [v1SchemaText, v1Source, registryText] = await Promise.all([
    readFile(new URL("../content/programmes-publication.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../lib/programmes-publication.ts", import.meta.url), "utf8"),
    readFile(new URL("../content/programmes-publication-contract-registry.json", import.meta.url), "utf8"),
  ]);
  const digest = createHash("sha256").update(v1SchemaText).digest("hex");
  const registry = JSON.parse(registryText);
  assert.equal(digest, PROGRAMMES_PUBLICATION_V1_SCHEMA_SHA256);
  assert.equal(registry.activeContractVersion, "1.0.0");
  assert.equal(registry.contracts[0].schemaSha256, digest);
  assert.equal(registry.contracts[1].status, "draft-not-activated");
  assert.match(v1Source, /PROGRAMMES_PUBLICATION_SCHEMA_VERSION = "1\.0\.0"/);
  const runtimeResult = validateProgrammesPublicationPackage({ packageData: { schemaVersion: "1.1.0" } });
  assert.equal(runtimeResult.valid, false);
  assert.equal(runtimeResult.issues.some((issue) => issue.code === "UNSUPPORTED_SCHEMA_VERSION"), true);
});

test("defines the strict draft collections and aligns document kinds", async () => {
  const schema = JSON.parse(await readFile(new URL("../content/programmes-publication-v1.1-draft.schema.json", import.meta.url), "utf8"));
  assert.deepEqual(PROGRAMMES_PUBLICATION_V11_DRAFT_COLLECTIONS.map((collection) => collection.id), [
    "publicDocuments",
    "admissionsActions",
    "programmeGovernance",
    "organisationRelationships",
    "boardAndStatus",
    "institutionalIdentifiers",
    "campusAvailability",
  ]);
  for (const collection of PROGRAMMES_PUBLICATION_V11_DRAFT_COLLECTIONS) {
    assert.equal(schema.required.includes(collection.id), true);
  }
  for (const definition of ["publicDocument", "admissionsAction", "programmeGovernance", "organisationRelationship", "boardAndStatus", "institutionalIdentifier", "campusAvailability", "guardrails"]) {
    assert.equal(schema.$defs[definition].additionalProperties, false, `${definition} must reject unknown fields`);
  }
  assert.deepEqual(schema.$defs.publicDocument.properties.kind.enum, [...PROGRAMME_DOCUMENT_KINDS]);
  assert.deepEqual(schema.$defs.reviewStatus.enum, ["draft", "review-required", "withdrawn"]);
  assert.doesNotMatch(JSON.stringify(schema.$defs.admissionsAction), /relationshipType|publicWording|termDecisions/);
  assert.match(JSON.stringify(schema.$defs.organisationRelationship), /no-current-relationship/);
  assert.equal(schema.$defs.guardrails.properties.publicContentPublished.const, false);
  assert.equal(schema.$defs.guardrails.properties.schemaActivated.const, false);
  assert.equal(schema.$defs.guardrails.properties.deploymentPerformed.const, false);
});

test("accepts a strictly bound draft supplement but never authorizes publication", () => {
  const result = validateProgrammesPublicationV11DraftSupplement(populatedDraft());
  assert.equal(result.valid, true, result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
  assert.equal(result.status, "draft-only");
  assert.equal(result.publicationAuthorized, false);
  assert.equal(Object.isFrozen(result), true);
});

test("rejects drift, unsafe actions, mismatched routes and unsupported approval", () => {
  const drifted = populatedDraft();
  drifted.basePackage.schemaSha256 = "b".repeat(64);
  assert.equal(validateProgrammesPublicationV11DraftSupplement(drifted).issues.some((issue) => issue.code === "BASE_CONTRACT_MISMATCH"), true);

  const unsafe = populatedDraft();
  unsafe.admissionsActions[0].destination = "http://example.com/apply";
  assert.equal(validateProgrammesPublicationV11DraftSupplement(unsafe).issues.some((issue) => issue.code === "UNSAFE_DESTINATION"), true);

  const mismatched = populatedDraft();
  mismatched.boardAndStatus[0].route = "/junior-college";
  assert.equal(validateProgrammesPublicationV11DraftSupplement(mismatched).issues.some((issue) => issue.code === "ROUTE_PROGRAMME_MISMATCH"), true);

  const approved = populatedDraft();
  approved.campusAvailability[0].reviewStatus = "approved";
  assert.equal(validateProgrammesPublicationV11DraftSupplement(approved).issues.some((issue) => issue.code === "PUBLICATION_STATUS_FORBIDDEN"), true);

  const unknown = populatedDraft();
  unknown.publicDocuments[0].sourcePath = "C:\\private\\brochure.pdf";
  assert.equal(validateProgrammesPublicationV11DraftSupplement(unknown).issues.some((issue) => issue.code === "UNKNOWN_FIELD"), true);
});

test("fails closed on invented document bindings, missing evidence and invalid years", () => {
  const inventedBrochure = populatedDraft();
  inventedBrochure.publicDocuments[1].publicDocumentId = "invented-brochure";
  inventedBrochure.publicDocuments[1].pipelineRecordId = "document-invented-brochure";
  assert.equal(validateProgrammesPublicationV11DraftSupplement(inventedBrochure).issues.some((issue) => issue.code === "DOCUMENT_CATALOGUE_MISMATCH"), true);

  const missingEvidence = populatedDraft();
  missingEvidence.organisationRelationships[0].evidenceIds = [];
  assert.equal(validateProgrammesPublicationV11DraftSupplement(missingEvidence).issues.some((issue) => issue.code === "MISSING_EVIDENCE"), true);

  const invalidYear = populatedDraft();
  invalidYear.academicYear = "2026-2028";
  invalidYear.campusAvailability[0].academicYear = "2026-2028";
  const result = validateProgrammesPublicationV11DraftSupplement(invalidYear);
  assert.equal(result.issues.some((issue) => issue.code === "INVALID_ACADEMIC_YEAR"), true);
  assert.equal(result.issues.some((issue) => issue.path.includes("campusAvailability")), true);
});

test("preserves a confirmed no-current relationship only as an evidence-bound terminology restriction", () => {
  const restricted = populatedDraft();
  restricted.organisationRelationships[0] = {
    ...restricted.organisationRelationships[0],
    relationshipType: "no-current-relationship",
    publicWording: null,
    termDecisions: {
      academicWing: "no",
      coachingWing: "no",
      partner: "no",
      integrated: "no",
    },
    claimId: null,
  };
  assert.equal(validateProgrammesPublicationV11DraftSupplement(restricted).valid, true);

  const unsafeTerm = structuredClone(restricted);
  unsafeTerm.organisationRelationships[0].termDecisions.partner = "yes";
  assert.equal(validateProgrammesPublicationV11DraftSupplement(unsafeTerm).issues.some((issue) => issue.code === "INVALID_RECORD"), true);

  const unproved = structuredClone(restricted);
  unproved.organisationRelationships[0].evidenceIds = [];
  assert.equal(validateProgrammesPublicationV11DraftSupplement(unproved).issues.some((issue) => issue.code === "MISSING_EVIDENCE"), true);
});

test("keeps the draft out of public navigation, layout, sitemap and route output", async () => {
  const [home, layout, sitemap, navigation, header, footer, guide, privatePage, packageJsonText] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/navigation.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/site-header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/site-footer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../docs/programmes-contract-v1.1-draft.md", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/programmes-contract-v1-1/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(`${home}\n${layout}\n${sitemap}\n${navigation}\n${header}\n${footer}`, /programmes-publication-v1-1-draft|programmes-contract-v1-1/);
  assert.match(privatePage, /requireChatGPTUser\("\/publication-review\/programmes-contract-v1-1"\)/);
  assert.match(privatePage, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(guide, /does not issue a Programme\s+render gate/i);
  const packageJson = JSON.parse(packageJsonText);
  assert.match(packageJson.scripts["test:contract"], /programmes-contract-v1-1-draft\.test\.mjs/);
  assert.match(packageJson.scripts["test:review"], /programmes-contract-v1-1-draft\.test\.mjs/);
});
