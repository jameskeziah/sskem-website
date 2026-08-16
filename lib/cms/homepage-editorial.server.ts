import approvalManifestData from "../../content/approval-manifest.json" with { type: "json" };

import {
  createEditorialBindingIndex,
  digestEditorialProjection,
  editorialApprovalRecordIds,
  editorialDocumentIdentity,
  editorialPublicationBindings,
  hasMatchingEditorialBinding,
  type EditorialContentType,
  type EditorialPublicationBindingsInput,
} from "./editorial-publication-binding.ts";

// @ts-expect-error Node's native type-stripping test runner requires the explicit TypeScript extension.
import { admissionsCycle as fallbackAdmissionsCycle } from "../../app/data/admissions.ts";
// @ts-expect-error Node's native type-stripping test runner requires the explicit TypeScript extension.
import { siteFacts } from "../../app/data/site.ts";

export type HomepageContact = {
  location: string;
  phone: string;
  mobile: string;
  email: string;
  principalEmail: string;
  workingHours: {
    weekdays: string;
    saturday: string;
  };
};

export type HomepageNotice = {
  title: string;
  message: string;
  href: string | null;
};

export type HomepageAdmissionsCycle = {
  academicYear: string;
  institution: string;
  publicStatus: string;
  publicMessage: string;
  verifiedAt: string | null;
};

export type HomepageEvent = {
  title: string;
  summary: string | null;
  startAt: string;
  endAt: string | null;
  location: string | null;
  href: string | null;
};

export type HomepageEditorialSource = "fallback" | "mixed" | "sanity";

export type HomepageEditorialReason =
  | "missing-config"
  | "invalid-config"
  | "fetch-failed"
  | "invalid-response"
  | "no-approved-content"
  | "approved-content";

export type HomepageEditorialStatus = {
  source: HomepageEditorialSource;
  reason: HomepageEditorialReason;
  remoteAccepted: number;
  remoteRejected: number;
};

export type HomepageEditorialContent = {
  contact: HomepageContact;
  notice: HomepageNotice | null;
  admissionsCycle: HomepageAdmissionsCycle;
  events: HomepageEvent[];
  status: HomepageEditorialStatus;
};

export type EditorialReviewReceipt = {
  bindingId: string;
  approvalRecordIds: string[];
  contentType: EditorialContentType;
  documentId: string;
  revision: string;
  contentDigestSha256: string;
  boundOn: string;
  ownerRole: "website-publisher";
  notes: string;
};

export type EditorialReviewItem = {
  contentType: EditorialContentType;
  documentId: string | null;
  revision: string | null;
  approvalRecordIds: string[];
  validFrom: string | null;
  validUntil: string | null;
  projection: HomepageContact | HomepageNotice | HomepageAdmissionsCycle | HomepageEvent | null;
  contentDigestSha256: string | null;
  status: "blocked" | "ready-to-bind" | "bound";
  checks: {
    identityValid: boolean;
    projectionValid: boolean;
    manifestApproved: boolean;
    publicationWindowCurrent: boolean;
    exactBinding: boolean;
  };
  blockers: string[];
  receiptProposal: EditorialReviewReceipt | null;
};

export type HomepageEditorialReview = {
  status: {
    reason: "missing-config" | "invalid-config" | "fetch-failed" | "invalid-response" | "review-ready";
    candidates: number;
    readyToBind: number;
    bound: number;
    blocked: number;
  };
  items: EditorialReviewItem[];
};

type ApprovalManifestInput = {
  records?: readonly {
    id?: unknown;
    decision?: unknown;
    expiresAt?: unknown;
  }[];
};

type EditorialEnvironment = {
  SANITY_PROJECT_ID?: string;
  SANITY_DATASET?: string;
  SANITY_API_VERSION?: string;
};

export type HomepageEditorialOptions = {
  env?: EditorialEnvironment;
  fetchImpl?: typeof fetch;
  manifest?: ApprovalManifestInput;
  bindings?: EditorialPublicationBindingsInput;
  now?: Date | string | number;
};

type UnknownRecord = Record<string, unknown>;

type SanityEditorialResult = {
  contacts: unknown[];
  notices: unknown[];
  admissionsCycles: unknown[];
  events: unknown[];
};

type Selection<T> = {
  value: T | null;
  accepted: number;
  rejected: number;
};

type SanityFetchResult =
  | { state: "ready"; remote: SanityEditorialResult; now: number }
  | { state: "fallback"; reason: "missing-config" | "invalid-config" | "fetch-failed" | "invalid-response"; now: number };

const DEFAULT_SANITY_API_VERSION = "2026-08-12";
const REQUEST_TIMEOUT_MS = 4_000;
const MAX_CANDIDATES_PER_TYPE = 20;
const MAX_HOMEPAGE_EVENTS = 3;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DATASET_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

const SANITY_QUERY = `{
  "contacts": *[_type == "siteSettings" && !(_id in path("drafts.**"))]
    | order(_updatedAt desc)[0...${MAX_CANDIDATES_PER_TYPE}] {
      _id, _rev, _type,
      contact { location, phone, mobile, email, principalEmail, workingHours { weekdays, saturday } },
      publication { state, approvalRecordIds, validFrom, validUntil }
    },
  "notices": *[_type == "announcement" && !(_id in path("drafts.**"))]
    | order(_updatedAt desc)[0...${MAX_CANDIDATES_PER_TYPE}] {
      _id, _rev, _type,
      title, message, href,
      publication { state, approvalRecordIds, validFrom, validUntil }
    },
  "admissionsCycles": *[_type == "admissionCycle" && !(_id in path("drafts.**"))]
    | order(_updatedAt desc)[0...${MAX_CANDIDATES_PER_TYPE}] {
      _id, _rev, _type,
      academicYear, institution, publicStatus, publicMessage, verifiedAt,
      publication { state, approvalRecordIds, validFrom, validUntil }
    },
  "events": *[_type == "event" && !(_id in path("drafts.**"))]
    | order(startAt asc)[0...${MAX_CANDIDATES_PER_TYPE}] {
      _id, _rev, _type,
      title, summary, startAt, endAt, location, href,
      publication { state, approvalRecordIds, validFrom, validUntil }
    }
}`;

const fallbackContact: HomepageContact = {
  location: siteFacts.location,
  phone: siteFacts.phone,
  mobile: siteFacts.mobile,
  email: siteFacts.email,
  principalEmail: siteFacts.principalEmail,
  workingHours: {
    weekdays: siteFacts.workingHours.weekdays,
    saturday: siteFacts.workingHours.saturday,
  },
};

const safeFallback: Omit<HomepageEditorialContent, "status"> = {
  contact: fallbackContact,
  notice: null,
  admissionsCycle: {
    academicYear: fallbackAdmissionsCycle.academicYear,
    institution: fallbackAdmissionsCycle.institution,
    publicStatus: fallbackAdmissionsCycle.publicStatus,
    publicMessage: fallbackAdmissionsCycle.publicMessage,
    verifiedAt: fallbackAdmissionsCycle.verifiedAt,
  },
  events: [],
};

function fallbackResult(reason: HomepageEditorialReason, remoteRejected = 0): HomepageEditorialContent {
  return {
    ...safeFallback,
    contact: { ...safeFallback.contact, workingHours: { ...safeFallback.contact.workingHours } },
    admissionsCycle: { ...safeFallback.admissionsCycle },
    events: [],
    status: {
      source: "fallback",
      reason,
      remoteAccepted: 0,
      remoteRejected,
    },
  };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(record: UnknownRecord, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function sanitizePlainText(value: unknown, maximumLength: number): string | null {
  if (typeof value !== "string") return null;

  const sanitized = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\u2060\uFEFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized || sanitized.length > maximumLength || /[<>]/.test(sanitized)) return null;
  return sanitized;
}

function sanitizePhone(value: unknown): string | null {
  const phone = sanitizePlainText(value, 32);
  if (!phone || !/^\+?[0-9][0-9 ()-]{5,30}$/.test(phone)) return null;
  return phone;
}

function sanitizeEmail(value: unknown): string | null {
  const email = sanitizePlainText(value, 254);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email.toLowerCase();
}

function sanitizeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (
    !href ||
    href.length > 500 ||
    /[\u0000-\u001F\u007F\\<>"']/.test(href) ||
    href.startsWith("//")
  ) {
    return null;
  }

  try {
    if (href.startsWith("/")) {
      const url = new URL(href, "https://www.sskemschool.com");
      if (url.origin !== "https://www.sskemschool.com") return null;
      return `${url.pathname}${url.search}${url.hash}`;
    }

    const url = new URL(href);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function parseDateBoundary(value: unknown, endOfDay: boolean): number | null {
  if (typeof value !== "string" || value.length > 40) return null;

  if (DATE_ONLY_PATTERN.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = Date.UTC(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    const check = new Date(parsed);
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day
    ) {
      return null;
    }
    return parsed;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeDateTime(value: unknown): string | null {
  const parsed = parseDateBoundary(value, false);
  return parsed === null ? null : new Date(parsed).toISOString();
}

function resolveNow(value: HomepageEditorialOptions["now"]): number {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : Date.now();
  if (typeof value === "number") return Number.isFinite(value) ? value : Date.now();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
}

function approvedRecordIds(manifest: ApprovalManifestInput, now: number) {
  const approved = new Set<string>();
  if (!Array.isArray(manifest.records)) return approved;

  for (const record of manifest.records) {
    if (!isRecord(record) || typeof record.id !== "string" || record.decision !== "approved") continue;
    if (record.expiresAt !== null && record.expiresAt !== undefined) {
      const expiresAt = parseDateBoundary(record.expiresAt, true);
      if (expiresAt === null || expiresAt < now) continue;
    }
    approved.add(record.id);
  }

  return approved;
}

function hasCurrentPublicationWindow(candidate: UnknownRecord, now: number) {
  if (!isRecord(candidate.publication)) return false;
  const publication = candidate.publication;
  if (publication.state !== "published") return false;

  const validFrom = parseDateBoundary(publication.validFrom, false);
  const validUntil = parseDateBoundary(publication.validUntil, true);
  return validFrom !== null && validUntil !== null && validFrom <= now && now <= validUntil && validFrom <= validUntil;
}

function hasCurrentPublicationGate(candidate: UnknownRecord, approvals: Set<string>, now: number) {
  if (!hasCurrentPublicationWindow(candidate, now) || !isRecord(candidate.publication)) return false;
  const approvalRecordIds = editorialApprovalRecordIds(candidate.publication.approvalRecordIds);
  return approvalRecordIds !== null && approvalRecordIds.every((approvalRecordId) => approvals.has(approvalRecordId));
}

function parseContact(candidate: UnknownRecord): HomepageContact | null {
  if (!isRecord(candidate.contact)) return null;
  const contact = candidate.contact;
  const overrides: Partial<HomepageContact> = {};
  let suppliedFields = 0;

  for (const [key, parser] of [
    ["location", (value: unknown) => sanitizePlainText(value, 180)],
    ["phone", sanitizePhone],
    ["mobile", sanitizePhone],
    ["email", sanitizeEmail],
    ["principalEmail", sanitizeEmail],
  ] as const) {
    if (!hasOwn(contact, key) || contact[key] === null || contact[key] === undefined) continue;
    const value = parser(contact[key]);
    if (value === null) return null;
    Object.assign(overrides, { [key]: value });
    suppliedFields += 1;
  }

  let workingHours = fallbackContact.workingHours;
  if (hasOwn(contact, "workingHours") && contact.workingHours !== null && contact.workingHours !== undefined) {
    if (!isRecord(contact.workingHours)) return null;
    const hours: Partial<HomepageContact["workingHours"]> = {};
    for (const key of ["weekdays", "saturday"] as const) {
      if (!hasOwn(contact.workingHours, key) || contact.workingHours[key] === null || contact.workingHours[key] === undefined) continue;
      const value = sanitizePlainText(contact.workingHours[key], 120);
      if (value === null) return null;
      hours[key] = value;
      suppliedFields += 1;
    }
    workingHours = { ...fallbackContact.workingHours, ...hours };
  }

  if (suppliedFields === 0) return null;
  return { ...fallbackContact, ...overrides, workingHours };
}

function parseNotice(candidate: UnknownRecord): HomepageNotice | null {
  const title = sanitizePlainText(candidate.title, 120);
  const message = sanitizePlainText(candidate.message, 500);
  if (!title || !message) return null;

  let href: string | null = null;
  if (candidate.href !== null && candidate.href !== undefined) {
    href = sanitizeHref(candidate.href);
    if (!href) return null;
  }

  return { title, message, href };
}

function parseAdmissionsCycle(candidate: UnknownRecord): HomepageAdmissionsCycle | null {
  const overrides: Partial<HomepageAdmissionsCycle> = {};
  let suppliedFields = 0;

  for (const [key, maximumLength] of [
    ["academicYear", 32],
    ["institution", 160],
    ["publicStatus", 160],
    ["publicMessage", 600],
  ] as const) {
    if (!hasOwn(candidate, key) || candidate[key] === null || candidate[key] === undefined) continue;
    const value = sanitizePlainText(candidate[key], maximumLength);
    if (value === null) return null;
    Object.assign(overrides, { [key]: value });
    suppliedFields += 1;
  }

  if (hasOwn(candidate, "verifiedAt") && candidate.verifiedAt !== null && candidate.verifiedAt !== undefined) {
    const verifiedAt = sanitizeDateTime(candidate.verifiedAt);
    if (!verifiedAt) return null;
    overrides.verifiedAt = verifiedAt;
    suppliedFields += 1;
  }

  if (suppliedFields === 0) return null;
  return { ...safeFallback.admissionsCycle, ...overrides };
}

function parseEvent(candidate: UnknownRecord, now: number): HomepageEvent | null {
  const title = sanitizePlainText(candidate.title, 160);
  const startAt = sanitizeDateTime(candidate.startAt);
  if (!title || !startAt || Date.parse(startAt) <= now) return null;

  let summary: string | null = null;
  if (candidate.summary !== null && candidate.summary !== undefined) {
    summary = sanitizePlainText(candidate.summary, 500);
    if (!summary) return null;
  }

  let endAt: string | null = null;
  if (candidate.endAt !== null && candidate.endAt !== undefined) {
    endAt = sanitizeDateTime(candidate.endAt);
    if (!endAt || Date.parse(endAt) < Date.parse(startAt)) return null;
  }

  let location: string | null = null;
  if (candidate.location !== null && candidate.location !== undefined) {
    location = sanitizePlainText(candidate.location, 180);
    if (!location) return null;
  }

  let href: string | null = null;
  if (candidate.href !== null && candidate.href !== undefined) {
    href = sanitizeHref(candidate.href);
    if (!href) return null;
  }

  return { title, summary, startAt, endAt, location, href };
}

async function selectFirst<T>(
  candidates: unknown[],
  approvals: Set<string>,
  now: number,
  contentType: EditorialContentType,
  bindings: ReturnType<typeof createEditorialBindingIndex>,
  parser: (candidate: UnknownRecord) => T | null,
): Promise<Selection<T>> {
  let rejected = 0;
  for (const candidate of candidates) {
    if (!isRecord(candidate) || !hasCurrentPublicationGate(candidate, approvals, now)) {
      rejected += 1;
      continue;
    }
    const value = parser(candidate);
    if (value !== null && await hasMatchingEditorialBinding({ candidate, contentType, projection: value, index: bindings })) {
      return { value, accepted: 1, rejected };
    }
    rejected += 1;
  }
  return { value: null, accepted: 0, rejected };
}

async function selectEvents(
  candidates: unknown[],
  approvals: Set<string>,
  now: number,
  bindings: ReturnType<typeof createEditorialBindingIndex>,
): Promise<Selection<HomepageEvent[]>> {
  const events: HomepageEvent[] = [];
  let rejected = 0;

  for (const candidate of candidates) {
    if (!isRecord(candidate) || !hasCurrentPublicationGate(candidate, approvals, now)) {
      rejected += 1;
      continue;
    }
    const event = parseEvent(candidate, now);
    if (!event || !await hasMatchingEditorialBinding({ candidate, contentType: "event", projection: event, index: bindings })) {
      rejected += 1;
      continue;
    }
    events.push(event);
    if (events.length === MAX_HOMEPAGE_EVENTS) break;
  }

  events.sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
  return { value: events, accepted: events.length, rejected };
}

function parseSanityResponse(value: unknown): SanityEditorialResult | null {
  if (!isRecord(value) || !isRecord(value.result)) return null;
  const result = value.result;
  if (
    !Array.isArray(result.contacts) ||
    !Array.isArray(result.notices) ||
    !Array.isArray(result.admissionsCycles) ||
    !Array.isArray(result.events)
  ) {
    return null;
  }
  return {
    contacts: result.contacts,
    notices: result.notices,
    admissionsCycles: result.admissionsCycles,
    events: result.events,
  };
}

function configuredEnvironment(env: EditorialEnvironment) {
  const projectId = env.SANITY_PROJECT_ID?.trim() ?? "";
  const dataset = env.SANITY_DATASET?.trim() ?? "";
  const apiVersion = env.SANITY_API_VERSION?.trim() || DEFAULT_SANITY_API_VERSION;
  if (!projectId || !dataset) return { state: "missing" as const };
  if (
    !PROJECT_ID_PATTERN.test(projectId) ||
    !DATASET_PATTERN.test(dataset) ||
    !DATE_ONLY_PATTERN.test(apiVersion) ||
    parseDateBoundary(apiVersion, false) === null
  ) {
    return { state: "invalid" as const };
  }
  return { state: "ready" as const, projectId, dataset, apiVersion };
}

async function fetchSanityEditorial(options: HomepageEditorialOptions): Promise<SanityFetchResult> {
  const now = resolveNow(options.now);
  const environment = configuredEnvironment(options.env ?? {
    SANITY_PROJECT_ID: process.env.SANITY_PROJECT_ID,
    SANITY_DATASET: process.env.SANITY_DATASET,
    SANITY_API_VERSION: process.env.SANITY_API_VERSION,
  });
  if (environment.state === "missing") return { state: "fallback", reason: "missing-config", now };
  if (environment.state === "invalid") return { state: "fallback", reason: "invalid-config", now };

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const endpoint = new URL(
    `https://${environment.projectId}.api.sanity.io/v${environment.apiVersion}/data/query/${environment.dataset}`,
  );
  endpoint.searchParams.set("query", SANITY_QUERY);

  let payload: unknown;
  try {
    const response = await fetchImpl(endpoint, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return { state: "fallback", reason: "fetch-failed", now };
    payload = await response.json();
  } catch {
    return { state: "fallback", reason: "fetch-failed", now };
  } finally {
    clearTimeout(timeout);
  }

  const remote = parseSanityResponse(payload);
  return remote
    ? { state: "ready", remote, now }
    : { state: "fallback", reason: "invalid-response", now };
}

/**
 * Server-only homepage editorial boundary. Call this from a Server Component or
 * server loader; do not import it into a Client Component.
 */
export async function getHomepageEditorialContent(
  options: HomepageEditorialOptions = {},
): Promise<HomepageEditorialContent> {
  if (typeof window !== "undefined") {
    throw new Error("Homepage editorial content is available on the server only.");
  }

  const fetched = await fetchSanityEditorial(options);
  if (fetched.state === "fallback") return fallbackResult(fetched.reason);
  const { remote, now } = fetched;

  const approvals = approvedRecordIds(options.manifest ?? approvalManifestData, now);
  const bindings = createEditorialBindingIndex(options.bindings ?? editorialPublicationBindings);
  const [contact, notice, admissionsCycle, events] = await Promise.all([
    selectFirst(remote.contacts, approvals, now, "siteSettings", bindings, parseContact),
    selectFirst(remote.notices, approvals, now, "announcement", bindings, parseNotice),
    selectFirst(remote.admissionsCycles, approvals, now, "admissionCycle", bindings, parseAdmissionsCycle),
    selectEvents(remote.events, approvals, now, bindings),
  ]);
  const accepted = contact.accepted + notice.accepted + admissionsCycle.accepted + events.accepted;
  const rejected = contact.rejected + notice.rejected + admissionsCycle.rejected + events.rejected;

  if (accepted === 0) return fallbackResult("no-approved-content", rejected);

  const coreRemote = contact.value !== null && notice.value !== null && admissionsCycle.value !== null;
  return {
    contact: contact.value ?? { ...fallbackContact, workingHours: { ...fallbackContact.workingHours } },
    notice: notice.value,
    admissionsCycle: admissionsCycle.value ?? { ...safeFallback.admissionsCycle },
    events: events.value ?? [],
    status: {
      source: coreRemote ? "sanity" : "mixed",
      reason: "approved-content",
      remoteAccepted: accepted,
      remoteRejected: rejected,
    },
  };
}

function reviewProjection(
  contentType: EditorialContentType,
  candidate: UnknownRecord,
  now: number,
): EditorialReviewItem["projection"] {
  switch (contentType) {
    case "siteSettings": return parseContact(candidate);
    case "announcement": return parseNotice(candidate);
    case "admissionCycle": return parseAdmissionsCycle(candidate);
    case "event": return parseEvent(candidate, now);
  }
}

function safePublicationValue(value: unknown) {
  return sanitizePlainText(value, 40);
}

async function prepareEditorialReviewItem(input: {
  candidate: unknown;
  contentType: EditorialContentType;
  approvals: Set<string>;
  bindings: ReturnType<typeof createEditorialBindingIndex>;
  now: number;
}): Promise<EditorialReviewItem> {
  const { candidate, contentType, approvals, bindings, now } = input;
  const record = isRecord(candidate) ? candidate : {};
  const identity = editorialDocumentIdentity(record, contentType);
  const projection = identity ? reviewProjection(contentType, record, now) : null;
  const publication = isRecord(record.publication) ? record.publication : {};
  const approvalRecordIds = editorialApprovalRecordIds(publication.approvalRecordIds) ?? [];
  const manifestApproved = approvalRecordIds.length > 0 && approvalRecordIds.every((approvalRecordId) => approvals.has(approvalRecordId));
  const publicationWindowCurrent = hasCurrentPublicationWindow(record, now);
  const contentDigestSha256 = identity && projection
    ? await digestEditorialProjection({ contentType, ...identity, projection })
    : null;
  const exactBinding = Boolean(
    identity
    && projection
    && await hasMatchingEditorialBinding({ candidate: record, contentType, projection, index: bindings }),
  );
  const receiptReady = Boolean(identity && projection && manifestApproved && publicationWindowCurrent && contentDigestSha256);
  const blockers: string[] = [];

  if (!identity) blockers.push("Published document identity or revision is invalid.");
  if (!projection) blockers.push("The public projection did not pass server sanitization.");
  if (!manifestApproved) blockers.push("The canonical claim approval is missing, expired or not approved.");
  if (!publicationWindowCurrent) blockers.push("The published display window is missing, invalid or not current.");
  if (receiptReady && !exactBinding) blockers.push("The exact revision receipt has not been added to the binding registry.");

  const receiptProposal: EditorialReviewReceipt | null = receiptReady && identity && approvalRecordIds.length && contentDigestSha256
    ? {
        bindingId: `cms-binding-${contentType.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}-${contentDigestSha256.slice(0, 12)}`,
        approvalRecordIds,
        contentType,
        documentId: identity.documentId,
        revision: identity.revision,
        contentDigestSha256,
        boundOn: new Date(now).toISOString().slice(0, 10),
        ownerRole: "website-publisher",
        notes: `Exact sanitized ${contentType} public projection reviewed for this published revision.`,
      }
    : null;

  return {
    contentType,
    documentId: identity?.documentId ?? null,
    revision: identity?.revision ?? null,
    approvalRecordIds,
    validFrom: safePublicationValue(publication.validFrom),
    validUntil: safePublicationValue(publication.validUntil),
    projection,
    contentDigestSha256,
    status: exactBinding && receiptReady ? "bound" : receiptReady ? "ready-to-bind" : "blocked",
    checks: {
      identityValid: identity !== null,
      projectionValid: projection !== null,
      manifestApproved,
      publicationWindowCurrent,
      exactBinding,
    },
    blockers,
    receiptProposal,
  };
}

/**
 * Owner-review view of the exact public Sanity projection. It never exposes raw
 * CMS documents, drafts, tokens or fields outside the homepage allowlist.
 */
export async function getHomepageEditorialReview(
  options: HomepageEditorialOptions = {},
): Promise<HomepageEditorialReview> {
  if (typeof window !== "undefined") throw new Error("Editorial review is available on the server only.");

  const fetched = await fetchSanityEditorial(options);
  if (fetched.state === "fallback") {
    return {
      status: { reason: fetched.reason, candidates: 0, readyToBind: 0, bound: 0, blocked: 0 },
      items: [],
    };
  }

  const approvals = approvedRecordIds(options.manifest ?? approvalManifestData, fetched.now);
  const bindings = createEditorialBindingIndex(options.bindings ?? editorialPublicationBindings);
  const groups: { contentType: EditorialContentType; candidates: unknown[] }[] = [
    { contentType: "siteSettings", candidates: fetched.remote.contacts },
    { contentType: "announcement", candidates: fetched.remote.notices },
    { contentType: "admissionCycle", candidates: fetched.remote.admissionsCycles },
    { contentType: "event", candidates: fetched.remote.events },
  ];
  const items = await Promise.all(groups.flatMap(({ contentType, candidates }) => candidates.map((candidate) => (
    prepareEditorialReviewItem({ candidate, contentType, approvals, bindings, now: fetched.now })
  ))));

  return {
    status: {
      reason: "review-ready",
      candidates: items.length,
      readyToBind: items.filter((item) => item.status === "ready-to-bind").length,
      bound: items.filter((item) => item.status === "bound").length,
      blocked: items.filter((item) => item.status === "blocked").length,
    },
    items,
  };
}
