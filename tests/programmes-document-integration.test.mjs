import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  isPipelineApprovedProgrammeDocument,
  resolveApprovedProgrammeDocuments,
} from "../lib/programmes-document-integration.ts";

const NOW = "2026-09-03T08:00:00.000Z";
const route = "/school/academics";

const records = [
  ["document-mpd-c-2", "mpd-c-2", "timetable", "academic-calendar-2026-27.pdf", "Annual academic calendar 2026-27", "2"],
  ["document-mpd-c-1", "mpd-c-1", "fee-circular", "fee-circular-2026-27.pdf", "Approved fee circular 2026-27", "1"],
  ["document-mpd-b-1", "mpd-b-1", "affiliation-document", "affiliation-extension-2026.pdf", "Current affiliation extension", "b"],
];

function manifest(target = route, decision = "approved") {
  return {
    records: records.map(([recordId]) => ({
      id: recordId,
      kind: "document",
      publicTargets: ["/mandatory-public-disclosure", target],
      checkProfile: "public-document",
      decision,
      checks: {
        authenticity: decision === "approved" ? "verified" : "pending",
        metadata: decision === "approved" ? "verified" : "pending",
        "malware-scan": decision === "approved" ? "verified" : "pending",
        privacy: decision === "approved" ? "verified" : "pending",
        accessibility: decision === "approved" ? "verified" : "pending",
        "management-approval": decision === "approved" ? "verified" : "pending",
      },
      evidenceReferences: decision === "approved" ? [`DOCS/2026/${recordId.at(-1)}`] : [],
      approvedByRole: decision === "approved" ? "compliance-owner" : null,
      approvedAt: decision === "approved" ? "2026-09-02T08:00:00.000Z" : null,
      expiresAt: null,
    })),
  };
}

function registry(selected = records) {
  return {
    $schema: "./public-document-publication-bindings.schema.json",
    schemaVersion: 1,
    registryId: "sskem-public-document-publication-bindings",
    publicBasePath: "/documents/production",
    policy: {
      approvedManifestRequired: true,
      exactStagedReceiptHashRequired: true,
      exactPublicPdfHashRequired: true,
      externalMalwareEvidenceRequired: true,
      privateEvidenceStoredInRepository: false,
      notes: "Only exact approved PDF bindings can be projected into Programme pages.",
    },
    bindings: selected.map(([recordId, documentId, , publicFilename, label, seed], index) => {
      const sourceSha256 = seed.repeat(64).slice(0, 64);
      return {
        bindingId: `public-${recordId}-${sourceSha256.slice(0, 12)}`,
        recordId,
        documentId,
        publicFilename,
        sourceSha256,
        stagedReceiptSha256: String(index + 4).repeat(64).slice(0, 64),
        bytes: 153600 + index,
        pages: index + 2,
        accessibilityStatus: index === 0 ? "Tagged and accessible" : "Text-readable",
        publishedOn: "2026-09-02T09:00:00.000Z",
        metadata: {
          label,
          status: "current",
          academicYear: documentId.startsWith("mpd-c") ? "2026-2027" : null,
          publicationYear: "2026",
          issuingAuthority: documentId === "mpd-b-1" ? "Central Board of Secondary Education" : "SSKEMS authorised office",
          issueDate: "2026-08-01",
          expiryDate: documentId === "mpd-b-1" ? "2028-03-31" : null,
          language: "English",
          publicNote: "Approved public copy published through the guarded document workflow.",
        },
        notes: "Exact approved Programme document fixture.",
      };
    }),
  };
}

function references(selected = records) {
  return selected.map(([, documentId, kind]) => ({ id: `${kind}-primary`, kind, documentId }));
}

test("resolves timetable, fee and affiliation cards only from exact route-approved bindings", () => {
  const result = resolveApprovedProgrammeDocuments({ route, references: references(), registry: registry(), manifest: manifest(), now: NOW });

  assert.equal(result.ok, true);
  assert.equal(result.documents.length, 3);
  assert.deepEqual(result.documents.map(({ kind }) => kind), ["timetable", "fee-circular", "affiliation-document"]);
  assert.equal(result.documents[0].href, "/documents/production/document-mpd-c-2/academic-calendar-2026-27.pdf");
  assert.equal(result.documents[0].size, "150.0 KiB");
  assert.equal(result.documents[0].pages, 2);
  assert.ok(result.documents.every(isPipelineApprovedProgrammeDocument));
  assert.equal(isPipelineApprovedProgrammeDocument(structuredClone(result.documents[0])), false);
  assert.doesNotMatch(JSON.stringify(result), /(?:sha256|approvedBy|evidenceReference|sourcePointer|[A-Za-z]:\\)/i);
});

test("fails atomically when a binding is missing, unapproved or outside the Programme route scope", () => {
  const missing = resolveApprovedProgrammeDocuments({
    route,
    references: references(),
    registry: registry(records.slice(0, 2)),
    manifest: manifest(),
    now: NOW,
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.documents.length, 0);
  assert.ok(missing.issues.some(({ code }) => code === "APPROVED_BINDING_MISSING"));

  const outsideScope = resolveApprovedProgrammeDocuments({
    route,
    references: references(),
    registry: registry(),
    manifest: manifest("/documents"),
    now: NOW,
  });
  assert.equal(outsideScope.ok, false);
  assert.equal(outsideScope.documents.length, 0);
  assert.ok(outsideScope.issues.every(({ code }) => code === "ROUTE_NOT_APPROVED"));

  const unapproved = resolveApprovedProgrammeDocuments({
    route,
    references: references(),
    registry: registry(),
    manifest: manifest(route, "blocked"),
    now: NOW,
  });
  assert.equal(unapproved.ok, false);
  assert.equal(unapproved.documents.length, 0);
  assert.ok(unapproved.issues.some(({ code }) => code === "DOCUMENT_PIPELINE_INVALID"));
});

test("rejects duplicate, malformed and semantically incompatible references", () => {
  const incompatible = resolveApprovedProgrammeDocuments({
    route,
    references: [{ id: "school-brochure", kind: "brochure", documentId: "mpd-b-1" }],
    registry: registry(),
    manifest: manifest(),
    now: NOW,
  });
  assert.equal(incompatible.ok, false);
  assert.ok(incompatible.issues.some(({ code }) => code === "INCOMPATIBLE_DOCUMENT_KIND"));

  const duplicate = resolveApprovedProgrammeDocuments({
    route,
    references: [references()[0], { ...references()[0], id: "duplicate-reference" }],
    registry: registry(),
    manifest: manifest(),
    now: NOW,
  });
  assert.equal(duplicate.ok, false);
  assert.ok(duplicate.issues.some(({ code }) => code === "DUPLICATE_DOCUMENT_ID"));

  const malformed = resolveApprovedProgrammeDocuments({
    route,
    references: [{ id: "bad", kind: "timetable", documentId: "mpd-c-2", href: "https://example.com/file.pdf" }],
    registry: registry(),
    manifest: manifest(),
    now: NOW,
  });
  assert.equal(malformed.ok, false);
  assert.ok(malformed.issues.some(({ code }) => code === "INVALID_REFERENCE"));
});

test("ships four specialised document components behind the Programme gate and resolver provenance check", async () => {
  const [groups, components, shellData, stylesheet] = await Promise.all([
    readFile(new URL("../components/programmes/programme-document-groups.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/programmes/programme-components.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/programme-route-shells.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/programmes.css", import.meta.url), "utf8"),
  ]);

  for (const name of ["ProgrammeBrochures", "ProgrammeTimetables", "ProgrammeFeeCirculars", "ProgrammeAffiliationDocuments"]) {
    assert.match(groups, new RegExp(`export function ${name}\\(`), name);
    assert.match(components, new RegExp(`<${name}\\b`), name);
  }
  assert.match(groups, /isApprovedProgrammeRenderGate\(gate\)/);
  assert.match(groups, /isPipelineApprovedProgrammeDocument\(document\)/);
  assert.match(components, /documents\.some\(\(document\) => !isPipelineApprovedProgrammeDocument\(document\)\)/);
  assert.doesNotMatch(components, /document\.href.*hasSafePublicHref/s);
  assert.match(shellData, /brochure, timetable\/calendar, fee circular and affiliation records/);
  assert.match(stylesheet, /\.programme-document-card\[data-document-status="expiring-soon"\]/);
});

test("keeps brochure publication suppressed until the guarded pipeline has a canonical brochure record", () => {
  const result = resolveApprovedProgrammeDocuments({ route, references: [], now: NOW });
  assert.equal(result.ok, true);
  assert.deepEqual(result.documents, []);
  assert.throws(() => result.documents.push({}), TypeError);
});
