import { createHash } from "node:crypto";

import {
  isIssuedProgrammePageData,
  type ProgrammePageData,
} from "./programmes-data-adapter.ts";
import {
  isApprovedProgrammeRenderGate,
  type ApprovedProgrammeRenderGate,
} from "./programmes-render-gate.ts";
import {
  isProgrammesPublicationRoute,
  type ProgrammesPublicationRoute,
} from "./programmes-publication-routes.ts";

export const PROGRAMME_TIME_SENSITIVE_SECTIONS = Object.freeze([
  "fees",
  "schedule",
  "results",
  "admissions",
] as const);

export type ProgrammeTimeSensitiveSection = (typeof PROGRAMME_TIME_SENSITIVE_SECTIONS)[number];

export type ProgrammeExpiryFallback = Readonly<{
  id: string;
  title: string;
  message: string;
  action: Readonly<{ label: string; href: "/contact" }>;
}>;

type ScheduleContent = Omit<ProgrammePageData["components"]["schedule"], "validUntil">;
type FeeContent = Omit<NonNullable<ProgrammePageData["components"]["feeSummary"]>, "validUntil">;
type ResultItem = ProgrammePageData["components"]["results"]["results"][number];
type ResultsContent = Readonly<{ results: readonly Omit<ResultItem, "validUntil">[] }>;
type AdmissionsContent = Omit<ProgrammePageData["components"]["admissionsCta"], "validUntil">;

type CurrentSection<T> = Readonly<{
  state: "current";
  validUntil: string;
  content: T;
  fallback: null;
}>;

type FallbackSection = Readonly<{
  state: "fallback";
  reason: "expired" | "invalid-window";
  validUntil: string | null;
  content: null;
  fallback: ProgrammeExpiryFallback;
}>;

type NotApplicableSection = Readonly<{
  state: "not-applicable";
  validUntil: null;
  content: null;
  fallback: null;
}>;

export type ProgrammeExpirySection<T> = CurrentSection<T> | FallbackSection | NotApplicableSection;

type SectionReceipt = Readonly<{
  state: "current" | "fallback" | "not-applicable";
  reason: "expired" | "invalid-window" | "not-applicable" | null;
  validUntil: string | null;
  fallbackId: string | null;
}>;

export type ProgrammeExpiryReceipt = Readonly<{
  schemaVersion: 1;
  receiptType: "programme-expiry-projection";
  generatedAt: string;
  route: ProgrammesPublicationRoute;
  packageDigest: `sha256:${string}`;
  routeDigest: `sha256:${string}`;
  sourceProjectionDigest: `sha256:${string}`;
  projectionDigest: `sha256:${string}`;
  sections: Readonly<Record<ProgrammeTimeSensitiveSection, SectionReceipt>>;
  rollbackTarget: Readonly<{
    receiptDigest: `sha256:${string}`;
    projectionDigest: `sha256:${string}`;
    packageDigest: `sha256:${string}`;
    routeDigest: `sha256:${string}`;
  }> | null;
  controls: Readonly<{
    expiryEndOfDayUtc: true;
    expiredContentIncluded: false;
    expiredContentRestorationAllowed: false;
    freshValidityRequiredForRollback: true;
    approvedProjectionBundleRequired: true;
    repositoryWritePerformed: false;
    deploymentPerformed: false;
  }>;
  receiptDigest: `sha256:${string}`;
}>;

export type ProgrammeExpiryProjection = Readonly<{
  route: ProgrammesPublicationRoute;
  packageDigest: `sha256:${string}`;
  routeDigest: `sha256:${string}`;
  sections: Readonly<{
    fees: ProgrammeExpirySection<FeeContent>;
    schedule: ProgrammeExpirySection<ScheduleContent>;
    results: ProgrammeExpirySection<ResultsContent>;
    admissions: ProgrammeExpirySection<AdmissionsContent>;
  }>;
  receipt: ProgrammeExpiryReceipt;
}>;

const digestPattern = /^sha256:[a-f0-9]{64}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const receiptKeys = new Set(["schemaVersion", "receiptType", "generatedAt", "route", "packageDigest", "routeDigest", "sourceProjectionDigest", "projectionDigest", "sections", "rollbackTarget", "controls", "receiptDigest"]);
const sectionReceiptKeys = new Set(["state", "reason", "validUntil", "fallbackId"]);
const rollbackKeys = new Set(["receiptDigest", "projectionDigest", "packageDigest", "routeDigest"]);
const controlKeys = new Set(["expiryEndOfDayUtc", "expiredContentIncluded", "expiredContentRestorationAllowed", "freshValidityRequiredForRollback", "approvedProjectionBundleRequired", "repositoryWritePerformed", "deploymentPerformed"]);
const issuedProjections = new WeakSet<object>();

export const programmeExpiryFallbacks: Readonly<Record<ProgrammeTimeSensitiveSection, ProgrammeExpiryFallback>> = Object.freeze({
  fees: Object.freeze({
    id: "programme-fees-updating",
    title: "Current fee information is being updated",
    message: "The previous fee summary is no longer current and has been hidden. Contact the school for approved fee guidance.",
    action: Object.freeze({ label: "Contact the school", href: "/contact" as const }),
  }),
  schedule: Object.freeze({
    id: "programme-schedule-updating",
    title: "The current schedule is being updated",
    message: "The previous schedule is no longer current and has been hidden. Contact the school for the latest approved timetable guidance.",
    action: Object.freeze({ label: "Contact the school", href: "/contact" as const }),
  }),
  results: Object.freeze({
    id: "programme-results-updating",
    title: "Verified results are being refreshed",
    message: "The previous results publication window has ended, so those figures are hidden until a current approved record is available.",
    action: Object.freeze({ label: "Contact the school", href: "/contact" as const }),
  }),
  admissions: Object.freeze({
    id: "programme-admissions-updating",
    title: "Current admissions information is being updated",
    message: "The previous Programme admissions notice is no longer current and has been hidden. Use the school contact page for current guidance.",
    action: Object.freeze({ label: "Contact the school", href: "/contact" as const }),
  }),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error("Programme expiry digests cannot contain undefined values.");
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

function digest(value: unknown): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(canonicalJson(value), "utf8").digest("hex")}`;
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function controlledNow(value: string | Date | undefined) {
  const now = value instanceof Date ? new Date(value.valueOf()) : new Date(value ?? Date.now());
  if (Number.isNaN(now.valueOf())) throw new Error("Programme expiry projection requires a valid current time.");
  return now;
}

function omitKey<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(value).filter(([candidate]) => candidate !== String(key)),
  ) as Omit<T, K>;
}

function hasExactKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>) {
  const keys = Object.keys(value);
  return keys.length === allowed.size && keys.every((key) => allowed.has(key));
}

function decide<T>(section: ProgrammeTimeSensitiveSection, validUntil: unknown, content: T | null): ProgrammeExpirySection<T> {
  if (content === null) return deepFreeze({ state: "not-applicable", validUntil: null, content: null, fallback: null });
  if (!validDate(validUntil)) {
    return deepFreeze({ state: "fallback", reason: "invalid-window", validUntil: null, content: null, fallback: programmeExpiryFallbacks[section] });
  }
  return deepFreeze({ state: "current", validUntil, content, fallback: null });
}

function expire<T>(section: ProgrammeTimeSensitiveSection, decision: ProgrammeExpirySection<T>, today: string): ProgrammeExpirySection<T> {
  if (decision.state !== "current" || decision.validUntil >= today) return decision;
  return deepFreeze({ state: "fallback", reason: "expired", validUntil: decision.validUntil, content: null, fallback: programmeExpiryFallbacks[section] });
}

function receiptSection(decision: ProgrammeExpirySection<unknown>): SectionReceipt {
  return {
    state: decision.state,
    reason: decision.state === "fallback" ? decision.reason : decision.state === "not-applicable" ? "not-applicable" : null,
    validUntil: decision.validUntil,
    fallbackId: decision.state === "fallback" ? decision.fallback.id : null,
  };
}

function receiptCore(receipt: ProgrammeExpiryReceipt | Record<string, unknown>) {
  const core: Record<string, unknown> = { ...receipt };
  delete core.receiptDigest;
  return core;
}

export function validateProgrammeExpiryReceipt(value: unknown): readonly string[] {
  const issues: string[] = [];
  if (!isRecord(value)) return ["Programme expiry receipt must be an object."];
  if (!hasExactKeys(value, receiptKeys)) issues.push("Programme expiry receipt must contain exactly the required fields.");
  if (value.schemaVersion !== 1 || value.receiptType !== "programme-expiry-projection") issues.push("Programme expiry receipt identity is invalid.");
  if (typeof value.generatedAt !== "string" || Number.isNaN(Date.parse(value.generatedAt))) issues.push("Programme expiry receipt time is invalid.");
  if (typeof value.route !== "string" || !isProgrammesPublicationRoute(value.route)) issues.push("Programme expiry receipt route is invalid.");
  for (const key of ["packageDigest", "routeDigest", "sourceProjectionDigest", "projectionDigest", "receiptDigest"]) {
    if (typeof value[key] !== "string" || !digestPattern.test(value[key] as string)) issues.push(`Programme expiry receipt ${key} is invalid.`);
  }

  if (!isRecord(value.sections) || Object.keys(value.sections).length !== PROGRAMME_TIME_SENSITIVE_SECTIONS.length) {
    issues.push("Programme expiry receipt must contain the exact four section decisions.");
  } else {
    for (const section of PROGRAMME_TIME_SENSITIVE_SECTIONS) {
      const decision = value.sections[section];
      if (!isRecord(decision) || !hasExactKeys(decision, sectionReceiptKeys)) {
        issues.push(`Programme expiry receipt ${section} decision is invalid.`);
        continue;
      }
      if (!(["current", "fallback", "not-applicable"] as unknown[]).includes(decision.state)) issues.push(`Programme expiry receipt ${section} state is invalid.`);
      if (decision.state === "current" && (!validDate(decision.validUntil) || decision.reason !== null || decision.fallbackId !== null)) issues.push(`Programme expiry receipt ${section} current state is malformed.`);
      if (decision.state === "not-applicable" && (decision.validUntil !== null || decision.reason !== "not-applicable" || decision.fallbackId !== null)) issues.push(`Programme expiry receipt ${section} not-applicable state is malformed.`);
      if (decision.state === "fallback") {
        if (!(["expired", "invalid-window"] as unknown[]).includes(decision.reason)) issues.push(`Programme expiry receipt ${section} fallback reason is invalid.`);
        if (decision.reason === "expired" && !validDate(decision.validUntil)) issues.push(`Programme expiry receipt ${section} expired state lacks a valid end date.`);
        if (decision.reason === "invalid-window" && decision.validUntil !== null) issues.push(`Programme expiry receipt ${section} invalid window must not preserve an invalid date.`);
        if (decision.fallbackId !== programmeExpiryFallbacks[section].id) issues.push(`Programme expiry receipt ${section} fallback is not canonical.`);
      }
    }
  }

  if (value.rollbackTarget !== null) {
    if (!isRecord(value.rollbackTarget) || !hasExactKeys(value.rollbackTarget, rollbackKeys)) {
      issues.push("Programme expiry rollback target is invalid.");
    } else {
      for (const key of rollbackKeys) if (typeof value.rollbackTarget[key] !== "string" || !digestPattern.test(value.rollbackTarget[key] as string)) issues.push(`Programme expiry rollback target ${key} is invalid.`);
    }
  }
  if (!isRecord(value.controls) || !hasExactKeys(value.controls, controlKeys)
    || value.controls.expiryEndOfDayUtc !== true
    || value.controls.expiredContentIncluded !== false
    || value.controls.expiredContentRestorationAllowed !== false
    || value.controls.freshValidityRequiredForRollback !== true
    || value.controls.approvedProjectionBundleRequired !== true
    || value.controls.repositoryWritePerformed !== false
    || value.controls.deploymentPerformed !== false) issues.push("Programme expiry receipt controls are invalid.");

  if (typeof value.receiptDigest === "string" && digestPattern.test(value.receiptDigest) && digest(receiptCore(value)) !== value.receiptDigest) {
    issues.push("Programme expiry receipt digest does not match its exact contents.");
  }
  return Object.freeze([...new Set(issues)]);
}

export function resolveProgrammeExpiryProjection(options: {
  page: ProgrammePageData;
  now?: string | Date;
  previousReceipt?: unknown;
}): ProgrammeExpiryProjection {
  if (!isIssuedProgrammePageData(options.page)) throw new Error("Programme expiry projection requires adapter-issued page data.");
  const now = controlledNow(options.now);
  const today = now.toISOString().slice(0, 10);
  const components = options.page.components;
  const rawSections = {
    fees: decide("fees", components.feeSummary?.validUntil, components.feeSummary ? omitKey(components.feeSummary, "validUntil") : null),
    schedule: decide("schedule", components.schedule.validUntil, omitKey(components.schedule, "validUntil")),
    results: decide(
      "results",
      components.results.results.length ? [...components.results.results.map((result) => result.validUntil)].sort()[0] : null,
      components.results.results.length ? { results: components.results.results.map((result) => omitKey(result, "validUntil")) } : null,
    ),
    admissions: decide("admissions", components.admissionsCta.validUntil, omitKey(components.admissionsCta, "validUntil")),
  } as const;
  const sections = deepFreeze({
    fees: expire("fees", rawSections.fees, today),
    schedule: expire("schedule", rawSections.schedule, today),
    results: expire("results", rawSections.results, today),
    admissions: expire("admissions", rawSections.admissions, today),
  }) satisfies ProgrammeExpiryProjection["sections"];

  let rollbackTarget: ProgrammeExpiryReceipt["rollbackTarget"] = null;
  if (options.previousReceipt !== undefined) {
    const issues = validateProgrammeExpiryReceipt(options.previousReceipt);
    if (issues.length) throw new Error(`Previous Programme expiry receipt is invalid: ${issues.join(" ")}`);
    const previous = options.previousReceipt as ProgrammeExpiryReceipt;
    if (previous.route !== options.page.route) throw new Error("Previous Programme expiry receipt belongs to another route.");
    rollbackTarget = {
      receiptDigest: previous.receiptDigest,
      projectionDigest: previous.projectionDigest,
      packageDigest: previous.packageDigest,
      routeDigest: previous.routeDigest,
    };
  }

  const sourceProjection = {
    route: options.page.route,
    packageDigest: options.page.gate.packageDigest,
    routeDigest: options.page.gate.routeDigest,
    sections: {
      fees: components.feeSummary,
      schedule: components.schedule,
      results: components.results,
      admissions: components.admissionsCta,
    },
  };
  const projectedContent = { route: options.page.route, packageDigest: options.page.gate.packageDigest, routeDigest: options.page.gate.routeDigest, sections };
  const core = {
    schemaVersion: 1 as const,
    receiptType: "programme-expiry-projection" as const,
    generatedAt: now.toISOString(),
    route: options.page.route,
    packageDigest: options.page.gate.packageDigest,
    routeDigest: options.page.gate.routeDigest,
    sourceProjectionDigest: digest(sourceProjection),
    projectionDigest: digest(projectedContent),
    sections: Object.freeze(Object.fromEntries(PROGRAMME_TIME_SENSITIVE_SECTIONS.map((section) => [section, receiptSection(sections[section])])) as Record<ProgrammeTimeSensitiveSection, SectionReceipt>),
    rollbackTarget,
    controls: Object.freeze({
      expiryEndOfDayUtc: true as const,
      expiredContentIncluded: false as const,
      expiredContentRestorationAllowed: false as const,
      freshValidityRequiredForRollback: true as const,
      approvedProjectionBundleRequired: true as const,
      repositoryWritePerformed: false as const,
      deploymentPerformed: false as const,
    }),
  };
  const receipt = deepFreeze({ ...core, receiptDigest: digest(core) }) as ProgrammeExpiryReceipt;
  const projection = deepFreeze({
    route: options.page.route,
    packageDigest: options.page.gate.packageDigest,
    routeDigest: options.page.gate.routeDigest,
    sections,
    receipt,
  });
  issuedProjections.add(projection);
  return projection;
}

export function isIssuedProgrammeExpiryProjection(
  value: unknown,
  gate?: ApprovedProgrammeRenderGate,
): value is ProgrammeExpiryProjection {
  if (!isRecord(value) || !issuedProjections.has(value) || typeof value.route !== "string" || !isProgrammesPublicationRoute(value.route)) return false;
  if (!gate) return true;
  return isApprovedProgrammeRenderGate(gate, value.route)
    && value.packageDigest === gate.packageDigest
    && value.routeDigest === gate.routeDigest;
}

export type ProgrammeRollbackPlan = Readonly<{
  planVersion: 1;
  planType: "programme-expiry-rollback";
  status: "ready-for-explicit-rollback" | "blocked";
  generatedAt: string;
  route: ProgrammesPublicationRoute | null;
  activeReceiptDigest: string | null;
  targetReceiptDigest: string | null;
  targetProjectionDigest: string | null;
  blockers: readonly string[];
  controls: Readonly<{
    exactRollbackTargetRequired: true;
    freshValidityRequired: true;
    approvedProjectionBundleRequired: true;
    expiredContentRestorationAllowed: false;
    repositoryWritePerformed: false;
    deploymentPerformed: false;
  }>;
  planDigest: `sha256:${string}`;
}>;

export function planProgrammeExpiryRollback(options: {
  activeReceipt: unknown;
  targetReceipt: unknown;
  now?: string | Date;
}): ProgrammeRollbackPlan {
  const now = controlledNow(options.now);
  const today = now.toISOString().slice(0, 10);
  const activeIssues = validateProgrammeExpiryReceipt(options.activeReceipt);
  const targetIssues = validateProgrammeExpiryReceipt(options.targetReceipt);
  const active = isRecord(options.activeReceipt) ? options.activeReceipt : {};
  const target = isRecord(options.targetReceipt) ? options.targetReceipt : {};
  const blockers = [
    ...activeIssues.map((issue) => `Active receipt: ${issue}`),
    ...targetIssues.map((issue) => `Target receipt: ${issue}`),
  ];
  const route = typeof active.route === "string" && isProgrammesPublicationRoute(active.route) ? active.route : null;

  if (!activeIssues.length && !targetIssues.length) {
    const typedActive = active as ProgrammeExpiryReceipt;
    const typedTarget = target as ProgrammeExpiryReceipt;
    if (typedActive.route !== typedTarget.route) blockers.push("Rollback receipts belong to different Programme routes.");
    if (typedActive.rollbackTarget?.receiptDigest !== typedTarget.receiptDigest
      || typedActive.rollbackTarget?.projectionDigest !== typedTarget.projectionDigest
      || typedActive.rollbackTarget?.packageDigest !== typedTarget.packageDigest
      || typedActive.rollbackTarget?.routeDigest !== typedTarget.routeDigest) blockers.push("Target receipt is not the exact rollback target retained by the active receipt.");
    if (Date.parse(typedTarget.generatedAt) > now.valueOf()) blockers.push("Rollback target receipt was generated in the future.");
    for (const section of PROGRAMME_TIME_SENSITIVE_SECTIONS) {
      const decision = typedTarget.sections[section];
      if (decision.state === "current" && (!validDate(decision.validUntil) || decision.validUntil < today)) {
        blockers.push(`Rollback target would restore expired ${section} content.`);
      }
    }
  }

  const core = {
    planVersion: 1 as const,
    planType: "programme-expiry-rollback" as const,
    status: blockers.length ? "blocked" as const : "ready-for-explicit-rollback" as const,
    generatedAt: now.toISOString(),
    route,
    activeReceiptDigest: typeof active.receiptDigest === "string" ? active.receiptDigest : null,
    targetReceiptDigest: typeof target.receiptDigest === "string" ? target.receiptDigest : null,
    targetProjectionDigest: typeof target.projectionDigest === "string" ? target.projectionDigest : null,
    blockers: Object.freeze([...new Set(blockers)]),
    controls: Object.freeze({
      exactRollbackTargetRequired: true as const,
      freshValidityRequired: true as const,
      approvedProjectionBundleRequired: true as const,
      expiredContentRestorationAllowed: false as const,
      repositoryWritePerformed: false as const,
      deploymentPerformed: false as const,
    }),
  };
  return deepFreeze({ ...core, planDigest: digest(core) });
}
