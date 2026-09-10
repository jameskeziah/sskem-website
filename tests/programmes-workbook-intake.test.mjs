import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { strToU8, zipSync } from "fflate";

import {
  PROGRAMMES_INTAKE_CONTRACT_ID,
  PROGRAMMES_INTAKE_CONTRACT_VERSION,
  PROGRAMMES_WORKBOOK_RECEIPT_ID,
  inspectProgrammesWorkbook,
  inspectProgrammesWorkbookForPrivateDraft,
  validateProgrammesWorkbookIntakeReceipt,
} from "../lib/programmes-workbook-intake.ts";
import {
  createProgrammePageRehearsal,
  programmeRehearsalSectionIds,
} from "../lib/programmes-page-rehearsal.ts";

const workbookSheetNames = [
  "README",
  "Management Programme Form",
  "Campuses",
  "Faculty",
  "Fees",
  "Results",
  "Scholarships",
  "Media & Evidence",
  "Publication Tracker",
  "Google Form Blueprint",
  "Programme - Foundation 6-10",
  "Programme - JEE-NEET 11-12",
  "Programme - AI-Data Science",
  "Completion Notes",
];

const programmeSheetNames = new Set([
  "Programme - Foundation 6-10",
  "Programme - JEE-NEET 11-12",
  "Programme - AI-Data Science",
]);

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cell(reference, value) {
  return `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function formulaCell(reference, formula, cachedValue) {
  return `<c r="${reference}" t="str"><f>${escapeXml(formula)}</f><v>${escapeXml(cachedValue)}</v></c>`;
}

function worksheet(rows) {
  const body = [...rows.entries()]
    .sort(([left], [right]) => left - right)
    .map(([row, cells]) => `<row r="${row}">${cells.join("")}</row>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function programmeRows({ privateCanary = false, previewValues = false, riskyPreviewValues = false, formulaPreviewValue = false } = {}) {
  const rows = new Map();
  for (let row = 6; row <= 146; row += 1) {
    const response = privateCanary && row === 6
      ? "Private Person person@example.test +91-9999999999 C:\\private\\evidence.pdf https://drive.example.test 60000"
      : "NOT CONFIRMED";
    const cells = [cell(`D${row}`, response)];
    if (row <= 75) cells.push(cell(`F${row}`, "Yes"));
    rows.set(row, cells);
  }
  if (previewValues) {
    const safeValues = new Map([
      [8, "2025-26"],
      [38, "Classes VI-X"],
      [39, "One academic year"],
      [40, "Admission after Class V"],
      [42, "In person"],
      [43, "English"],
      [44, "Mathematics; Science; English"],
      [47, "Promotional curriculum copy must remain hidden"],
      [62, "Completion of Class V"],
      [118, "Students seeking foundational learning"],
      [130, "2025-26"],
    ]);
    for (const [row, value] of safeValues) rows.set(row, [cell(`D${row}`, value), cell(`F${row}`, "Yes")]);
  }
  if (riskyPreviewValues) {
    const riskyValues = new Map([
      [8, "2025-26"],
      [38, "Mr. Private Person"],
      [39, "+91-9999999999"],
      [40, "C:\\private\\evidence.pdf"],
      [42, "https://drive.example.test/mode"],
      [43, "person@example.test"],
      [44, "Physics; ₹60000 fee"],
      [47, "CBSE affiliation claim"],
      [62, "Board recognition code 12345"],
      [118, "100% result guarantee"],
      [130, "2025-26"],
    ]);
    for (const [row, value] of riskyValues) rows.set(row, [cell(`D${row}`, value), cell(`F${row}`, "Yes")]);
  }
  if (formulaPreviewValue) {
    rows.set(39, [formulaCell("D39", "A1", "Private Person formula cache"), cell("F39", "Yes")]);
  }
  rows.set(142, [cell("D142", "No"), cell("F142", "Yes")]);
  rows.set(143, [cell("D143", "Incomplete—do not publish"), cell("F143", "Yes")]);
  rows.set(146, [cell("D146", "NOT APPLICABLE — pending management approval"), cell("F146", "Yes")]);
  return rows;
}

function tableRows(sheetName) {
  const rows = new Map();
  if (sheetName === "Campuses") rows.set(4, [cell("A4", "programme"), cell("H4", "+91-9999999999")]);
  if (sheetName === "Faculty") rows.set(4, [cell("A4", "programme"), cell("B4", "Private Person")]);
  if (sheetName === "Fees") rows.set(4, [cell("A4", "programme"), cell("E4", "60000")]);
  if (sheetName === "Results") rows.set(4, [cell("A4", "Private result canary"), cell("E4", "100%")]);
  if (sheetName === "Scholarships") rows.set(4, [cell("A4", "programme")]);
  if (sheetName === "Media & Evidence") rows.set(4, [cell("A4", "programme"), cell("D4", "https://drive.example.test/evidence")]);
  if (sheetName === "Publication Tracker") {
    rows.set(12, [cell("A12", "programme"), cell("H12", "Not Approved"), cell("N12", "Do not publish")]);
  }
  return rows;
}

function buildWorkbook({
  includeExternalLink = false,
  includeContractMarker = false,
  previewValues = false,
  riskyPreviewValues = false,
  formulaPreviewValue = false,
  omitSheetName,
} = {}) {
  const includedSheetNames = workbookSheetNames.filter((name) => name !== omitSheetName);
  const workbookSheets = includedSheetNames
    .map((name, index) => `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join("");
  const relationships = includedSheetNames
    .map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`)
    .join("");
  const files = {
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`),
  };
  includedSheetNames.forEach((name, index) => {
    let rows = programmeSheetNames.has(name)
      ? programmeRows({
        privateCanary: name === "Programme - Foundation 6-10",
        previewValues,
        riskyPreviewValues,
        formulaPreviewValue,
      })
      : tableRows(name);
    if (includeContractMarker && name === "README") rows = new Map([[1, [cell("A1", PROGRAMMES_INTAKE_CONTRACT_ID)]]]);
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(worksheet(rows));
  });
  if (includeExternalLink) files["xl/externalLinks/externalLink1.xml"] = strToU8("<externalLink/>");
  return zipSync(files);
}

test("records the supplied workbook audit as a blocked, code-only receipt", async () => {
  const data = JSON.parse(await readFile(new URL("../content/programmes-workbook-intake-receipt.json", import.meta.url), "utf8"));
  assert.equal(data.receiptId, PROGRAMMES_WORKBOOK_RECEIPT_ID);
  assert.equal(data.status, "blocked");
  assert.equal(data.sourceFingerprint.value, "fcd33d68e4b67d577817a3d101d5b46b8f0cb5125a36edb57ee809802f99dac0");
  assert.deepEqual(data.structure, {
    worksheetCount: 14,
    requiredWorksheetCount: 14,
    matchedRequiredWorksheetCount: 14,
    formulaCellCount: 4,
    externalLinkPartCount: 0,
    macroPartCount: 0,
    embeddedObjectPartCount: 0,
  });
  assert.equal(data.contractBinding.matchedWorksheetCount, 5);
  assert.equal(data.contractBinding.schemaVersion, 1);
  assert.equal(data.contractBinding.expectedWorksheetCount, 9);
  assert.equal(data.contractBinding.exactStructureMatch, false);
  assert.equal(data.totals.notConfirmedResponses, 263);
  assert.equal(data.totals.unresolvedCriticalResponses, 119);
  assert.equal(data.totals.managementConfirmedForms, 0);
  assert.equal(data.totals.approvedForPublicationForms, 0);
  assert.equal(data.outcomes.publicationAuthorized, false);
  assert.equal(data.guardrails.malwareScanPerformed, false);
  assert.deepEqual(validateProgrammesWorkbookIntakeReceipt(data), []);
});

test("inspects XLSX bytes without returning private cell values or source identity", async () => {
  const bytes = buildWorkbook();
  const receipt = await inspectProgrammesWorkbook({ bytes, generatedOn: "2026-09-07" });
  const serialized = JSON.stringify(receipt);
  assert.equal(receipt.status, "blocked");
  assert.equal(receipt.contractBinding.schemaVersion, PROGRAMMES_INTAKE_CONTRACT_VERSION);
  assert.equal(receipt.contractBinding.expectedWorksheetCount, 17);
  assert.equal(receipt.structure.matchedRequiredWorksheetCount, 14);
  assert.equal(receipt.totals.managementConfirmedForms, 0);
  assert.equal(receipt.privacy.potentialPersonRecordsPresent, true);
  assert.equal(receipt.guardrails.serverPersistencePerformed, false);
  assert.equal(receipt.outcomes.sanitizedProjectionReady, false);
  for (const canary of [
    "Private Person",
    "person@example.test",
    "+91-9999999999",
    "C:\\private\\evidence.pdf",
    "https://drive.example.test",
    "60000",
  ]) {
    assert.equal(serialized.includes(canary), false, `receipt leaked ${canary}`);
  }
});

test("creates only an ephemeral, screened private draft while publication remains blocked", async () => {
  const inspection = await inspectProgrammesWorkbookForPrivateDraft({
    bytes: buildWorkbook({ previewValues: true }),
    generatedOn: "2026-09-07",
  });
  assert.equal(inspection.receipt.status, "blocked");
  assert.equal(inspection.receipt.outcomes.sanitizedProjectionReady, false);
  assert.equal(inspection.receipt.outcomes.publicationAuthorized, false);
  assert.equal(inspection.drafts.length, 3);
  for (const draft of inspection.drafts) {
    assert.deepEqual(Object.keys(draft).sort(), [
      "availableFactCount",
      "facts",
      "notConfirmedResponses",
      "publicationAuthorized",
      "recordId",
      "state",
      "title",
      "unresolvedCriticalResponses",
      "withheldCategories",
      "withheldOrUnresolvedFactCount",
    ]);
    assert.deepEqual(Object.keys(draft.facts), [
      "academicYear",
      "studentLevels",
      "duration",
      "entryPoint",
      "deliveryMode",
      "medium",
      "subjects",
      "curriculum",
      "eligibility",
      "intendedAudience",
    ]);
    assert.equal(draft.state, "provisional-private-draft");
    assert.equal(draft.publicationAuthorized, false);
    assert.equal(draft.facts.academicYear, "2025-26");
    assert.equal(draft.facts.studentLevels, "Classes VI-X");
    assert.equal(draft.facts.duration, "One academic year");
    assert.deepEqual(draft.facts.subjects, ["Mathematics", "Science", "English"]);
    assert.equal(draft.facts.curriculum, null);
    assert.ok(draft.facts.subjects.length <= 8);
    assert.ok(draft.facts.subjects.every((value) => value.length <= 80));
  }
  const serialized = JSON.stringify(inspection.drafts);
  assert.equal(serialized.includes("Private Person person@example.test"), false);
  assert.equal(serialized.includes("Promotional curriculum copy must remain hidden"), false);
  assert.equal(JSON.stringify(inspection.receipt).includes("Classes VI-X"), false);
});

test("maps screened drafts into ten blocked rehearsal sections without forging publication readiness", async () => {
  const inspection = await inspectProgrammesWorkbookForPrivateDraft({
    bytes: buildWorkbook({ previewValues: true }),
    generatedOn: "2026-09-07",
  });
  const rehearsal = createProgrammePageRehearsal(inspection.drafts[0]);
  assert.equal(rehearsal.state, "temporary-private-rehearsal");
  assert.equal(rehearsal.publicationAuthorized, false);
  assert.equal(rehearsal.publicationReadySectionCount, 0);
  assert.equal(rehearsal.coveredSectionCount, 4);
  assert.equal(rehearsal.totalSectionCount, 10);
  assert.deepEqual(rehearsal.sections.map((section) => section.id), programmeRehearsalSectionIds);
  assert.equal(new Set(rehearsal.sections.map((section) => section.id)).size, 10);
  for (const section of rehearsal.sections) {
    assert.match(section.number, /^\d{2}$/);
    assert.ok(section.missing.length > 0);
    assert.equal(section.publicationState, "blocked");
  }
  for (const lockedId of ["fees", "faculty", "facilities", "results", "documents", "admissions-cta"]) {
    const locked = rehearsal.sections.find((section) => section.id === lockedId);
    assert.equal(locked.state, "locked");
    assert.deepEqual(locked.facts, []);
  }
  const serialized = JSON.stringify(rehearsal);
  assert.equal(serialized.includes("Promotional curriculum copy must remain hidden"), false);
  assert.equal(serialized.includes("Private Person person@example.test"), false);

  assert.throws(
    () => createProgrammePageRehearsal({ ...inspection.drafts[0], state: "approved" }),
    /non-authorizing provisional workbook draft/,
  );
  assert.throws(
    () => createProgrammePageRehearsal({ ...inspection.drafts[0], publicationAuthorized: true }),
    /non-authorizing provisional workbook draft/,
  );
});

test("withholds sensitive, mixed and formula-backed values from the temporary draft", async () => {
  const risky = await inspectProgrammesWorkbookForPrivateDraft({
    bytes: buildWorkbook({ riskyPreviewValues: true }),
    generatedOn: "2026-09-07",
  });
  const riskySerialized = JSON.stringify(risky.drafts);
  for (const canary of [
    "Private Person",
    "person@example.test",
    "+91-9999999999",
    "C:\\private\\evidence.pdf",
    "https://drive.example.test",
    "60000",
    "Private result canary",
    "CBSE affiliation claim",
    "Board recognition code 12345",
    "100% result guarantee",
    "Physics",
  ]) {
    assert.equal(riskySerialized.includes(canary), false, `private draft leaked ${canary}`);
  }
  assert.deepEqual(risky.drafts[0].facts.subjects, []);

  const formula = await inspectProgrammesWorkbookForPrivateDraft({
    bytes: buildWorkbook({ previewValues: true, formulaPreviewValue: true }),
    generatedOn: "2026-09-07",
  });
  assert.equal(formula.drafts[0].facts.duration, null);
  assert.equal(JSON.stringify(formula.drafts).includes("Private Person formula cache"), false);
});

test("refuses temporary drafts for incomplete or unsupported workbook packages", async () => {
  await assert.rejects(
    () => inspectProgrammesWorkbookForPrivateDraft({ bytes: buildWorkbook({ omitSheetName: "Faculty" }) }),
    /complete recognized workbook structure/,
  );
  await assert.rejects(
    () => inspectProgrammesWorkbookForPrivateDraft({ bytes: buildWorkbook({ includeExternalLink: true }) }),
    /unsupported package parts/,
  );
});

test("binds receipts deterministically and fails closed on unsupported package parts", async () => {
  const bytes = buildWorkbook({ includeExternalLink: true, includeContractMarker: true });
  const first = await inspectProgrammesWorkbook({ bytes, generatedOn: "2026-09-07" });
  const second = await inspectProgrammesWorkbook({ bytes, generatedOn: "2026-09-07" });
  assert.deepEqual(first, second);
  assert.equal(first.sourceFingerprint.value.length, 64);
  assert.equal(first.contractBinding.sourceMarkerPresent, true);
  assert.equal(first.issueCodes.includes("unsupported-package-parts"), true);
  assert.equal(first.structure.externalLinkPartCount, 1);
  assert.equal(first.status, "blocked");
});

test("rejects malformed, oversized and structurally incomplete inputs", async () => {
  await assert.rejects(() => inspectProgrammesWorkbook({ bytes: strToU8("not an xlsx") }), /not an XLSX ZIP package/);
  await assert.rejects(
    () => inspectProgrammesWorkbook({ bytes: new Uint8Array(10 * 1024 * 1024 + 1) }),
    /no larger than 10 MB/,
  );
  const incomplete = zipSync({ "xl/workbook.xml": strToU8("<workbook/>") });
  await assert.rejects(() => inspectProgrammesWorkbook({ bytes: incomplete }), /missing its workbook definition/);
});

test("receipt validation rejects unknown properties and changed non-authorizing controls", async () => {
  const receipt = await inspectProgrammesWorkbook({ bytes: buildWorkbook(), generatedOn: "2026-09-07" });
  assert.deepEqual(validateProgrammesWorkbookIntakeReceipt(receipt), []);
  assert.match(validateProgrammesWorkbookIntakeReceipt({ ...receipt, rawWorkbook: "secret" }).join(" "), /unknown property/i);
  assert.match(validateProgrammesWorkbookIntakeReceipt({ ...receipt, drafts: [{ unsafe: true }] }).join(" "), /unknown property/i);
  assert.match(validateProgrammesWorkbookIntakeReceipt({
    ...receipt,
    outcomes: { ...receipt.outcomes, publicationAuthorized: true },
  }).join(" "), /outcomes are invalid/i);
  assert.match(validateProgrammesWorkbookIntakeReceipt({
    ...receipt,
    guardrails: { ...receipt.guardrails, cmsWritePerformed: true },
  }).join(" "), /guardrails must remain false/i);
  assert.match(validateProgrammesWorkbookIntakeReceipt({
    ...receipt,
    contractBinding: { ...receipt.contractBinding, schemaVersion: 1 },
  }).join(" "), /contract binding is invalid/i);
});

test("ships an authenticated browser-memory-only workspace with no upload, persistence or public path", async () => {
  const [
    page,
    form,
    rehearsalComponent,
    rehearsalModel,
    workspaceStyles,
    dashboard,
    contentPackagePage,
    sitemap,
    guide,
    cli,
    intakeContractText,
    ...publicSurface
  ] = await Promise.all([
    readFile(new URL("../app/publication-review/programmes-workbook-intake/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/programmes-workbook-intake/programmes-workbook-intake-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/programmes-workbook-intake/programme-page-rehearsal.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/programmes-page-rehearsal.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/programmes-workbook-intake/workspace.css", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/programmes-content-package/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/programmes-workbook-intake.md", import.meta.url), "utf8"),
    readFile(new URL("../scripts/audit-programmes-workbook-intake.mjs", import.meta.url), "utf8"),
    readFile(new URL("../content/programmes-intake-system.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/navigation.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/site-header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/site-footer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[...slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/school/academics/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/junior-college/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/programmes/jee-neet/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/programmes-workbook-intake"\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(form, /file\.arrayBuffer\(\)/);
  assert.match(form, /URL\.revokeObjectURL/);
  assert.match(form, /Temporary private draft/);
  assert.match(form, /Not verified\. Not approved\. Not publishable\./);
  assert.match(form, /Clear temporary preview/);
  assert.match(form, /setDrafts\(\[\]\)/);
  assert.match(form, /Local workbook inspection and page rehearsal require JavaScript/);
  assert.doesNotMatch(form, /\bfetch\s*\(|\bFormData\b|\bXMLHttpRequest\b|sendBeacon|WebSocket|EventSource/);
  assert.doesNotMatch(form, /localStorage|sessionStorage|indexedDB|\bcaches\b|document\.cookie|serviceWorker|\baction=|"use server"/);
  assert.doesNotMatch(form, /dangerouslySetInnerHTML|href=\{draft|src=\{draft/);
  assert.match(form, /<ProgrammePageRehearsal drafts=\{drafts\}/);
  assert.match(rehearsalComponent, /Choose a temporary source record/);
  assert.match(rehearsalComponent, /aria-pressed=/);
  assert.match(rehearsalComponent, /Screened section coverage/);
  assert.match(rehearsalComponent, /Publication readiness/);
  assert.match(rehearsalComponent, /data-publication-authorized="false"/);
  assert.match(rehearsalComponent, /data-publication-state=\{section\.publicationState\}/);
  assert.match(rehearsalComponent, /data-review-scope="browser-memory"/);
  assert.match(rehearsalComponent, /Admissions action locked/);
  assert.match(rehearsalComponent, /window\.print\(\)/);
  assert.doesNotMatch(rehearsalComponent, /programme-components|programmes-render-gate|programmes-data-adapter|ApprovedProgrammeRenderGate/);
  assert.doesNotMatch(rehearsalComponent, /\bfetch\s*\(|\bFormData\b|\bXMLHttpRequest\b|sendBeacon|WebSocket|EventSource/);
  assert.doesNotMatch(rehearsalComponent, /localStorage|sessionStorage|indexedDB|\bcaches\b|document\.cookie|serviceWorker|"use server"/);
  assert.doesNotMatch(rehearsalComponent, /dangerouslySetInnerHTML|\bhref=|\bsrc=/);
  for (const id of programmeRehearsalSectionIds) assert.match(rehearsalModel, new RegExp(`"${id}"`));
  assert.match(workspaceStyles, /@media print/);
  assert.match(workspaceStyles, /\.programme-rehearsal__print/);
  assert.match(workspaceStyles, /@media \(forced-colors: active\)/);
  assert.match(dashboard, /Review Programmes workbook/);
  assert.match(contentPackagePage, /Review workbook preflight/);
  assert.doesNotMatch(sitemap, /programmes-workbook-intake/);
  assert.match(guide, /does not approve a claim/i);
  assert.match(guide, /disappears on reset or refresh/i);
  assert.match(guide, /never enters the receipt download/i);
  assert.doesNotMatch(cli, /writeFile|appendFile|rename\(/);
  const intakeContract = JSON.parse(intakeContractText);
  assert.equal(intakeContract.authoritativeBoundaries.programmesWorkbookIntakeWorkspace, "/publication-review/programmes-workbook-intake");
  assert.equal(intakeContract.authoritativeBoundaries.programmesWorkbookIntakeReceipt, "content/programmes-workbook-intake-receipt.json");
  for (const source of publicSurface) {
    assert.doesNotMatch(source, /programmes-workbook-intake|ProgrammePageRehearsal|createProgrammePageRehearsal/);
  }
});
