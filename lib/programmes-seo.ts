import {
  isIssuedProgrammePageData,
  type ProgrammePageData,
} from "./programmes-data-adapter.ts";
import type { ProgrammesPublicationRoute } from "./programmes-publication-routes.ts";

export const PROGRAMMES_CANONICAL_ORIGIN = "https://www.sskemschool.com";

type StructuredTemplateName = "EducationalOrganization" | "EducationalOccupationalProgram" | "BreadcrumbList";

export type StructuredDataSuppression = Readonly<{
  template: StructuredTemplateName;
  missingFields: readonly string[];
}>;

export type StructuredDataTemplateResult<T> = Readonly<{
  data: T | null;
  missingFields: readonly string[];
}>;

export type EducationalOrganizationSchema = Readonly<{
  "@type": "EducationalOrganization";
  "@id": string;
  name: string;
  url: string;
}>;

export type EducationalProgrammeSchema = Readonly<{
  "@type": "EducationalOccupationalProgram";
  "@id": string;
  identifier: string;
  name: string;
  description: string;
  url: string;
  mainEntityOfPage: string;
  programType: string;
  programPrerequisites: string;
  provider: Readonly<{
    "@type": "EducationalOrganization";
    "@id": string;
    name: string;
  }>;
  about: readonly Readonly<{
    "@type": "DefinedTerm";
    name: string;
  }>[];
  educationalProgramMode?: string;
}>;

export type BreadcrumbListSchema = Readonly<{
  "@type": "BreadcrumbList";
  "@id": string;
  itemListElement: readonly Readonly<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>[];
}>;

export type ProgrammeBreadcrumb = Readonly<{
  name: string;
  href: string;
  current: boolean;
}>;

export type ProgrammeSeoProjection = Readonly<{
  ok: true;
  route: ProgrammesPublicationRoute;
  canonicalUrl: string;
  metadata: Readonly<{
    title: string;
    description: string;
    alternates: Readonly<{ canonical: string }>;
    robots: Readonly<{ index: true; follow: true }>;
  }>;
  breadcrumbs: readonly ProgrammeBreadcrumb[];
  structuredData: Readonly<{
    organization: EducationalOrganizationSchema | null;
    programme: EducationalProgrammeSchema | null;
    breadcrumbList: BreadcrumbListSchema | null;
    graph: Readonly<{
      "@context": "https://schema.org";
      "@graph": readonly (EducationalOrganizationSchema | EducationalProgrammeSchema | BreadcrumbListSchema)[];
    }> | null;
    suppressed: readonly StructuredDataSuppression[];
  }>;
}>;

export type ProgrammeSeoRejection = Readonly<{
  ok: false;
  route: ProgrammesPublicationRoute | null;
  metadata: null;
  breadcrumbs: readonly never[];
  structuredData: null;
  issues: readonly Readonly<{
    code: "UNISSUED_PAGE_DATA" | "INCOMPLETE_SEO_METADATA";
    missingFields: readonly string[];
  }>[];
}>;

export type ProgrammeSeoResult = ProgrammeSeoProjection | ProgrammeSeoRejection;

type OrganizationTemplateInput = Readonly<{
  id?: unknown;
  name?: unknown;
  url?: unknown;
}>;

type ProgrammeTemplateInput = Readonly<{
  id?: unknown;
  identifier?: unknown;
  name?: unknown;
  description?: unknown;
  url?: unknown;
  programType?: unknown;
  programPrerequisites?: unknown;
  providerId?: unknown;
  providerName?: unknown;
  subjects?: unknown;
  educationalProgramMode?: unknown;
}>;

type BreadcrumbTemplateInput = Readonly<{
  id?: unknown;
  items?: unknown;
}>;

const placeholderPattern = /^(?:tbd|todo|n\/?a|not confirmed|not available|pending|pending approval|placeholder|coming soon)$/i;

function completeText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !placeholderPattern.test(value.trim());
}

function absoluteHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function immutableTemplateResult<T>(data: T | null, missingFields: string[]): StructuredDataTemplateResult<T> {
  return deepFreeze({ data, missingFields });
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export function buildEducationalOrganizationSchema(
  input: OrganizationTemplateInput,
): StructuredDataTemplateResult<EducationalOrganizationSchema> {
  const missingFields: string[] = [];
  const id = absoluteHttpsUrl(input.id);
  const url = absoluteHttpsUrl(input.url);
  if (!id) missingFields.push("@id");
  if (!completeText(input.name)) missingFields.push("name");
  if (!url) missingFields.push("url");
  if (missingFields.length) return immutableTemplateResult(null, missingFields);

  return immutableTemplateResult({
    "@type": "EducationalOrganization",
    "@id": id!,
    name: input.name as string,
    url: url!,
  }, []);
}

export function buildEducationalProgrammeSchema(
  input: ProgrammeTemplateInput,
): StructuredDataTemplateResult<EducationalProgrammeSchema> {
  const missingFields: string[] = [];
  const id = absoluteHttpsUrl(input.id);
  const url = absoluteHttpsUrl(input.url);
  const providerId = absoluteHttpsUrl(input.providerId);
  const subjects = Array.isArray(input.subjects)
    ? input.subjects.filter(completeText).map((subject) => subject.trim())
    : [];

  if (!id) missingFields.push("@id");
  if (!completeText(input.identifier)) missingFields.push("identifier");
  if (!completeText(input.name)) missingFields.push("name");
  if (!completeText(input.description)) missingFields.push("description");
  if (!url) missingFields.push("url");
  if (!completeText(input.programType)) missingFields.push("programType");
  if (!completeText(input.programPrerequisites)) missingFields.push("programPrerequisites");
  if (!providerId) missingFields.push("provider.@id");
  if (!completeText(input.providerName)) missingFields.push("provider.name");
  if (!subjects.length || subjects.length !== (Array.isArray(input.subjects) ? input.subjects.length : 0)) missingFields.push("subjects");
  if (missingFields.length) return immutableTemplateResult(null, missingFields);

  const mode = completeText(input.educationalProgramMode) ? input.educationalProgramMode.trim() : null;
  return immutableTemplateResult({
    "@type": "EducationalOccupationalProgram",
    "@id": id!,
    identifier: input.identifier as string,
    name: input.name as string,
    description: input.description as string,
    url: url!,
    mainEntityOfPage: url!,
    programType: input.programType as string,
    programPrerequisites: input.programPrerequisites as string,
    provider: {
      "@type": "EducationalOrganization",
      "@id": providerId!,
      name: input.providerName as string,
    },
    about: subjects.map((subject) => ({ "@type": "DefinedTerm", name: subject })),
    ...(mode ? { educationalProgramMode: mode } : {}),
  }, []);
}

export function buildBreadcrumbListSchema(
  input: BreadcrumbTemplateInput,
): StructuredDataTemplateResult<BreadcrumbListSchema> {
  const missingFields: string[] = [];
  const id = absoluteHttpsUrl(input.id);
  if (!id) missingFields.push("@id");
  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (rawItems.length < 2) missingFields.push("itemListElement");

  const items = rawItems.flatMap((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      missingFields.push(`itemListElement.${index}`);
      return [];
    }
    const candidate = item as Record<string, unknown>;
    const itemUrl = absoluteHttpsUrl(candidate.href);
    if (!completeText(candidate.name)) missingFields.push(`itemListElement.${index}.name`);
    if (!itemUrl) missingFields.push(`itemListElement.${index}.item`);
    if (!completeText(candidate.name) || !itemUrl) return [];
    return [{
      "@type": "ListItem" as const,
      position: index + 1,
      name: candidate.name.trim(),
      item: itemUrl,
    }];
  });

  if (items.length !== rawItems.length && !missingFields.includes("itemListElement")) missingFields.push("itemListElement");
  if (missingFields.length) return immutableTemplateResult(null, [...new Set(missingFields)]);
  return immutableTemplateResult({ "@type": "BreadcrumbList", "@id": id!, itemListElement: items }, []);
}

const programmeTypeByRoute: Record<ProgrammesPublicationRoute, string> = {
  "/school/academics": "School academics",
  "/junior-college": "Junior College",
  "/programmes/jee-neet": "JEE and NEET preparation",
};

function organizationUrl(page: ProgrammePageData) {
  if (page.organisation.type === "cbse-school") return new URL("/", PROGRAMMES_CANONICAL_ORIGIN).toString();
  if (page.organisation.type === "junior-college") return new URL("/junior-college", PROGRAMMES_CANONICAL_ORIGIN).toString();
  return new URL(page.route, PROGRAMMES_CANONICAL_ORIGIN).toString();
}

function rejectSeo(
  route: ProgrammesPublicationRoute | null,
  code: ProgrammeSeoRejection["issues"][number]["code"],
  missingFields: string[],
): ProgrammeSeoRejection {
  return deepFreeze({
    ok: false,
    route,
    metadata: null,
    breadcrumbs: [],
    structuredData: null,
    issues: [{ code, missingFields }],
  });
}

export function buildProgrammeSeo(page: unknown): ProgrammeSeoResult {
  if (!isIssuedProgrammePageData(page)) return rejectSeo(null, "UNISSUED_PAGE_DATA", ["page"]);

  const missingMetadata: string[] = [];
  if (!completeText(page.metadata.title)) missingMetadata.push("metadata.title");
  if (!completeText(page.metadata.description)) missingMetadata.push("metadata.description");
  if (page.metadata.canonicalPath !== page.route) missingMetadata.push("metadata.canonicalPath");
  if (page.metadata.index !== true) missingMetadata.push("metadata.index");
  if (page.metadata.follow !== true) missingMetadata.push("metadata.follow");
  if (missingMetadata.length) return rejectSeo(page.route, "INCOMPLETE_SEO_METADATA", missingMetadata);

  const canonicalUrl = new URL(page.route, PROGRAMMES_CANONICAL_ORIGIN).toString();
  const providerUrl = organizationUrl(page);
  const providerId = `${providerUrl}#organization-${encodeURIComponent(page.organisation.id)}`;
  const programmeId = `${canonicalUrl}#programme`;
  const breadcrumbs = [
    { name: "Home", href: new URL("/", PROGRAMMES_CANONICAL_ORIGIN).toString(), current: false },
    { name: page.navigation?.label ?? page.components.hero.title, href: canonicalUrl, current: true },
  ];

  const organization = buildEducationalOrganizationSchema({
    id: providerId,
    name: page.organisation.officialName,
    url: providerUrl,
  });
  const programme = buildEducationalProgrammeSchema({
    id: programmeId,
    identifier: page.programmeId,
    name: page.components.hero.title,
    description: page.components.hero.summary,
    url: canonicalUrl,
    programType: programmeTypeByRoute[page.route],
    programPrerequisites: page.components.eligibility.summary,
    providerId: organization.data?.["@id"],
    providerName: organization.data?.name,
    subjects: page.components.subjectsStreams.subjects,
    educationalProgramMode: page.academic.deliveryModel,
  });
  const breadcrumbList = buildBreadcrumbListSchema({
    id: `${canonicalUrl}#breadcrumb`,
    items: breadcrumbs,
  });
  const suppressed: StructuredDataSuppression[] = [];
  if (!organization.data) suppressed.push({ template: "EducationalOrganization", missingFields: organization.missingFields });
  if (!programme.data) suppressed.push({ template: "EducationalOccupationalProgram", missingFields: programme.missingFields });
  if (!breadcrumbList.data) suppressed.push({ template: "BreadcrumbList", missingFields: breadcrumbList.missingFields });
  const graphNodes = [organization.data, programme.data, breadcrumbList.data].filter(
    (node): node is EducationalOrganizationSchema | EducationalProgrammeSchema | BreadcrumbListSchema => node !== null,
  );

  return deepFreeze({
    ok: true,
    route: page.route,
    canonicalUrl,
    metadata: {
      title: page.metadata.title,
      description: page.metadata.description,
      alternates: { canonical: canonicalUrl },
      robots: { index: true, follow: true },
    },
    breadcrumbs,
    structuredData: {
      organization: organization.data,
      programme: programme.data,
      breadcrumbList: breadcrumbList.data,
      graph: graphNodes.length ? { "@context": "https://schema.org", "@graph": graphNodes } : null,
      suppressed,
    },
  });
}

export function serializeProgrammeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
