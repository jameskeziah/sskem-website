import {
  createProgrammesImplementationPlan,
  validateProgrammesPublicationPackage,
  type ApprovalManifestLike,
  type ProgrammesPublicationIssue,
} from "./programmes-publication.ts";
import {
  PROGRAMME_ID_BY_ROUTE,
  PROGRAMMES_PUBLICATION_ROUTES,
  type ProgrammesPublicationRoute,
} from "./programmes-publication-routes.ts";
import {
  isApprovedProgrammeRenderGate,
  issueApprovedProgrammeRenderGate,
  type ApprovedProgrammeRenderGate,
} from "./programmes-render-gate.ts";
import type { ApprovedProgrammeDocument } from "./programmes-document-integration.ts";

const ADAPTER_VERSION = "1.1.0";
const issuedProgrammePageData = new WeakSet<object>();

type JsonRecord = Record<string, unknown>;
type InstitutionType = "cbse-school" | "junior-college" | "institute" | "external-partner";

export const PROGRAMME_INSTITUTIONAL_MODEL_RULES = Object.freeze({
  "/school/academics": Object.freeze(["cbse-school"] as const),
  "/junior-college": Object.freeze(["junior-college"] as const),
  "/programmes/jee-neet": Object.freeze(["cbse-school", "junior-college", "institute"] as const),
}) satisfies Readonly<Record<ProgrammesPublicationRoute, readonly InstitutionType[]>>;

export type ProgrammeDataAdapterOptions = Readonly<{
  packageData: unknown;
  manifest?: ApprovalManifestLike;
  now?: string | Date;
}>;

export type ProgrammeMediaDescriptor = Readonly<{
  id: string;
  type: string;
  role: string;
  alt: string;
}>;

export type ProgrammePageData = Readonly<{
  route: ProgrammesPublicationRoute;
  programmeId: string;
  packageId: string;
  academicYear: string;
  gate: ApprovedProgrammeRenderGate;
  organisation: Readonly<{
    id: string;
    officialName: string;
    type: InstitutionType;
  }>;
  components: Readonly<{
    hero: Readonly<{
      eyebrow: string;
      title: string;
      summary: string;
      media: ProgrammeMediaDescriptor | null;
    }>;
    subjectsStreams: Readonly<{
      levels: readonly string[];
      streams: readonly string[];
      subjects: readonly string[];
      summary: string;
    }>;
    eligibility: Readonly<{
      summary: string;
      requirements: readonly string[];
    }>;
    schedule: Readonly<{
      summary: string;
      entries: readonly Readonly<{ label: string; value: string }>[];
      validUntil: string;
    }>;
    feeSummary: Readonly<{
      academicYear: string;
      fees: readonly Readonly<{
        id: string;
        category: string;
        approvedPublicWording: string;
        amount: string | null;
      }>[];
      validUntil: string;
    }> | null;
    facultyProfiles: Readonly<{
      profiles: readonly Readonly<{
        id: string;
        publicDisplayName: string;
        publicRole: string;
        publicQualificationSummary: string;
        subjectsOrFunctions: readonly string[];
      }>[];
    }>;
    facilities: Readonly<{
      facilities: readonly Readonly<{
        id: string;
        publicName: string;
        publicSummary: string;
      }>[];
    }>;
    results: Readonly<{
      results: readonly Readonly<{
        id: string;
        exam: string;
        year: number;
        cohortDefinition: string;
        aggregateMetric: string;
        aggregateValue: string;
        validUntil: string;
      }>[];
    }>;
    documents: Readonly<{
      documents: readonly ApprovedProgrammeDocument[];
    }>;
    admissionsCta: Readonly<{
      title: string;
      summary: string;
      primaryAction: Readonly<{ label: string; href: string }>;
      secondaryAction: Readonly<{ label: string; href: string }>;
      validUntil: string;
    }>;
  }>;
  academic: Readonly<{
    exams: readonly string[];
    curriculumSummary: string;
    teachingMethodology: string;
    testingAndAssessment: string;
    studentSupport: string;
    deliveryModel: string;
    operatorSummary: string;
    studyMaterial: string;
  }>;
  scholarships: readonly Readonly<{
    id: string;
    publicName: string;
    eligibilitySummary: string;
    benefitSummary: string;
  }>[];
  claims: readonly Readonly<{
    id: string;
    type: string;
    text: string;
    validFrom: string | null;
    validUntil: string | null;
  }>[];
  media: readonly ProgrammeMediaDescriptor[];
  relatedRoutes: readonly ProgrammesPublicationRoute[];
  metadata: Readonly<{
    title: string;
    description: string;
    canonicalPath: ProgrammesPublicationRoute;
    index: true;
    follow: true;
    ogMediaId: string;
  }>;
  navigation: Readonly<{
    id: string;
    label: string;
    parent: string;
    order: number;
    href: ProgrammesPublicationRoute;
  }> | null;
}>;

export type ProgrammeDataAdapterSuccess = Readonly<{
  ok: true;
  status: "READY";
  adapterVersion: typeof ADAPTER_VERSION;
  packageId: string;
  packageDigest: `sha256:${string}`;
  pages: Readonly<Record<ProgrammesPublicationRoute, ProgrammePageData>>;
  warnings: readonly ProgrammesPublicationIssue[];
  limitations: readonly Readonly<{
    code: "DOCUMENTS_NOT_MODELLED_IN_V1";
    message: string;
  }>[];
}>;

export type ProgrammeDataAdapterRejection = Readonly<{
  ok: false;
  status: "REJECTED";
  adapterVersion: typeof ADAPTER_VERSION;
  packageId: string | null;
  pages: null;
  issues: readonly ProgrammesPublicationIssue[];
}>;

export type ProgrammeDataAdapterResult = ProgrammeDataAdapterSuccess | ProgrammeDataAdapterRejection;

export function isIssuedProgrammePageData(
  value: unknown,
  expectedRoute?: ProgrammesPublicationRoute,
): value is ProgrammePageData {
  if (!isRecord(value) || !issuedProgrammePageData.has(value)) return false;
  const route = value.route;
  return typeof route === "string"
    && PROGRAMMES_PUBLICATION_ROUTES.includes(route as ProgrammesPublicationRoute)
    && (!expectedRoute || route === expectedRoute)
    && issueGateMatchesPage(value, route as ProgrammesPublicationRoute);
}

function issueGateMatchesPage(value: JsonRecord, route: ProgrammesPublicationRoute) {
  return "gate" in value && isApprovedProgrammeRenderGate(value.gate, route);
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function recordIndex(value: unknown): Map<string, JsonRecord> {
  return new Map(records(value).map((record) => [String(record.id), record]));
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function requiredString(record: JsonRecord, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) throw new Error(`Expected ${key} to be a non-empty string.`);
  return value;
}

function requiredRecord(index: Map<string, JsonRecord>, id: unknown, label: string): JsonRecord {
  const record = index.get(String(id));
  if (!record) throw new Error(`Expected approved ${label} ${String(id)}.`);
  return record;
}

function requiredObject(record: JsonRecord, key: string): JsonRecord {
  const value = record[key];
  if (!isRecord(value)) throw new Error(`Expected ${key} to be an object.`);
  return value;
}

function select(index: Map<string, JsonRecord>, ids: unknown): JsonRecord[] {
  return strings(ids).map((id) => requiredRecord(index, id, "record"));
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function earliestSectionExpiry(options: {
  packageData: JsonRecord;
  evidence: Map<string, JsonRecord>;
  claims: Map<string, JsonRecord>;
  manifest?: ApprovalManifestLike;
  evidenceIds?: unknown;
  claimIds?: unknown;
}) {
  const approval = requiredObject(options.packageData, "approval");
  const packageExpiry = approval.validUntil;
  if (!validDate(packageExpiry)) throw new Error("Approved package expiry is unavailable.");
  const dates = new Set<string>([packageExpiry]);
  const manifest = new Map((options.manifest?.records ?? []).map((record) => [String(record.id), record]));
  const includeEvidence = (ids: unknown) => {
    for (const id of strings(ids)) {
      const expiry = options.evidence.get(id)?.validUntil;
      if (validDate(expiry)) dates.add(expiry);
    }
  };

  includeEvidence(options.evidenceIds);
  for (const id of strings(options.claimIds)) {
    const claim = options.claims.get(id);
    if (!claim) continue;
    if (validDate(claim.validUntil)) dates.add(claim.validUntil);
    includeEvidence(claim.evidenceIds);
    const manifestExpiry = manifest.get(String(claim.manifestRecordId))?.expiresAt;
    if (validDate(manifestExpiry)) dates.add(manifestExpiry);
  }
  return [...dates].sort()[0];
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function packageId(packageData: JsonRecord | null): string | null {
  return packageData && typeof packageData.packageId === "string" ? packageData.packageId : null;
}

function adapterIssue(
  code: string,
  gate: ProgrammesPublicationIssue["gate"],
  path: string,
  message: string,
  route?: ProgrammesPublicationRoute,
): ProgrammesPublicationIssue {
  return { code, gate, path, message, ...(route ? { route } : {}) };
}

function validateInstitutionalModels(packageData: JsonRecord): ProgrammesPublicationIssue[] {
  const organisations = recordIndex(packageData.organisations);
  const issues: ProgrammesPublicationIssue[] = [];

  for (const programme of records(packageData.programmes)) {
    const route = programme.route;
    if (!PROGRAMMES_PUBLICATION_ROUTES.includes(route as ProgrammesPublicationRoute)) continue;
    const typedRoute = route as ProgrammesPublicationRoute;
    const organisation = organisations.get(String(programme.organisationId));
    if (!organisation || typeof organisation.type !== "string") continue;
    const allowed: readonly InstitutionType[] = PROGRAMME_INSTITUTIONAL_MODEL_RULES[typedRoute];
    if (!allowed.includes(organisation.type as InstitutionType)) {
      issues.push(adapterIssue(
        "INCOMPATIBLE_INSTITUTIONAL_MODEL",
        "content",
        `${typedRoute}.organisationId`,
        `${typedRoute} cannot be published under organisation type ${organisation.type}; allowed types are ${allowed.join(", ")}.`,
        typedRoute,
      ));
    }
  }

  return issues;
}

function formatAmount(amount: unknown, currency: unknown): string | null {
  if (typeof amount !== "number" || !Number.isFinite(amount) || typeof currency !== "string") return null;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${new Intl.NumberFormat("en-IN").format(amount)}`;
  }
}

function publicMedia(record: JsonRecord): ProgrammeMediaDescriptor {
  return {
    id: requiredString(record, "id"),
    type: requiredString(record, "type"),
    role: requiredString(record, "role"),
    alt: requiredString(record, "alt"),
  };
}

function mapPage(
  packageData: JsonRecord,
  plan: ReturnType<typeof createProgrammesImplementationPlan>,
  route: ProgrammesPublicationRoute,
  gate: ApprovedProgrammeRenderGate,
  manifest?: ApprovalManifestLike,
): ProgrammePageData {
  const programmes = recordIndex(packageData.programmes);
  const organisations = recordIndex(packageData.organisations);
  const evidence = recordIndex(packageData.evidenceRegistry);
  const faculty = recordIndex(packageData.faculty);
  const facilities = recordIndex(packageData.facilities);
  const fees = recordIndex(packageData.fees);
  const results = recordIndex(packageData.results);
  const scholarships = recordIndex(packageData.scholarships);
  const media = recordIndex(packageData.media);
  const claims = recordIndex(packageData.claims);
  const seo = recordIndex(packageData.seo);
  const navigation = recordIndex(packageData.navigation);
  const programme = requiredRecord(programmes, PROGRAMME_ID_BY_ROUTE[route], "programme");
  const organisation = requiredRecord(organisations, programme.organisationId, "organisation");
  const identity = requiredObject(programme, "identity");
  const academic = requiredObject(programme, "academic");
  const eligibility = requiredObject(programme, "eligibility");
  const schedule = requiredObject(programme, "schedule");
  const admission = requiredObject(programme, "admission");
  const routePlan = plan.routes[route];
  const claimIds = routePlan.referencedRecords?.claimIds ?? [];
  const routeMedia = (routePlan.referencedRecords?.mediaIds ?? []).map((id) => publicMedia(requiredRecord(media, id, "media")));
  const heroMedia = routeMedia.find((item) => item.role === "hero") ?? routeMedia[0] ?? null;
  const routeFees = select(fees, programme.feeIds);
  const routeResults = select(results, programme.resultIds);
  const seoRecord = requiredRecord(seo, programme.seoId, "SEO record");
  const navigationRecord = requiredRecord(navigation, programme.navigationId, "navigation record");
  const relatedRouteById = new Map(Object.entries(PROGRAMME_ID_BY_ROUTE).map(([path, id]) => [id, path as ProgrammesPublicationRoute]));

  return {
    route,
    programmeId: requiredString(programme, "id"),
    packageId: requiredString(packageData, "packageId"),
    academicYear: requiredString(packageData, "academicYear"),
    gate,
    organisation: {
      id: requiredString(organisation, "id"),
      officialName: requiredString(organisation, "officialName"),
      type: requiredString(organisation, "type") as InstitutionType,
    },
    components: {
      hero: {
        eyebrow: requiredString(identity, "eyebrow"),
        title: requiredString(identity, "title"),
        summary: requiredString(identity, "summary"),
        media: heroMedia,
      },
      subjectsStreams: {
        levels: strings(academic.levels),
        streams: strings(academic.streams),
        subjects: strings(academic.subjects),
        summary: requiredString(academic, "curriculumSummary"),
      },
      eligibility: {
        summary: requiredString(eligibility, "summary"),
        requirements: [],
      },
      schedule: {
        summary: requiredString(schedule, "summary"),
        entries: [{ label: "Academic year", value: requiredString(schedule, "academicYear") }],
        validUntil: earliestSectionExpiry({
          packageData,
          evidence,
          claims,
          manifest,
          evidenceIds: schedule.evidenceIds,
        }),
      },
      feeSummary: routeFees.length ? {
        academicYear: requiredString(packageData, "academicYear"),
        fees: routeFees.map((fee) => ({
          id: requiredString(fee, "id"),
          category: requiredString(fee, "category"),
          approvedPublicWording: requiredString(fee, "approvedPublicWording"),
          amount: formatAmount(fee.amount, fee.currency),
        })),
        validUntil: earliestSectionExpiry({
          packageData,
          evidence,
          claims,
          manifest,
          evidenceIds: routeFees.flatMap((fee) => strings(fee.evidenceIds)),
          claimIds: routeFees.flatMap((fee) => strings(fee.claimIds)),
        }),
      } : null,
      facultyProfiles: {
        profiles: select(faculty, programme.facultyIds).map((profile) => ({
          id: requiredString(profile, "id"),
          publicDisplayName: requiredString(profile, "publicDisplayName"),
          publicRole: requiredString(profile, "publicRole"),
          publicQualificationSummary: requiredString(profile, "publicQualificationSummary"),
          subjectsOrFunctions: strings(profile.subjectsOrFunctions),
        })),
      },
      facilities: {
        facilities: select(facilities, programme.facilityIds).map((facility) => ({
          id: requiredString(facility, "id"),
          publicName: requiredString(facility, "publicName"),
          publicSummary: requiredString(facility, "publicSummary"),
        })),
      },
      results: {
        results: routeResults.map((result) => ({
          id: requiredString(result, "id"),
          exam: requiredString(result, "exam"),
          year: Number(result.year),
          cohortDefinition: requiredString(result, "cohortDefinition"),
          aggregateMetric: requiredString(result, "aggregateMetric"),
          aggregateValue: requiredString(result, "aggregateValue"),
          validUntil: earliestSectionExpiry({
            packageData,
            evidence,
            claims,
            manifest,
            evidenceIds: requiredObject(result, "verification").evidenceIds,
            claimIds: [requiredString(result, "claimId")],
          }),
        })),
      },
      documents: { documents: [] },
      admissionsCta: {
        title: `Admissions for ${requiredString(identity, "title")}`,
        summary: requiredString(admission, "summary"),
        primaryAction: { label: "Start an admission enquiry", href: "/admissions/enquire" },
        secondaryAction: { label: "View admissions", href: "/admissions" },
        validUntil: earliestSectionExpiry({
          packageData,
          evidence,
          claims,
          manifest,
          evidenceIds: admission.evidenceIds,
        }),
      },
    },
    academic: {
      exams: strings(academic.exams),
      curriculumSummary: requiredString(academic, "curriculumSummary"),
      teachingMethodology: requiredString(academic, "teachingMethodology"),
      testingAndAssessment: requiredString(academic, "testingAndAssessment"),
      studentSupport: requiredString(academic, "studentSupport"),
      deliveryModel: typeof academic.deliveryModel === "string" ? academic.deliveryModel : "",
      operatorSummary: typeof academic.operatorSummary === "string" ? academic.operatorSummary : "",
      studyMaterial: typeof academic.studyMaterial === "string" ? academic.studyMaterial : "",
    },
    scholarships: select(scholarships, programme.scholarshipIds).map((scholarship) => ({
      id: requiredString(scholarship, "id"),
      publicName: requiredString(scholarship, "publicName"),
      eligibilitySummary: requiredString(scholarship, "eligibilitySummary"),
      benefitSummary: requiredString(scholarship, "benefitSummary"),
    })),
    claims: claimIds.map((id) => requiredRecord(claims, id, "claim")).map((claim) => ({
      id: requiredString(claim, "id"),
      type: requiredString(claim, "type"),
      text: requiredString(claim, "text"),
      validFrom: typeof claim.validFrom === "string" ? claim.validFrom : null,
      validUntil: typeof claim.validUntil === "string" ? claim.validUntil : null,
    })),
    media: routeMedia,
    relatedRoutes: strings(programme.relatedProgrammeIds)
      .map((id) => relatedRouteById.get(id))
      .filter((relatedRoute): relatedRoute is ProgrammesPublicationRoute => Boolean(relatedRoute)),
    metadata: {
      title: requiredString(seoRecord, "title"),
      description: requiredString(seoRecord, "description"),
      canonicalPath: requiredString(seoRecord, "canonicalPath") as ProgrammesPublicationRoute,
      index: true,
      follow: true,
      ogMediaId: requiredString(seoRecord, "ogMediaId"),
    },
    navigation: routePlan.gates.navigation === "pass" ? {
      id: requiredString(navigationRecord, "id"),
      label: requiredString(navigationRecord, "label"),
      parent: requiredString(navigationRecord, "parent"),
      order: Number(navigationRecord.order),
      href: route,
    } : null,
  };
}

function reject(packageData: JsonRecord | null, issues: readonly ProgrammesPublicationIssue[]): ProgrammeDataAdapterRejection {
  return deepFreeze({
    ok: false,
    status: "REJECTED",
    adapterVersion: ADAPTER_VERSION,
    packageId: packageId(packageData),
    pages: null,
    issues: [...issues],
  });
}

/**
 * Converts an exact approved package into immutable, component-ready route data.
 * The conversion is atomic: any blocking package or route issue returns no pages.
 */
export function adaptProgrammesPublicationPackage(options: ProgrammeDataAdapterOptions): ProgrammeDataAdapterResult {
  const now = options.now instanceof Date ? new Date(options.now.valueOf()) : new Date(options.now ?? Date.now());
  const validationOptions = { packageData: options.packageData, manifest: options.manifest, now };
  const validation = validateProgrammesPublicationPackage(validationOptions);
  const packageData = validation.packageSnapshot;

  if (!packageData || !validation.valid) {
    return reject(packageData, validation.blockingIssues ?? validation.issues);
  }

  const modelIssues = validateInstitutionalModels(packageData);
  if (modelIssues.length) return reject(packageData, modelIssues);

  const plan = createProgrammesImplementationPlan({ ...validationOptions, packageData });
  if (plan.validation.status !== "READY" || plan.receipt.publicationAuthorized !== true) {
    return reject(packageData, plan.validation.blockingErrors);
  }

  const gates = new Map<ProgrammesPublicationRoute, ApprovedProgrammeRenderGate>();
  for (const route of PROGRAMMES_PUBLICATION_ROUTES) {
    const gate = issueApprovedProgrammeRenderGate(plan, route);
    if (!gate) {
      return reject(packageData, [adapterIssue(
        "RENDER_GATE_NOT_ISSUED",
        "approval",
        `${route}.renderGate`,
        "The approved package could not produce an opaque render gate.",
        route,
      )]);
    }
    gates.set(route, gate);
  }

  try {
    const pages = Object.fromEntries(PROGRAMMES_PUBLICATION_ROUTES.map((route) => [
      route,
      mapPage(packageData, plan, route, gates.get(route)!, options.manifest),
    ])) as Record<ProgrammesPublicationRoute, ProgrammePageData>;
    for (const route of PROGRAMMES_PUBLICATION_ROUTES) issuedProgrammePageData.add(pages[route]);
    const digest = plan.package.packageDigest;
    if (!digest?.startsWith("sha256:")) throw new Error("Approved package digest is unavailable.");

    return deepFreeze({
      ok: true,
      status: "READY",
      adapterVersion: ADAPTER_VERSION,
      packageId: requiredString(packageData, "packageId"),
      packageDigest: digest as `sha256:${string}`,
      pages,
      warnings: [...plan.validation.downstreamBlockers],
      limitations: [{
        code: "DOCUMENTS_NOT_MODELLED_IN_V1",
        message: "Programme documents remain empty because package schema 1.0.0 has no canonical public-document records.",
      }],
    });
  } catch (error) {
    return reject(packageData, [adapterIssue(
      "ADAPTER_MAPPING_FAILED",
      "schema",
      "$",
      error instanceof Error ? error.message : "Approved package could not be converted into page data.",
    )]);
  }
}
