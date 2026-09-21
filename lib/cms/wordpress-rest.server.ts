export type WordPressCmsCollection = "pages" | "posts" | "media";

export type WordPressCmsEnvironment = {
  WORDPRESS_CMS_ORIGIN?: string;
};

export type WordPressCmsCandidate = {
  sourceId: string;
  wordpressId: number;
  collection: WordPressCmsCollection;
  slug: string;
  title: string;
  summary: string | null;
  bodyText: string | null;
  modifiedGmt: string;
  sourceUrl: string | null;
  mimeType: string | null;
  altText: string | null;
  fingerprintSha256: string;
  publicationState: "review-required";
  publicEligible: false;
  blockers: string[];
};

export type WordPressCmsCollectionStatus = {
  collection: WordPressCmsCollection;
  reportedTotal: number;
  retrieved: number;
  acceptedForReview: number;
  rejected: number;
};

export type WordPressCmsInventory = {
  origin: string | null;
  status: {
    source: "disabled" | "wordpress";
    reason: "missing-config" | "invalid-config" | "fetch-failed" | "invalid-response" | "review-ready";
    reviewCandidates: number;
    publicAccepted: 0;
    rejected: number;
  };
  collections: WordPressCmsCollectionStatus[];
  candidates: WordPressCmsCandidate[];
  policy: {
    authenticationSent: false;
    rawHtmlExposed: false;
    publicPublicationAutomatic: false;
    approvalBindingRequired: true;
  };
};

export type WordPressCmsInventoryOptions = {
  env?: WordPressCmsEnvironment;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

type UnknownRecord = Record<string, unknown>;

const ALLOWED_WORDPRESS_HOSTS = new Set([
  "www.sskemschool.com",
  "cms.sskemschool.com",
]);
const COLLECTIONS: WordPressCmsCollection[] = ["pages", "posts", "media"];
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_RECORDS_PER_COLLECTION = 100;
const MAX_RESPONSE_BYTES = 5_000_000;
const MAX_BODY_TEXT = 40_000;
const SOURCE_BLOCKER = "Legacy WordPress content remains review-only until its exact sanitized digest is bound to current approved records.";
const sourceKindByCollection: Record<WordPressCmsCollection, "page" | "post" | "media"> = {
  pages: "page",
  posts: "post",
  media: "media",
};

const fieldsByCollection: Record<WordPressCmsCollection, string[]> = {
  pages: ["id", "slug", "status", "type", "modified_gmt", "link", "title", "excerpt", "content"],
  posts: ["id", "slug", "status", "type", "modified_gmt", "link", "title", "excerpt", "content"],
  media: ["id", "slug", "status", "type", "modified_gmt", "source_url", "mime_type", "alt_text", "caption", "title"],
};

function emptyInventory(reason: WordPressCmsInventory["status"]["reason"], origin: string | null = null): WordPressCmsInventory {
  return {
    origin,
    status: {
      source: origin ? "wordpress" : "disabled",
      reason,
      reviewCandidates: 0,
      publicAccepted: 0,
      rejected: 0,
    },
    collections: [],
    candidates: [],
    policy: {
      authenticationSent: false,
      rawHtmlExposed: false,
      publicPublicationAutomatic: false,
      approvalBindingRequired: true,
    },
  };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function configuredOrigin(env: WordPressCmsEnvironment) {
  const supplied = env.WORDPRESS_CMS_ORIGIN?.trim() ?? "";
  if (!supplied) return { state: "missing" as const };

  try {
    const url = new URL(supplied);
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || url.pathname !== "/"
      || url.search
      || url.hash
      || url.port
      || !ALLOWED_WORDPRESS_HOSTS.has(url.hostname.toLowerCase())
    ) {
      return { state: "invalid" as const };
    }
    return { state: "ready" as const, origin: url.origin };
  } catch {
    return { state: "invalid" as const };
  }
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&", apos: "'", gt: ">", hellip: "…", laquo: "«", ldquo: "“",
    lsquo: "‘", lt: "<", nbsp: " ", quot: "\"", raquo: "»", rdquo: "”",
    rsquo: "’", ndash: "–", mdash: "—",
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x")) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isInteger(codePoint) && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : " ";
    }
    if (entity.startsWith("#")) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isInteger(codePoint) && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : " ";
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

function plainText(value: unknown, maximumLength: number, allowEmpty = false) {
  if (typeof value !== "string") return null;
  const withoutExecutableBlocks = value
    .replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/\[(?:\/?)[a-z][^\]]*\]/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const normalized = decodeHtmlEntities(withoutExecutableBlocks)
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\u2060\uFEFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return allowEmpty ? "" : null;
  if (normalized.length > maximumLength) return normalized.slice(0, maximumLength).trimEnd();
  return normalized;
}

function renderedText(value: unknown, maximumLength: number, allowEmpty = false) {
  return isRecord(value) ? plainText(value.rendered, maximumLength, allowEmpty) : null;
}

function safeSlug(value: unknown) {
  return typeof value === "string"
    && /^(?=.{1,200}$)(?=.*[a-z0-9])[a-z0-9_-]+$/.test(value)
    ? value
    : null;
}

function safeDateTime(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}Z`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

function safeSameOriginUrl(value: unknown, origin: string) {
  if (typeof value !== "string" || value.length > 2_000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.origin !== origin || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function safeMimeType(value: unknown) {
  return typeof value === "string" && /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(value) ? value.toLowerCase() : null;
}

async function digestProjection(value: unknown) {
  const data = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function parseCandidate(collection: WordPressCmsCollection, value: unknown, origin: string): Promise<WordPressCmsCandidate | null> {
  const expectedStatus = collection === "media" ? "inherit" : "publish";
  if (!isRecord(value) || value.status !== expectedStatus) return null;
  if (!Number.isInteger(value.id) || Number(value.id) <= 0) return null;
  const expectedType = collection === "pages" ? "page" : collection === "posts" ? "post" : "attachment";
  if (value.type !== expectedType) return null;

  const slug = safeSlug(value.slug);
  const modifiedGmt = safeDateTime(value.modified_gmt);
  const title = renderedText(value.title, 240);
  if (!slug || !modifiedGmt || !title) return null;

  let summary: string | null = null;
  let bodyText: string | null = null;
  let sourceUrl: string | null = null;
  let mimeType: string | null = null;
  let altText: string | null = null;

  if (collection === "media") {
    sourceUrl = safeSameOriginUrl(value.source_url, origin);
    mimeType = safeMimeType(value.mime_type);
    altText = plainText(value.alt_text, 500, true);
    summary = renderedText(value.caption, 1_000, true);
    if (!sourceUrl || !mimeType || altText === null || summary === null) return null;
    summary ||= null;
    altText ||= null;
  } else {
    sourceUrl = safeSameOriginUrl(value.link, origin);
    summary = renderedText(value.excerpt, 1_000, true);
    bodyText = renderedText(value.content, MAX_BODY_TEXT, true);
    if (!sourceUrl || summary === null || bodyText === null) return null;
    summary ||= null;
    bodyText ||= null;
  }

  const projection = {
    wordpressId: Number(value.id), collection, slug, title, summary, bodyText,
    modifiedGmt, sourceUrl, mimeType, altText,
  };
  return {
    sourceId: `wordpress:${sourceKindByCollection[collection]}:${value.id}`,
    ...projection,
    fingerprintSha256: await digestProjection(projection),
    publicationState: "review-required",
    publicEligible: false,
    blockers: [SOURCE_BLOCKER],
  };
}

function reportedTotal(headers: Headers | undefined, fallback: number) {
  const value = headers?.get("x-wp-total");
  if (!value || !/^\d{1,7}$/.test(value)) return fallback;
  return Number(value);
}

async function boundedJson(response: Response) {
  const contentType = response.headers?.get("content-type")?.toLowerCase() ?? "";
  if (!/^application\/(?:[a-z0-9.+-]+\+)?json(?:\s*;|$)/.test(contentType)) {
    throw new Error("invalid-response");
  }

  const declaredLength = response.headers?.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_RESPONSE_BYTES) {
    throw new Error("invalid-response");
  }

  const raw = await response.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_RESPONSE_BYTES) {
    throw new Error("invalid-response");
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("invalid-response");
  }
}

function requestTimeout(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return REQUEST_TIMEOUT_MS;
  return Math.min(15_000, Math.max(250, Math.trunc(value)));
}

async function fetchCollection(input: {
  collection: WordPressCmsCollection;
  origin: string;
  fetchImpl: typeof fetch;
  signal: AbortSignal;
}) {
  const endpoint = new URL(`/wp-json/wp/v2/${input.collection}`, input.origin);
  endpoint.searchParams.set("context", "view");
  if (input.collection !== "media") endpoint.searchParams.set("status", "publish");
  endpoint.searchParams.set("per_page", String(MAX_RECORDS_PER_COLLECTION));
  endpoint.searchParams.set("orderby", "modified");
  endpoint.searchParams.set("order", "desc");
  endpoint.searchParams.set("_fields", fieldsByCollection[input.collection].join(","));

  const response = await input.fetchImpl(endpoint, {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    signal: input.signal,
  });
  if (!response.ok) throw new Error("fetch-failed");
  if (response.url && new URL(response.url).origin !== input.origin) throw new Error("invalid-response");
  const payload = await boundedJson(response);
  if (!Array.isArray(payload)) throw new Error("invalid-response");

  const parsed = await Promise.all(payload.map((candidate) => parseCandidate(input.collection, candidate, input.origin)));
  const candidates = parsed.filter((candidate): candidate is WordPressCmsCandidate => candidate !== null);
  return {
    candidates,
    status: {
      collection: input.collection,
      reportedTotal: reportedTotal(response.headers, payload.length),
      retrieved: payload.length,
      acceptedForReview: candidates.length,
      rejected: payload.length - candidates.length,
    } satisfies WordPressCmsCollectionStatus,
  };
}

/**
 * Server-only, read-only WordPress discovery boundary. It never sends CMS
 * credentials, never returns raw HTML and never makes content public. Exact
 * approval and digest bindings are required before a later publication adapter
 * may consume any candidate.
 */
export async function getWordPressCmsInventory(
  options: WordPressCmsInventoryOptions = {},
): Promise<WordPressCmsInventory> {
  if (typeof window !== "undefined") throw new Error("WordPress CMS inventory is available on the server only.");

  const configured = configuredOrigin(options.env ?? {
    WORDPRESS_CMS_ORIGIN: process.env.WORDPRESS_CMS_ORIGIN,
  });
  if (configured.state === "missing") return emptyInventory("missing-config");
  if (configured.state === "invalid") return emptyInventory("invalid-config");

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeout(options.timeoutMs));

  try {
    const results = await Promise.all(COLLECTIONS.map((collection) => fetchCollection({
      collection,
      origin: configured.origin,
      fetchImpl,
      signal: controller.signal,
    })));
    const candidates = results.flatMap((result) => result.candidates);
    const rejected = results.reduce((total, result) => total + result.status.rejected, 0);
    return {
      origin: configured.origin,
      status: {
        source: "wordpress",
        reason: "review-ready",
        reviewCandidates: candidates.length,
        publicAccepted: 0,
        rejected,
      },
      collections: results.map((result) => result.status),
      candidates,
      policy: emptyInventory("missing-config").policy,
    };
  } catch (error) {
    const reason = error instanceof Error && error.message === "invalid-response"
      ? "invalid-response"
      : "fetch-failed";
    return emptyInventory(reason, configured.origin);
  } finally {
    clearTimeout(timeout);
  }
}
