import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  acquireLegacyMigrationMatrixLock,
  legacyMigrationCanonicalLockPath,
  replaceLegacyMigrationFileWithRetry,
} from "../lib/legacy-migration-matrix-lock.mjs";

const projectRoot = new URL("../", import.meta.url);
const archiveRoot = new URL("work/SSKEMS-BACKUP/", projectRoot);
const sitemapUrl = new URL("sitemap.csv", archiveRoot);
const checksumsUrl = new URL("SHA256SUMS.csv", archiveRoot);
const archiveManifestUrl = new URL("ARCHIVE-MANIFEST.json", archiveRoot);
const cutoverUrl = new URL("content/legacy-cutover-inventory.json", projectRoot);
const outputUrl = new URL("content/legacy-content-migration-matrix.json", projectRoot);

const identityKinds = new Set(["teacher", "user"]);
const allowedKinds = new Set(["page", "post", "category", "post_format", "sk_igallery", "teacher", "user"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseCsv(source) {
  const text = source.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...values] = rows.filter((candidate) => candidate.some((entry) => entry.length));
  if (!headers) return [];
  return values.map((entries) => Object.fromEntries(headers.map((header, index) => [header, entries[index] ?? ""])));
}

function normalizedPath(sourceUrl) {
  let url;
  try {
    url = new URL(sourceUrl);
  } catch {
    return null;
  }
  const path = url.pathname.replace(/\/+$/, "");
  return path || "/";
}

function decodedTitle(value) {
  return value
    .replace(/^'(?=[=+\-@])/, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&#8211;", "–")
    .replaceAll("&#8217;", "’")
    .replaceAll("&quot;", '"')
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function classifyArea(row) {
  const path = row.content_file.replaceAll("\\", "/").toLowerCase();
  if (row.route_type === "teacher" || row.route_type === "user") return "identity";
  if (row.route_type === "category" || row.route_type === "post_format") return "taxonomy";
  if (row.route_type === "sk_igallery" || path.includes("galleries-and-media")) return "media";
  if (row.route_type === "post" || path.includes("/news/")) return "news";
  if (path.includes("/about/")) return "about";
  if (path.includes("/academics/")) return "academics";
  if (path.includes("/admissions/")) return "admissions";
  if (path.includes("mandatory-disclosure")) return "disclosure";
  if (path.includes("/contact/")) return "contact";
  if (path.includes("/facilities/")) return "facilities";
  if (path.endsWith("/home.md")) return "home";
  return "other";
}

function requiredReviews(row, area) {
  const reviews = new Set(["accuracy", "currency", "editorial", "management-approval"]);
  const searchable = `${row.title} ${row.source_url} ${row.content_file}`.toLowerCase();
  if (area === "identity") {
    reviews.add("privacy");
    reviews.add("evidence");
  }
  if (area === "media" || /gallery|media|video|achievement|result/.test(searchable)) {
    reviews.add("privacy");
    reviews.add("rights");
    reviews.add("retention");
    reviews.add("accessibility");
  }
  if (area === "academics" || /college|institute|competitive|foundation|jee|neet|curriculum/.test(searchable)) {
    reviews.add("institutional-model");
    reviews.add("evidence");
  }
  if (/\bvisit\b/.test(searchable)) {
    reviews.add("evidence");
  }
  if (area === "admissions" || /admission|registration|certificate|enrol/.test(searchable)) {
    reviews.add("data-protection");
  }
  if (area === "disclosure" || /document|pdf|affiliation|saras|oasis|appendix/.test(searchable)) {
    reviews.add("evidence");
    reviews.add("accessibility");
  }
  return [...reviews];
}

const [sitemapText, checksumsText, archiveManifestText, cutoverText] = await Promise.all([
  readFile(sitemapUrl, "utf8"),
  readFile(checksumsUrl, "utf8"),
  readFile(archiveManifestUrl, "utf8"),
  readFile(cutoverUrl, "utf8"),
]);

const sitemap = parseCsv(sitemapText);
const checksums = new Map(parseCsv(checksumsText).map((record) => [record.path.replaceAll("\\", "/"), record.sha256]));
const archiveManifest = JSON.parse(archiveManifestText);
const cutover = JSON.parse(cutoverText);

if (sitemap.length !== archiveManifest.counts.content_markdown_files) {
  throw new Error(`Archive sitemap has ${sitemap.length} records; expected ${archiveManifest.counts.content_markdown_files}.`);
}

const cutoverByPath = new Map(cutover.records.map((record) => [record.legacyPath, record]));
const records = sitemap.map((row) => {
  if (!allowedKinds.has(row.route_type)) throw new Error(`Unsupported source kind ${row.route_type}.`);
  const visibility = row.wordpress_status === "draft" ? "private-review" : "public";
  const archivePath = row.content_file.replaceAll("\\", "/");
  const sourceDigest = checksums.get(archivePath);
  if (!sourceDigest) throw new Error(`Missing checksum for ${archivePath}.`);

  const actualLegacyPath = visibility === "public" ? normalizedPath(row.source_url) : null;
  if (visibility === "public" && !actualLegacyPath) throw new Error(`Invalid public source URL for archive record ${row.wordpress_id || row.content_file}.`);
  const identityProtected = identityKinds.has(row.route_type) || visibility === "private-review";
  const sourceKey = [row.route_type, row.wordpress_id, row.source_url, archivePath].join("\u0000");
  const keyDigest = sha256(sourceKey).slice(0, 16);
  const area = classifyArea(row);
  const mappedRoute = actualLegacyPath ? cutoverByPath.get(actualLegacyPath) : null;

  return {
    id: `migration-${keyDigest}`,
    label: identityProtected
      ? visibility === "private-review"
        ? `Private ${row.route_type} record`
        : `Identity-bearing ${row.route_type} record`
      : decodedTitle(row.title) || `Untitled ${row.route_type} record`,
    sourceRef: `archive-content-${keyDigest}`,
    sourceDigest,
    sourceKind: row.route_type,
    sourceVisibility: visibility,
    sourceStatus: row.wordpress_status,
    sourceModifiedOn: row.last_modified ? row.last_modified.slice(0, 19) : null,
    area,
    identityProtected,
    legacyPath: identityProtected ? null : actualLegacyPath,
    routeContinuity: mappedRoute
      ? {
          status: "implemented",
          action: mappedRoute.disposition,
          targetPath: mappedRoute.targetPath,
          cutoverRecordId: mappedRoute.id,
        }
      : {
          status: "decision-required",
          action: "unselected",
          targetPath: null,
          cutoverRecordId: null,
        },
    requiredReviews: requiredReviews(row, area),
    contentDecision: {
      decision: "unselected",
      targetPath: null,
      mergeIntoRecordId: null,
      rationale: null,
      ownerRole: null,
      reviewedOn: null,
    },
    implementationStatus: "not-started",
    publicationEligible: false,
    publicationReason: "decision-and-approval-required",
  };
});

const publicCount = records.filter((record) => record.sourceVisibility === "public").length;
const privateCount = records.length - publicCount;
const implementedRoutes = records.filter((record) => record.routeContinuity.status === "implemented").length;
if (publicCount !== archiveManifest.counts.public_routes || privateCount !== archiveManifest.counts.draft_records) {
  throw new Error(`Archive visibility totals do not reconcile (${publicCount} public, ${privateCount} private).`);
}
if (implementedRoutes !== cutover.records.length) {
  throw new Error(`Only ${implementedRoutes} of ${cutover.records.length} cutover records reconciled.`);
}

const matrix = {
  $schema: "./legacy-content-migration-matrix.schema.json",
  schemaVersion: 1,
  matrixId: "sskem-legacy-content-migration",
  builtOn: new Date().toISOString().slice(0, 10),
  archive: {
    id: archiveManifest.archive_id,
    capturedOn: archiveManifest.archive_id.slice(-10),
    sitemapSha256: sha256(sitemapText),
    checksumManifestSha256: archiveManifest.integrity.manifest_sha256,
    expectedRecords: archiveManifest.counts.content_markdown_files,
    expectedPublicRecords: archiveManifest.counts.public_routes,
    expectedPrivateRecords: archiveManifest.counts.draft_records,
  },
  policy: {
    legacyContentIsApprovalEvidence: false,
    privateSourceDetailsStored: false,
    decisionsPreselected: false,
    downloadPersistsChanges: false,
    publicPublicationAllowed: false,
    notes: "This matrix accounts for archived records without copying content or evidence. Every route, content, approval and implementation decision remains explicit and fail closed.",
  },
  records,
};

if (!process.argv.includes("--write")) {
  console.log(JSON.stringify({
    output: outputUrl.pathname,
    records: records.length,
    publicRecords: publicCount,
    privateRecords: privateCount,
    implementedRoutes,
    publicRoutesAwaitingDecision: records.filter((record) => record.sourceVisibility === "public" && record.routeContinuity.status === "decision-required").length,
    writes: false,
  }, null, 2));
} else {
  const outputPath = fileURLToPath(outputUrl);
  const nextSource = `${JSON.stringify(matrix, null, 2)}\n`;
  const matrixLock = await acquireLegacyMigrationMatrixLock({
    matrixPath: outputPath,
    lockPath: legacyMigrationCanonicalLockPath,
    operation: "archive-refresh",
    matrixSha256Proposed: sha256(nextSource),
  });
  const temporaryPath = `${outputPath}.${process.pid}-${Date.now()}.tmp`;
  let committed = false;
  try {
    let existingSource = null;
    try {
      existingSource = await readFile(outputUrl, "utf8");
      const existing = JSON.parse(existingSource);
      const wouldEraseControlledState = Array.isArray(existing.records) && existing.records.some((record) => (
        record?.contentDecision?.decision !== "unselected"
        || record?.routeContinuity?.status === "planned"
        || record?.implementationStatus !== "not-started"
      ));
      if (wouldEraseControlledState) {
        throw new Error("Migration matrix refresh refuses to erase recorded decisions or implementation state. Preserve the current matrix and use a separately reviewed reconciliation workflow.");
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await writeFile(temporaryPath, nextSource, { encoding: "utf8", flag: "wx" });
    let sourceBeforeRename = null;
    try {
      sourceBeforeRename = await readFile(outputUrl, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    if (sourceBeforeRename !== existingSource) throw new Error("Migration matrix changed during the locked refresh. No refresh write was made.");
    await replaceLegacyMigrationFileWithRetry(temporaryPath, outputPath);
    committed = true;
    console.log(`Wrote ${records.length} sanitized migration records to content/legacy-content-migration-matrix.json.`);
  } finally {
    if (!committed) await rm(temporaryPath, { force: true });
    await matrixLock.release();
  }
}
