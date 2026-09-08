import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { privateProgrammeRouteShells } from "../app/data/programme-route-shells.ts";
import budgetData from "../content/programmes-performance-budget.json" with { type: "json" };
import { motionDurationSeconds } from "./motion-tokens.generated.ts";
import type { ProgrammePrototypeMedia } from "./programmes-media.ts";
import { PROGRAMMES_PUBLICATION_ROUTES } from "./programmes-publication-routes.ts";

type UnknownRecord = Record<string, unknown>;

export type ProgrammesPerformanceBudget = typeof budgetData;

export type ProgrammeHeroMediaMeasurement = Readonly<{
  route: string;
  kind: "image" | "poster" | "video";
  source: string;
  bytes: number;
  maximumBytes: number;
  width?: number;
  height?: number;
}>;

type HeroAuditSource = Readonly<{
  kind: "image" | "poster" | "video";
  source: string;
  maximumBytes: number;
  dimensions?: Readonly<{ width: number; height: number }>;
}>;

const topLevelKeys = new Set([
  "$schema",
  "schemaVersion",
  "budgetId",
  "scope",
  "heroMedia",
  "pageWeight",
  "fonts",
  "animations",
  "webVitals",
]);
const scopeKeys = new Set(["routes", "privateReviewOnly", "auditMayModifyMedia"]);
const heroKeys = new Set(["maximumImageBytes", "maximumPosterBytes", "maximumVideoBytes", "maximumInitialVideoTransferBytes"]);
const pageKeys = new Set(["maximumInitialTransferBytes", "maximumRequests"]);
const fontKeys = new Set(["maximumFamilies", "maximumFiles", "maximumTransferBytes", "systemFontsOnly"]);
const animationKeys = new Set(["maximumMotionComponents", "maximumAutoplayMedia", "maximumInfiniteAnimations", "maximumSingleDurationMs", "reducedMotionRequired"]);
const vitalKeys = new Set(["maximumLcpMs", "maximumCls"]);

export const programmesPerformanceBudget = budgetData as ProgrammesPerformanceBudget;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function unknownKeys(value: unknown, allowed: ReadonlySet<string>) {
  return isRecord(value) ? Object.keys(value).filter((key) => !allowed.has(key)) : [];
}

function positiveInteger(value: unknown, maximum: number) {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) <= maximum;
}

function exactRoutes(value: unknown) {
  return Array.isArray(value)
    && value.length === PROGRAMMES_PUBLICATION_ROUTES.length
    && PROGRAMMES_PUBLICATION_ROUTES.every((route, index) => value[index] === route);
}

export function validateProgrammesPerformanceBudget(budget: unknown = programmesPerformanceBudget) {
  const issues: string[] = [];
  if (!isRecord(budget)) return ["The Programme performance budget must be an object."];
  if (unknownKeys(budget, topLevelKeys).length) issues.push("The Programme performance budget contains unknown top-level fields.");
  if (
    budget.$schema !== "./programmes-performance-budget.schema.json"
    || budget.schemaVersion !== 1
    || budget.budgetId !== "sskem-programmes-performance-v1"
  ) issues.push("The Programme performance budget identity is invalid.");

  if (!isRecord(budget.scope) || unknownKeys(budget.scope, scopeKeys).length) {
    issues.push("The Programme performance scope is invalid.");
  } else if (!exactRoutes(budget.scope.routes) || budget.scope.privateReviewOnly !== true || budget.scope.auditMayModifyMedia !== false) {
    issues.push("The Programme performance scope must contain the exact private routes and remain read-only.");
  }

  if (!isRecord(budget.heroMedia) || unknownKeys(budget.heroMedia, heroKeys).length) {
    issues.push("The Programme hero-media budget is invalid.");
  } else if (
    !positiveInteger(budget.heroMedia.maximumImageBytes, 250000)
    || !positiveInteger(budget.heroMedia.maximumPosterBytes, 250000)
    || !positiveInteger(budget.heroMedia.maximumVideoBytes, 3000000)
    || budget.heroMedia.maximumInitialVideoTransferBytes !== 0
  ) issues.push("The Programme hero-media limits exceed the v1 ceiling or allow initial video transfer.");

  if (!isRecord(budget.pageWeight) || unknownKeys(budget.pageWeight, pageKeys).length) {
    issues.push("The Programme page-weight budget is invalid.");
  } else if (
    !positiveInteger(budget.pageWeight.maximumInitialTransferBytes, 1500000)
    || !positiveInteger(budget.pageWeight.maximumRequests, 32)
  ) issues.push("The Programme page-weight limits exceed the v1 ceiling.");

  if (!isRecord(budget.fonts) || unknownKeys(budget.fonts, fontKeys).length) {
    issues.push("The Programme font budget is invalid.");
  } else if (
    budget.fonts.maximumFamilies !== 2
    || budget.fonts.maximumFiles !== 0
    || budget.fonts.maximumTransferBytes !== 0
    || budget.fonts.systemFontsOnly !== true
  ) issues.push("Programme routes must use the two system-font stacks and transfer no font files.");

  if (!isRecord(budget.animations) || unknownKeys(budget.animations, animationKeys).length) {
    issues.push("The Programme animation budget is invalid.");
  } else if (
    !Number.isInteger(budget.animations.maximumMotionComponents)
    || Number(budget.animations.maximumMotionComponents) < 0
    || Number(budget.animations.maximumMotionComponents) > 2
    || budget.animations.maximumAutoplayMedia !== 0
    || budget.animations.maximumInfiniteAnimations !== 0
    || !Number.isInteger(budget.animations.maximumSingleDurationMs)
    || Number(budget.animations.maximumSingleDurationMs) < 0
    || Number(budget.animations.maximumSingleDurationMs) > 700
    || budget.animations.reducedMotionRequired !== true
  ) issues.push("The Programme animation limits exceed the bounded-motion contract.");

  if (!isRecord(budget.webVitals) || unknownKeys(budget.webVitals, vitalKeys).length) {
    issues.push("The Programme Web Vitals budget is invalid.");
  } else if (
    !positiveInteger(budget.webVitals.maximumLcpMs, 2500)
    || typeof budget.webVitals.maximumCls !== "number"
    || budget.webVitals.maximumCls < 0
    || budget.webVitals.maximumCls > 0.1
  ) issues.push("The Programme Web Vitals limits exceed LCP 2.5 seconds or CLS 0.1.");

  return issues;
}

function projectPath(rootDir: string, publicSource: string) {
  if (!publicSource.startsWith("/") || publicSource.includes("..") || publicSource.includes("\\")) {
    throw new Error(`Non-canonical public media path: ${publicSource}`);
  }
  const resolved = path.resolve(rootDir, "public", publicSource.slice(1));
  const publicRoot = path.resolve(rootDir, "public");
  if (resolved !== publicRoot && !resolved.startsWith(`${publicRoot}${path.sep}`)) {
    throw new Error(`Media path escapes public/: ${publicSource}`);
  }
  return resolved;
}

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const resolved = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(resolved) : [resolved];
  }));
  return nested.flat();
}

export async function auditProgrammesPerformanceBudget(options: { rootDir?: string; budget?: ProgrammesPerformanceBudget } = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const budget = options.budget ?? programmesPerformanceBudget;
  const issues = validateProgrammesPerformanceBudget(budget);
  const measurements: ProgrammeHeroMediaMeasurement[] = [];

  for (const route of PROGRAMMES_PUBLICATION_ROUTES) {
    const media: ProgrammePrototypeMedia = privateProgrammeRouteShells[route].media;
    const sources: HeroAuditSource[] = [];
    if (media.kind === "image") {
      sources.push({ kind: "image", source: media.src, maximumBytes: budget.heroMedia.maximumImageBytes, dimensions: media });
    } else {
      sources.push({ kind: "poster", source: media.poster.src, maximumBytes: budget.heroMedia.maximumPosterBytes, dimensions: media.poster });
      sources.push(...media.sources.map((source) => ({ kind: "video" as const, source: source.src, maximumBytes: budget.heroMedia.maximumVideoBytes })));
    }

    for (const source of sources) {
      try {
        const resolved = projectPath(rootDir, source.source);
        const file = await stat(resolved);
        const imageMetadata = source.kind === "video" ? undefined : await sharp(resolved).metadata();
        const measurement: ProgrammeHeroMediaMeasurement = {
          route,
          kind: source.kind,
          source: source.source,
          bytes: file.size,
          maximumBytes: source.maximumBytes,
          ...(imageMetadata ? { width: imageMetadata.width, height: imageMetadata.height } : {}),
        };
        if (source.kind !== "video" && source.dimensions) {
          if (imageMetadata?.width !== source.dimensions.width || imageMetadata?.height !== source.dimensions.height) {
            issues.push(`${route} ${source.kind} dimensions differ from the declared intrinsic dimensions.`);
          }
        }
        measurements.push(Object.freeze(measurement));
        if (!file.isFile()) issues.push(`${route} ${source.kind} is not a file.`);
        if (file.size > source.maximumBytes) issues.push(`${route} ${source.kind} exceeds ${source.maximumBytes} bytes.`);
      } catch (error) {
        issues.push(`${route} media audit failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  const [sourceFiles, tokenStyles, globalStyles] = await Promise.all([
    Promise.all(["app", "components"].map((folder) => filesUnder(path.join(rootDir, folder)))).then((groups) => groups.flat()),
    readFile(path.join(rootDir, "app", "tokens.css"), "utf8"),
    readFile(path.join(rootDir, "app", "globals.css"), "utf8"),
  ]);
  const textSourceFiles = sourceFiles.filter((file) => /\.(?:css|mjs|ts|tsx)$/.test(file));
  const sourceText = (await Promise.all(textSourceFiles.map((file) => readFile(file, "utf8")))).join("\n");
  const fontFiles = [...new Set(sourceText.match(/[^\s"')]+\.(?:woff2?|ttf|otf)(?:\?[^\s"')]*)?/gi) ?? [])];
  const familyTokens = [...tokenStyles.matchAll(/--font-family-(?:heading|body)\s*:/g)];
  if (familyTokens.length > budget.fonts.maximumFamilies) issues.push(`Programme typography defines ${familyTokens.length} font families; budget allows ${budget.fonts.maximumFamilies}.`);
  if (fontFiles.length > budget.fonts.maximumFiles) issues.push(`The public directory contains ${fontFiles.length} font files; Programme routes allow none.`);
  if (/@font-face|from\s+["']next\/font|fonts\.googleapis\.com/i.test(sourceText)) issues.push("Programme routes require system fonts, but a web-font source was found.");

  const longestMotionMs = Math.max(...Object.values(motionDurationSeconds)) * 1000;
  if (longestMotionMs > budget.animations.maximumSingleDurationMs) issues.push(`Motion tokens reach ${longestMotionMs} ms; budget allows ${budget.animations.maximumSingleDurationMs} ms.`);
  if (!/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-duration: 0ms !important;[\s\S]*transition-duration: 0ms !important;/.test(globalStyles)) {
    issues.push("The global reduced-motion override is missing.");
  }

  return Object.freeze({
    budgetId: budget.budgetId,
    measurements: Object.freeze(measurements),
    fontFamilies: familyTokens.length,
    fontFiles: fontFiles.length,
    longestMotionMs,
    issues: Object.freeze([...new Set(issues)]),
    ready: issues.length === 0,
  });
}
