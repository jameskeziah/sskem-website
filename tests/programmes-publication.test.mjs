import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildProgrammesNavigation,
  buildProgrammesSitemap,
  canonicalizeProgrammesPackage,
  createProgrammesImplementationPlan,
  digestProgrammesPackage,
  validateProgrammesPublicationPackage,
} from "../lib/programmes-publication.ts";
import { PROGRAMMES_PUBLICATION_ROUTES } from "../lib/programmes-publication-routes.ts";
import {
  isApprovedProgrammeRenderGate,
  issueApprovedProgrammeRenderGate,
} from "../lib/programmes-render-gate.ts";
import {
  adaptProgrammesPublicationPackage,
  isIssuedProgrammePageData,
  PROGRAMME_INSTITUTIONAL_MODEL_RULES,
} from "../lib/programmes-data-adapter.ts";
import {
  isIssuedProgrammeExpiryProjection,
  planProgrammeExpiryRollback,
  resolveProgrammeExpiryProjection,
  validateProgrammeExpiryReceipt,
} from "../lib/programmes-expiry.ts";
import {
  buildBreadcrumbListSchema,
  buildEducationalOrganizationSchema,
  buildEducationalProgrammeSchema,
  buildProgrammeSeo,
  serializeProgrammeJsonLd,
} from "../lib/programmes-seo.ts";

const NOW = "2026-09-01T12:00:00.000Z";
const YEAR = "2026-2027";

const configurations = [
  { id: "school-academics", route: "/school/academics", prefix: "SCHOOL", organisationType: "cbse-school", coreEvidenceType: "programme-approval", claimType: "academic", withFee: false, withResult: false, withScholarship: false },
  { id: "junior-college", route: "/junior-college", prefix: "JC", organisationType: "junior-college", coreEvidenceType: "affiliation", claimType: "regulatory", withFee: true, withResult: true, withScholarship: false },
  { id: "jee-neet", route: "/programmes/jee-neet", prefix: "JEE", organisationType: "institute", coreEvidenceType: "programme-approval", claimType: "academic", withFee: true, withResult: true, withScholarship: true },
];

function evidence(id, type, programmeId) {
  return {
    id,
    type,
    status: "verified",
    controlledReference: `CONTROLLED/${id}`,
    validFrom: "2026-06-01",
    validUntil: "2027-05-31",
    programmeIds: [programmeId],
  };
}

function makePackage() {
  const packageData = {
    schemaVersion: "1.0.0",
    packageType: "programmes-publication",
    packageId: "programmes-2026-2027-v1",
    academicYear: YEAR,
    generatedAt: "2026-09-01T10:00:00+05:30",
    approval: {
      status: "approved",
      approvalId: "APR-2026-001",
      approvedByRole: "school-management",
      approvedAt: "2026-09-01T09:00:00+05:30",
      validFrom: "2026-09-01",
      validUntil: "2027-05-31",
    },
    evidenceRegistry: [],
    organisations: [],
    faculty: [],
    facilities: [],
    results: [],
    fees: [],
    scholarships: [],
    media: [],
    claims: [],
    programmes: [],
    navigation: [],
    seo: [],
  };

  for (const config of configurations) {
    const coreEvidenceId = `EVD-${config.prefix}-CORE`;
    const scheduleEvidenceId = `EVD-${config.prefix}-SCHEDULE`;
    const facultyEvidenceId = `EVD-${config.prefix}-FACULTY`;
    const facilityEvidenceId = `EVD-${config.prefix}-FACILITY`;
    const mediaEvidenceId = `EVD-${config.prefix}-MEDIA`;
    const feeEvidenceId = `EVD-${config.prefix}-FEE`;
    const resultEvidenceId = `EVD-${config.prefix}-RESULT`;
    const scholarshipEvidenceId = `EVD-${config.prefix}-SCHOLARSHIP`;
    const organisationId = `ORG-${config.prefix}`;
    const facultyId = `FAC-${config.prefix}`;
    const facilityId = `FACILITY-${config.prefix}`;
    const mediaId = `MEDIA-${config.prefix}-HERO`;
    const coreClaimId = `CLAIM-${config.prefix}-CORE`;
    const feeClaimId = `CLAIM-${config.prefix}-FEE`;
    const resultClaimId = `CLAIM-${config.prefix}-RESULT`;
    const scholarshipClaimId = `CLAIM-${config.prefix}-SCHOLARSHIP`;
    const feeId = `FEE-${config.prefix}-ANNUAL`;
    const resultId = `RESULT-${config.prefix}-AGGREGATE`;
    const scholarshipId = `SCH-${config.prefix}-MERIT`;

    packageData.evidenceRegistry.push(
      evidence(coreEvidenceId, config.coreEvidenceType, config.id),
      evidence(scheduleEvidenceId, "schedule", config.id),
      evidence(facultyEvidenceId, "faculty-qualification", config.id),
      evidence(facilityEvidenceId, "facility", config.id),
      evidence(mediaEvidenceId, "media-rights", config.id),
    );
    if (config.withFee) packageData.evidenceRegistry.push(evidence(feeEvidenceId, "fee-circular", config.id));
    if (config.withResult) packageData.evidenceRegistry.push(evidence(resultEvidenceId, "aggregate-result", config.id));
    if (config.withScholarship) packageData.evidenceRegistry.push(evidence(scholarshipEvidenceId, "scholarship", config.id));

    packageData.claims.push({
      id: coreClaimId,
      type: config.claimType,
      text: `Approved public ${config.id} programme statement`,
      status: "approved",
      manifestRecordId: `claim-${config.id}-core`,
      programmeIds: [config.id],
      organisationIds: [organisationId],
      evidenceIds: [coreEvidenceId],
      validFrom: "2026-09-01",
      validUntil: "2027-05-31",
    });
    if (config.withFee) packageData.claims.push({
      id: feeClaimId,
      type: "financial",
      text: `Approved public ${config.id} fee statement`,
      status: "approved",
      manifestRecordId: `claim-${config.id}-fee`,
      programmeIds: [config.id],
      organisationIds: [organisationId],
      evidenceIds: [feeEvidenceId],
      validFrom: "2026-09-01",
      validUntil: "2027-05-31",
    });
    if (config.withResult) packageData.claims.push({
      id: resultClaimId,
      type: "performance",
      text: `Approved aggregate ${config.id} result statement`,
      status: "approved",
      manifestRecordId: `claim-${config.id}-result`,
      programmeIds: [config.id],
      organisationIds: [organisationId],
      evidenceIds: [resultEvidenceId],
      validFrom: "2026-09-01",
      validUntil: "2027-05-31",
    });
    if (config.withScholarship) packageData.claims.push({
      id: scholarshipClaimId,
      type: "financial",
      text: `Approved public ${config.id} scholarship statement`,
      status: "approved",
      manifestRecordId: `claim-${config.id}-scholarship`,
      programmeIds: [config.id],
      organisationIds: [organisationId],
      evidenceIds: [scholarshipEvidenceId],
      validFrom: "2026-09-01",
      validUntil: "2027-05-31",
    });

    packageData.organisations.push({
      id: organisationId,
      officialName: `Approved ${config.id} organisation`,
      type: config.organisationType,
      status: "approved",
      evidenceIds: [coreEvidenceId],
      claimIds: [coreClaimId],
    });
    packageData.faculty.push({
      id: facultyId,
      publicDisplayName: `Approved ${config.prefix} faculty profile`,
      publicRole: "Faculty",
      publicQualificationSummary: "Verified public qualification summary",
      subjectsOrFunctions: ["Academic delivery"],
      programmeIds: [config.id],
      evidenceIds: [facultyEvidenceId],
      claimIds: [],
      publicationStatus: "approved",
      consentStatus: "approved",
    });
    packageData.facilities.push({
      id: facilityId,
      publicName: `${config.prefix} learning facility`,
      publicSummary: "Approved public facility summary",
      programmeIds: [config.id],
      evidenceIds: [facilityEvidenceId],
      mediaIds: [],
      status: "approved",
    });
    packageData.media.push({
      id: mediaId,
      type: "image",
      role: "hero",
      status: "approved",
      manifestRecordId: `media-${config.id}-hero`,
      programmeIds: [config.id],
      alt: `Approved ${config.id} programme setting`,
      containsPeople: false,
      rights: { status: "verified", evidenceIds: [mediaEvidenceId] },
      consent: { status: "not-applicable", evidenceIds: [] },
    });
    if (config.withFee) packageData.fees.push({
      id: feeId,
      programmeId: config.id,
      academicYear: YEAR,
      category: "Annual programme fee",
      approvedPublicWording: "Use the approved current fee circular for the exact amount.",
      currency: "INR",
      amount: null,
      evidenceIds: [feeEvidenceId],
      claimIds: [feeClaimId],
      status: "approved",
    });
    if (config.withResult) packageData.results.push({
      id: resultId,
      programmeId: config.id,
      exam: "Approved examination",
      year: 2025,
      cohortDefinition: "Approved aggregate cohort definition",
      aggregateMetric: "Approved aggregate metric",
      aggregateValue: "Approved aggregate value",
      claimId: resultClaimId,
      verification: { status: "verified", evidenceIds: [resultEvidenceId] },
      publicationStatus: "approved",
    });
    if (config.withScholarship) packageData.scholarships.push({
      id: scholarshipId,
      programmeId: config.id,
      academicYear: YEAR,
      publicName: "Approved merit scholarship",
      eligibilitySummary: "Approved scholarship eligibility summary",
      benefitSummary: "Approved scholarship benefit summary",
      evidenceIds: [scholarshipEvidenceId],
      claimIds: [scholarshipClaimId],
      status: "approved",
    });

    packageData.navigation.push({
      id: `NAV-${config.prefix}`,
      programmeId: config.id,
      label: config.id === "jee-neet" ? "JEE & NEET" : config.id === "junior-college" ? "Junior College" : "Academics",
      parent: config.id === "school-academics" ? "School" : "Programmes",
      order: config.id === "school-academics" ? 10 : config.id === "junior-college" ? 20 : 30,
      status: "approved",
    });
    packageData.seo.push({
      id: `SEO-${config.prefix}`,
      programmeId: config.id,
      title: `Approved ${config.id} programme information`,
      description: `Approved public description for the ${config.id} programme, its academic structure, eligibility, facilities and admission guidance.`,
      canonicalPath: config.route,
      index: true,
      follow: true,
      ogMediaId: mediaId,
      status: "approved",
    });
    packageData.programmes.push({
      id: config.id,
      route: config.route,
      status: "approved",
      approvalStatus: "approved",
      academicYear: YEAR,
      organisationId,
      identity: {
        eyebrow: "Approved programme",
        title: `Approved ${config.id} title`,
        summary: `Approved public ${config.id} programme summary`,
      },
      academic: {
        levels: ["Class XI", "Class XII"],
        streams: config.id === "school-academics" ? [] : ["Science"],
        subjects: ["Physics", "Chemistry", "Mathematics"],
        exams: config.id === "jee-neet" ? ["JEE Main", "NEET-UG"] : [],
        curriculumSummary: "Approved public curriculum summary",
        teachingMethodology: "Approved public teaching methodology",
        testingAndAssessment: "Approved public testing and assessment summary",
        studentSupport: "Approved public student support summary",
        deliveryModel: config.id === "jee-neet" ? "Approved public delivery model" : "",
        operatorSummary: config.id === "jee-neet" ? "Approved public operator relationship" : "",
        studyMaterial: config.id === "jee-neet" ? "Approved public study-material summary" : "",
      },
      eligibility: { academicYear: YEAR, summary: "Approved current eligibility summary", evidenceIds: [coreEvidenceId] },
      schedule: { academicYear: YEAR, summary: "Approved current schedule summary", evidenceIds: [scheduleEvidenceId] },
      admission: { academicYear: YEAR, summary: "Approved current admission summary", evidenceIds: [coreEvidenceId] },
      resultsPublication: config.withResult ? "verified-results-approved" : "no-results-published",
      feeIds: config.withFee ? [feeId] : [],
      facultyIds: [facultyId],
      facilityIds: [facilityId],
      resultIds: config.withResult ? [resultId] : [],
      scholarshipIds: config.withScholarship ? [scholarshipId] : [],
      mediaIds: [mediaId],
      evidenceIds: [coreEvidenceId],
      claimIds: [coreClaimId],
      relatedProgrammeIds: configurations.filter((candidate) => candidate.id !== config.id).map((candidate) => candidate.id),
      navigationId: `NAV-${config.prefix}`,
      seoId: `SEO-${config.prefix}`,
    });
  }

  return packageData;
}

function approvedManifest(packageData) {
  return {
    records: [
      ...packageData.claims.map((claim) => ({
        id: claim.manifestRecordId,
        kind: "claim",
        decision: "approved",
        publicTargets: claim.programmeIds.map((id) => configurations.find((config) => config.id === id).route),
        approvedAt: "2026-09-01T08:00:00.000Z",
        expiresAt: "2027-05-31",
      })),
      ...packageData.media.map((media) => ({
        id: media.manifestRecordId,
        kind: "media",
        decision: "approved",
        publicTargets: media.programmeIds.map((id) => configurations.find((config) => config.id === id).route),
        approvedAt: "2026-09-01T08:00:00.000Z",
        expiresAt: "2027-05-31",
      })),
    ],
  };
}

function validate(packageData = makePackage(), now = NOW) {
  return validateProgrammesPublicationPackage({ packageData, manifest: approvedManifest(packageData), now });
}

test("validates one immutable package and produces three independently ready route plans", () => {
  const packageData = makePackage();
  const before = structuredClone(packageData);
  const plan = createProgrammesImplementationPlan({ packageData, manifest: approvedManifest(packageData), now: NOW });
  assert.equal(plan.validation.status, "READY", JSON.stringify(plan.validation.blockingErrors, null, 2));
  assert.equal(plan.receipt.publicationAuthorized, true);
  assert.deepEqual(Object.keys(plan.routes), PROGRAMMES_PUBLICATION_ROUTES);
  assert.deepEqual(plan.sitemap, PROGRAMMES_PUBLICATION_ROUTES);
  assert.equal(plan.navigation.length, 3);
  assert.equal(plan.guardrails.repositoryWritePerformed, false);
  assert.equal(plan.guardrails.publicContentPublished, false);
  assert.equal(Object.isFrozen(plan), true);
  assert.deepEqual(packageData, before);
});

test("issues an opaque route-level render gate only from the exact ready implementation plan", () => {
  const packageData = makePackage();
  const plan = createProgrammesImplementationPlan({ packageData, manifest: approvedManifest(packageData), now: NOW });
  const gate = issueApprovedProgrammeRenderGate(plan, "/programmes/jee-neet");

  assert.ok(gate);
  assert.equal(isApprovedProgrammeRenderGate(gate, "/programmes/jee-neet"), true);
  assert.equal(isApprovedProgrammeRenderGate(gate, "/junior-college"), false);
  assert.equal(isApprovedProgrammeRenderGate({ ...gate }, "/programmes/jee-neet"), false);

  const blockedPackage = makePackage();
  blockedPackage.programmes.find((programme) => programme.id === "jee-neet").status = "draft";
  const blockedPlan = createProgrammesImplementationPlan({ packageData: blockedPackage, manifest: approvedManifest(blockedPackage), now: NOW });
  assert.equal(issueApprovedProgrammeRenderGate(blockedPlan, "/programmes/jee-neet"), null);
});

test("rejects unsupported versions, unknown fields, duplicate IDs and duplicate routes", () => {
  const unsupported = makePackage();
  unsupported.schemaVersion = "1.1.0";
  assert.ok(validate(unsupported).issues.some((issue) => issue.code === "UNSUPPORTED_SCHEMA_VERSION"));

  const unknown = makePackage();
  unknown.programmes[0].marketingOverride = true;
  assert.ok(validate(unknown).issues.some((issue) => issue.code === "UNKNOWN_FIELD"));

  const duplicateId = makePackage();
  duplicateId.claims.push(structuredClone(duplicateId.claims[0]));
  assert.ok(validate(duplicateId).issues.some((issue) => issue.code === "DUPLICATE_ID"));

  const duplicateRoute = makePackage();
  duplicateRoute.programmes[1].route = duplicateRoute.programmes[0].route;
  assert.ok(validate(duplicateRoute).issues.some((issue) => issue.code === "DUPLICATE_ROUTE"));
});

test("most restrictive status wins and blocked programmes stay out of navigation and sitemap", () => {
  const packageData = makePackage();
  packageData.programmes[2].approvalStatus = "draft";
  const result = validate(packageData);
  assert.equal(result.routes["/programmes/jee-neet"].publicationReady, false);
  assert.equal(result.routes["/programmes/jee-neet"].showInNavigation, false);
  assert.equal(buildProgrammesNavigation(result.routes, packageData).some((item) => item.href === "/programmes/jee-neet"), false);
  assert.equal(buildProgrammesSitemap(result.routes).includes("/programmes/jee-neet"), false);
});

test("keeps navigation downstream of route publication readiness", () => {
  const packageData = makePackage();
  packageData.navigation.find((record) => record.id === "NAV-JEE").status = "draft";
  const result = validate(packageData);
  assert.equal(result.routes["/programmes/jee-neet"].publicationReady, true);
  assert.equal(result.routes["/programmes/jee-neet"].navigationValid, false);
  assert.equal(result.routes["/programmes/jee-neet"].showInNavigation, false);
  assert.equal(result.routes["/programmes/jee-neet"].includeInSitemap, true);
});

test("blocks missing, pending, expired and wrongly scoped evidence", () => {
  const missing = makePackage();
  missing.programmes[0].evidenceIds = ["EVD-DOES-NOT-EXIST"];
  assert.ok(validate(missing).issues.some((issue) => issue.code === "MISSING_EVIDENCE"));

  const pending = makePackage();
  pending.evidenceRegistry.find((record) => record.id === "EVD-JC-CORE").status = "pending";
  assert.ok(validate(pending).issues.some((issue) => issue.code === "UNVERIFIED_EVIDENCE"));

  const expired = makePackage();
  expired.evidenceRegistry.find((record) => record.id === "EVD-JEE-CORE").validUntil = "2026-08-31";
  assert.ok(validate(expired).issues.some((issue) => issue.code === "EXPIRED_EVIDENCE"));

  const wrongScope = makePackage();
  wrongScope.evidenceRegistry.find((record) => record.id === "EVD-JC-CORE").programmeIds = ["school-academics"];
  assert.ok(validate(wrongScope).issues.some((issue) => issue.code === "EVIDENCE_SCOPE_MISMATCH"));
});

test("blocks expired approvals and current-year records from another academic year", () => {
  const expired = makePackage();
  expired.approval.validUntil = "2026-08-31";
  assert.ok(validate(expired).issues.some((issue) => issue.code === "EXPIRED_APPROVAL"));

  const wrongYear = makePackage();
  wrongYear.fees.find((record) => record.id === "FEE-JEE-ANNUAL").academicYear = "2025-2026";
  assert.ok(validate(wrongYear).issues.some((issue) => issue.code === "ACADEMIC_YEAR_MISMATCH"));
});

test("historical aggregate results may predate the package but unverified results block the whole route", () => {
  const historical = makePackage();
  historical.results[0].year = 2024;
  assert.equal(validate(historical).routes["/junior-college"].publicationReady, true);

  const unverified = makePackage();
  unverified.results.find((record) => record.id === "RESULT-JEE-AGGREGATE").verification.status = "pending";
  const result = validate(unverified);
  assert.ok(result.issues.some((issue) => issue.code === "UNVERIFIED_RESULT"));
  assert.equal(result.routes["/programmes/jee-neet"].publicationReady, false);
});

test("never silently drops broken canonical references or evidence-required claims", () => {
  for (const field of ["facultyIds", "facilityIds", "feeIds", "mediaIds", "resultIds"]) {
    const packageData = makePackage();
    packageData.programmes[2][field] = [`${field.toUpperCase()}-MISSING`];
    assert.ok(validate(packageData).issues.some((issue) => issue.code === "BROKEN_REFERENCE"), field);
  }

  const unsupportedClaim = makePackage();
  const claim = unsupportedClaim.claims.find((record) => record.id === "CLAIM-JEE-RESULT");
  claim.evidenceIds = [];
  assert.ok(validate(unsupportedClaim).issues.some((issue) => issue.code === "CLAIM_EVIDENCE_REQUIRED"));
});

test("keeps pupil identities, approver identities and private evidence locations outside the package", () => {
  const pupil = makePackage();
  pupil.results[0].studentName = "Not allowed";
  assert.ok(validate(pupil).issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path.endsWith("studentName")));

  const identity = makePackage();
  identity.approval.approvedBy = "Named person";
  assert.ok(validate(identity).issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path.endsWith("approvedBy")));

  const path = makePackage();
  path.evidenceRegistry[0].controlledReference = "C:\\private\\evidence.pdf";
  assert.ok(validate(path).issues.some((issue) => issue.code === "UNSAFE_EVIDENCE_REFERENCE"));
});

test("canonical digests ignore object key order and detect any approved-data mutation", () => {
  const packageData = makePackage();
  const reordered = Object.fromEntries(Object.entries(packageData).reverse());
  assert.equal(canonicalizeProgrammesPackage({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.equal(digestProgrammesPackage(packageData), digestProgrammesPackage(reordered));

  const changed = structuredClone(packageData);
  changed.fees[0].amount = 1;
  assert.notEqual(digestProgrammesPackage(packageData), digestProgrammesPackage(changed));
});

test("adapts one exact approved package into immutable component-ready page data", () => {
  const packageData = makePackage();
  const before = structuredClone(packageData);
  const result = adaptProgrammesPublicationPackage({ packageData, manifest: approvedManifest(packageData), now: NOW });

  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues, null, 2));
  assert.equal(result.status, "READY");
  assert.deepEqual(Object.keys(result.pages), PROGRAMMES_PUBLICATION_ROUTES);
  assert.match(result.packageDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.pages["/programmes/jee-neet"].components), true);
  assert.equal(isApprovedProgrammeRenderGate(result.pages["/programmes/jee-neet"].gate, "/programmes/jee-neet"), true);
  assert.equal(result.pages["/programmes/jee-neet"].components.results.results.length, 1);
  assert.equal(result.pages["/programmes/jee-neet"].components.feeSummary.fees.length, 1);
  assert.equal(result.pages["/programmes/jee-neet"].components.schedule.validUntil, "2027-05-31");
  assert.equal(result.pages["/programmes/jee-neet"].components.feeSummary.validUntil, "2027-05-31");
  assert.equal(result.pages["/programmes/jee-neet"].components.results.results[0].validUntil, "2027-05-31");
  assert.equal(result.pages["/programmes/jee-neet"].components.admissionsCta.validUntil, "2027-05-31");
  assert.deepEqual(result.pages["/programmes/jee-neet"].components.documents.documents, []);
  assert.equal(result.limitations[0].code, "DOCUMENTS_NOT_MODELLED_IN_V1");
  assert.deepEqual(packageData, before);

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /CONTROLLED\//);
  assert.doesNotMatch(serialized, /manifestRecordId/);
  assert.doesNotMatch(serialized, /approvedByRole|approvalId/);
});

test("projects current Programme sections through their inclusive approval end date", () => {
  const packageData = makePackage();
  const adapted = adaptProgrammesPublicationPackage({ packageData, manifest: approvedManifest(packageData), now: NOW });
  assert.equal(adapted.ok, true, adapted.ok ? undefined : JSON.stringify(adapted.issues, null, 2));
  const page = adapted.pages["/programmes/jee-neet"];
  const projection = resolveProgrammeExpiryProjection({ page, now: "2027-05-31T23:59:59.999Z" });

  assert.equal(isIssuedProgrammeExpiryProjection(projection, page.gate), true);
  assert.deepEqual(Object.fromEntries(Object.entries(projection.sections).map(([key, value]) => [key, value.state])), {
    fees: "current",
    schedule: "current",
    results: "current",
    admissions: "current",
  });
  assert.equal(projection.sections.fees.content.fees[0].approvedPublicWording, "Use the approved current fee circular for the exact amount.");
  assert.deepEqual(validateProgrammeExpiryReceipt(projection.receipt), []);
  assert.equal(projection.receipt.controls.repositoryWritePerformed, false);
  assert.equal(projection.receipt.controls.deploymentPerformed, false);
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(isIssuedProgrammeExpiryProjection({ ...projection }, page.gate), false);
});

test("removes expired fee, schedule, result and admissions values and retains canonical safe fallbacks", () => {
  const packageData = makePackage();
  const adapted = adaptProgrammesPublicationPackage({ packageData, manifest: approvedManifest(packageData), now: NOW });
  assert.equal(adapted.ok, true, adapted.ok ? undefined : JSON.stringify(adapted.issues, null, 2));
  const page = adapted.pages["/programmes/jee-neet"];
  const projection = resolveProgrammeExpiryProjection({ page, now: "2027-06-01T00:00:00.000Z" });

  for (const [section, decision] of Object.entries(projection.sections)) {
    assert.equal(decision.state, "fallback", section);
    assert.equal(decision.reason, "expired", section);
    assert.equal(decision.content, null, section);
    assert.equal(decision.fallback.action.href, "/contact", section);
  }
  assert.deepEqual(validateProgrammeExpiryReceipt(projection.receipt), []);
  const serialized = JSON.stringify(projection);
  assert.doesNotMatch(serialized, /Use the approved current fee circular/);
  assert.doesNotMatch(serialized, /Approved current schedule summary/);
  assert.doesNotMatch(serialized, /Approved aggregate value/);
  assert.doesNotMatch(serialized, /Approved current admission summary/);

  const school = resolveProgrammeExpiryProjection({
    page: adapted.pages["/school/academics"],
    now: "2027-06-01T00:00:00.000Z",
  });
  assert.equal(school.sections.fees.state, "not-applicable");
  assert.equal(school.sections.results.state, "not-applicable");
  assert.equal(school.sections.schedule.state, "fallback");
  assert.equal(school.sections.admissions.state, "fallback");
});

test("issues an exact rollback target but blocks restoration after its content expires", () => {
  const packageData = makePackage();
  const adapted = adaptProgrammesPublicationPackage({ packageData, manifest: approvedManifest(packageData), now: NOW });
  assert.equal(adapted.ok, true, adapted.ok ? undefined : JSON.stringify(adapted.issues, null, 2));
  const page = adapted.pages["/programmes/jee-neet"];
  const target = resolveProgrammeExpiryProjection({ page, now: "2026-09-01T12:00:00.000Z" });
  const active = resolveProgrammeExpiryProjection({
    page,
    now: "2026-09-02T12:00:00.000Z",
    previousReceipt: target.receipt,
  });

  assert.equal(active.receipt.rollbackTarget.receiptDigest, target.receipt.receiptDigest);
  const ready = planProgrammeExpiryRollback({
    activeReceipt: active.receipt,
    targetReceipt: target.receipt,
    now: "2026-09-02T12:01:00.000Z",
  });
  assert.equal(ready.status, "ready-for-explicit-rollback");
  assert.deepEqual(ready.blockers, []);
  assert.equal(ready.controls.repositoryWritePerformed, false);

  const expiredActive = resolveProgrammeExpiryProjection({
    page,
    now: "2027-06-01T00:00:00.000Z",
    previousReceipt: target.receipt,
  });
  const blocked = planProgrammeExpiryRollback({
    activeReceipt: expiredActive.receipt,
    targetReceipt: target.receipt,
    now: "2027-06-01T00:00:00.000Z",
  });
  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.some((issue) => /restore expired fees content/i.test(issue)));

  const tampered = structuredClone(target.receipt);
  tampered.sections.fees.validUntil = "2027-06-30";
  assert.ok(validateProgrammeExpiryReceipt(tampered).some((issue) => /digest does not match/i.test(issue)));
  assert.equal(planProgrammeExpiryRollback({ activeReceipt: active.receipt, targetReceipt: tampered }).status, "blocked");
});

test("rejects invalid Programme expiry clocks instead of treating them as current", () => {
  const packageData = makePackage();
  const adapted = adaptProgrammesPublicationPackage({ packageData, manifest: approvedManifest(packageData), now: NOW });
  assert.equal(adapted.ok, true, adapted.ok ? undefined : JSON.stringify(adapted.issues, null, 2));
  assert.throws(
    () => resolveProgrammeExpiryProjection({ page: adapted.pages["/junior-college"], now: "not-a-date" }),
    /valid current time/i,
  );
});

test("programme data adapter atomically rejects expired approvals, missing evidence and unverified results", () => {
  const cases = [
    {
      code: "EXPIRED_APPROVAL",
      mutate(packageData) { packageData.approval.validUntil = "2026-08-31"; },
    },
    {
      code: "MISSING_EVIDENCE",
      mutate(packageData) { packageData.programmes[0].evidenceIds = ["EVD-DOES-NOT-EXIST"]; },
    },
    {
      code: "UNVERIFIED_RESULT",
      mutate(packageData) { packageData.results.find((record) => record.id === "RESULT-JEE-AGGREGATE").verification.status = "pending"; },
    },
  ];

  for (const scenario of cases) {
    const packageData = makePackage();
    scenario.mutate(packageData);
    const result = adaptProgrammesPublicationPackage({ packageData, manifest: approvedManifest(packageData), now: NOW });
    assert.equal(result.ok, false, scenario.code);
    assert.equal(result.pages, null, scenario.code);
    assert.ok(result.issues.some((issue) => issue.code === scenario.code), scenario.code);
  }
});

test("programme data adapter rejects incompatible institutional models without narrowing valid JEE ownership", () => {
  assert.deepEqual(PROGRAMME_INSTITUTIONAL_MODEL_RULES["/school/academics"], ["cbse-school"]);
  assert.deepEqual(PROGRAMME_INSTITUTIONAL_MODEL_RULES["/junior-college"], ["junior-college"]);
  assert.deepEqual(PROGRAMME_INSTITUTIONAL_MODEL_RULES["/programmes/jee-neet"], ["cbse-school", "junior-college", "institute"]);

  const incompatible = makePackage();
  incompatible.organisations.find((record) => record.id === "ORG-SCHOOL").type = "junior-college";
  const rejected = adaptProgrammesPublicationPackage({ packageData: incompatible, manifest: approvedManifest(incompatible), now: NOW });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.pages, null);
  assert.ok(rejected.issues.some((issue) => issue.code === "INCOMPATIBLE_INSTITUTIONAL_MODEL" && issue.route === "/school/academics"));

  const schoolOperatedPreparation = makePackage();
  schoolOperatedPreparation.organisations.find((record) => record.id === "ORG-JEE").type = "cbse-school";
  const accepted = adaptProgrammesPublicationPackage({ packageData: schoolOperatedPreparation, manifest: approvedManifest(schoolOperatedPreparation), now: NOW });
  assert.equal(accepted.ok, true, accepted.ok ? undefined : JSON.stringify(accepted.issues, null, 2));
});

test("programme data adapter keeps navigation approval downstream of page conversion", () => {
  const packageData = makePackage();
  packageData.navigation.find((record) => record.id === "NAV-JEE").status = "draft";
  const result = adaptProgrammesPublicationPackage({ packageData, manifest: approvedManifest(packageData), now: NOW });

  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues, null, 2));
  assert.equal(result.pages["/programmes/jee-neet"].navigation, null);
  assert.ok(result.warnings.some((issue) => issue.code === "NAVIGATION_NOT_APPROVED"));
});

test("SEO engine accepts only adapter-issued page data and prepares exact metadata and canonical URLs", () => {
  const packageData = makePackage();
  const adapted = adaptProgrammesPublicationPackage({ packageData, manifest: approvedManifest(packageData), now: NOW });
  assert.equal(adapted.ok, true, adapted.ok ? undefined : JSON.stringify(adapted.issues, null, 2));
  const page = adapted.pages["/programmes/jee-neet"];

  assert.equal(isIssuedProgrammePageData(page, "/programmes/jee-neet"), true);
  assert.equal(isIssuedProgrammePageData({ ...page }, "/programmes/jee-neet"), false);
  const seo = buildProgrammeSeo(page);
  assert.equal(seo.ok, true, seo.ok ? undefined : JSON.stringify(seo.issues, null, 2));
  assert.equal(seo.metadata.title, page.metadata.title);
  assert.equal(seo.metadata.description, page.metadata.description);
  assert.equal(seo.canonicalUrl, "https://www.sskemschool.com/programmes/jee-neet");
  assert.equal(seo.metadata.alternates.canonical, seo.canonicalUrl);
  assert.deepEqual(seo.breadcrumbs.map((item) => item.name), ["Home", "JEE & NEET"]);
  assert.deepEqual(seo.structuredData.graph["@graph"].map((node) => node["@type"]), [
    "EducationalOrganization",
    "EducationalOccupationalProgram",
    "BreadcrumbList",
  ]);
  assert.deepEqual(seo.structuredData.suppressed, []);
  assert.equal(Object.isFrozen(seo), true);

  const forged = buildProgrammeSeo({ ...page });
  assert.equal(forged.ok, false);
  assert.equal(forged.metadata, null);
  assert.equal(forged.issues[0].code, "UNISSUED_PAGE_DATA");
});

test("structured-data templates suppress incomplete values instead of inserting placeholders", () => {
  const organization = buildEducationalOrganizationSchema({
    id: "https://www.sskemschool.com/#school",
    name: "TBD",
    url: "https://www.sskemschool.com/",
  });
  assert.equal(organization.data, null);
  assert.deepEqual(organization.missingFields, ["name"]);

  const programme = buildEducationalProgrammeSchema({
    id: "https://www.sskemschool.com/junior-college#programme",
    identifier: "junior-college",
    name: "Junior College",
    description: "Approved public programme description",
    url: "https://www.sskemschool.com/junior-college",
    programType: "Junior College",
    programPrerequisites: "Approved eligibility",
    providerId: "https://www.sskemschool.com/junior-college#organization",
    providerName: "Approved Junior College",
    subjects: [],
  });
  assert.equal(programme.data, null);
  assert.ok(programme.missingFields.includes("subjects"));

  const breadcrumb = buildBreadcrumbListSchema({
    id: "https://www.sskemschool.com/junior-college#breadcrumb",
    items: [{ name: "Home", href: "https://www.sskemschool.com/" }],
  });
  assert.equal(breadcrumb.data, null);
  assert.ok(breadcrumb.missingFields.includes("itemListElement"));
});

test("structured-data serialization cannot terminate its JSON-LD script element", () => {
  const payload = { name: "</script><script>alert('x')</script>", ampersand: "A&B" };
  const serialized = serializeProgrammeJsonLd(payload);
  assert.doesNotMatch(serialized, /<\/script>/i);
  assert.doesNotMatch(serialized, /<script>/i);
  assert.deepEqual(JSON.parse(serialized), payload);
});

test("ships a structured-data renderer that omits rejected and empty graphs", async () => {
  const source = await readFile(new URL("../components/programmes/programme-structured-data.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(!seo\.ok \|\| !seo\.structuredData\.graph\) return null/);
  assert.match(source, /type="application\/ld\+json"/);
  assert.match(source, /serializeProgrammeJsonLd\(seo\.structuredData\.graph\)/);
  assert.doesNotMatch(source, /JSON\.stringify\(seo\.structuredData\.graph\)/);
});

test("keeps the complete-package planner fail closed while exposing the separately approved profile lane", async () => {
  const [schemaText, planner, catchAll, navigation, footer, sitemap, packageJson] = await Promise.all([
    readFile(new URL("../content/programmes-publication.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/plan-programmes-publication.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/[...slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/navigation.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/site-footer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  const schema = JSON.parse(schemaText);
  assert.equal(schema.properties.schemaVersion.const, "1.0.0");
  assert.equal(schema.$defs.result.properties.studentName, undefined);
  assert.ok(schema.$defs.approval.properties.approvedByRole);
  assert.match(planner, /repositoryWritePerformed:\s*false/);
  assert.doesNotMatch(planner, /writeFile|rename|mkdir|fetch\s*\(/);
  assert.match(catchAll, /isProgrammesPublicationRoute\(path\)\) notFound\(\)/);
  assert.match(navigation, /getCurrentPublicProgrammeProfiles\(now\)/);
  assert.match(navigation, /profile\.navigationLabel/);
  assert.match(navigation, /href:\s*profile\.route/);
  assert.match(footer, /usePublicationNavigation/);
  assert.match(sitemap, /getPublicationNavigation\(\)/);
  assert.match(sitemap, /programmeLinks\.map/);
  assert.match(packageJson, /"programmes:plan"/);
  assert.match(packageJson, /"programmes:profiles:audit"/);
});

test("ships strict Programme expiry receipts, guarded renderers and read-only rollback planners", async () => {
  const [schemaText, component, expiryPlanner, rollbackPlanner, packageText] = await Promise.all([
    readFile(new URL("../content/programmes-expiry-receipt.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../components/programmes/programme-expiry-sections.tsx", import.meta.url), "utf8"),
    readFile(new URL("../scripts/plan-programmes-expiry.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/plan-programmes-expiry-rollback.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  const schema = JSON.parse(schemaText);
  const packageJson = JSON.parse(packageText);

  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.receiptType.const, "programme-expiry-projection");
  assert.deepEqual(schema.properties.sections.required, ["fees", "schedule", "results", "admissions"]);
  assert.equal(schema.properties.controls.properties.expiredContentIncluded.const, false);
  assert.equal(schema.properties.controls.properties.expiredContentRestorationAllowed.const, false);
  assert.match(component, /isIssuedProgrammeExpiryProjection\(projection, gate\)/);
  assert.match(component, /ProgrammeExpiringFeeSummary/);
  assert.match(component, /ProgrammeExpiringSchedule/);
  assert.match(component, /ProgrammeExpiringResults/);
  assert.match(component, /ProgrammeExpiringAdmissionsCta/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(expiryPlanner, /writeFile|rename|unlink|mkdir|rm\s*\(|fetch\s*\(/);
  assert.doesNotMatch(rollbackPlanner, /writeFile|rename|unlink|mkdir|rm\s*\(|fetch\s*\(/);
  assert.match(packageJson.scripts["programmes:expiry:plan"], /plan-programmes-expiry\.mjs/);
  assert.match(packageJson.scripts["programmes:expiry:rollback-plan"], /plan-programmes-expiry-rollback\.mjs/);
});
