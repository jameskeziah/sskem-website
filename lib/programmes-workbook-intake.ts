import { strFromU8, unzipSync } from "fflate";

export const PROGRAMMES_WORKBOOK_RECEIPT_ID = "sskem-programmes-workbook-intake-receipt";
export const PROGRAMMES_WORKBOOK_RECEIPT_VERSION = 1;
export const PROGRAMMES_WORKBOOK_MAX_BYTES = 10 * 1024 * 1024;
export const PROGRAMMES_INTAKE_CONTRACT_ID = "sskem-programmes-intake-system";
export const PROGRAMMES_INTAKE_CONTRACT_VERSION = 2;

const MAX_ENTRY_BYTES = 8 * 1024 * 1024;
const MAX_SELECTED_UNCOMPRESSED_BYTES = 32 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 512;

const requiredSheetNames = [
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
] as const;

const programmeSheets = [
  {
    recordId: "programme-record-01",
    sheetName: "Programme - Foundation 6-10",
    privateDraftTitle: "Foundation Programme (Classes VI-X)",
  },
  {
    recordId: "programme-record-02",
    sheetName: "Programme - JEE-NEET 11-12",
    privateDraftTitle: "JEE / NEET Programme (Classes XI-XII)",
  },
  {
    recordId: "programme-record-03",
    sheetName: "Programme - AI-Data Science",
    privateDraftTitle: "AI & Data Science Programme",
  },
] as const;

const canonicalIntakeSheetNames = [
  "Programmes",
  "Organisations",
  "Programme Governance",
  "Faculty",
  "Fees",
  "Results",
  "Scholarships",
  "Campus",
  "Programme Documents",
  "Admissions Actions",
  "Organisation Relationships",
  "Board & Status",
  "Institution Identifiers",
  "Campus Availability",
  "Media & Evidence",
  "Publication Tracker",
  "Lists",
] as const;

export const programmesWorkbookIssueCodes = [
  "invalid-workbook-structure",
  "contract-marker-missing",
  "canonical-contract-structure-mismatch",
  "unsupported-package-parts",
  "unresolved-responses",
  "unresolved-critical-responses",
  "management-confirmation-missing",
  "publication-decision-missing",
  "tracker-approval-missing",
  "tracker-publication-readiness-missing",
  "approved-evidence-missing",
  "result-claims-suppressed",
  "canonical-model-reconciliation-required",
  "potential-private-data-detected",
] as const;

export type ProgrammesWorkbookIssueCode = (typeof programmesWorkbookIssueCodes)[number];
export type ProgrammesWorkbookStatus = "blocked" | "ready-for-controlled-reconciliation";

export type ProgrammesWorkbookRecordAudit = {
  recordId: (typeof programmeSheets)[number]["recordId"];
  responseFields: number;
  notConfirmedResponses: number;
  criticalFields: number;
  unresolvedCriticalResponses: number;
  managementConfirmed: boolean;
  approvedForPublication: boolean;
};

export type ProgrammesWorkbookIntakeReceipt = {
  $schema?: "./programmes-workbook-intake-receipt.schema.json";
  schemaVersion: 1;
  receiptId: typeof PROGRAMMES_WORKBOOK_RECEIPT_ID;
  generatedOn: string;
  sourceFingerprint: {
    algorithm: "sha256";
    value: string;
    byteLength: number;
  };
  status: ProgrammesWorkbookStatus;
  structure: {
    worksheetCount: number;
    requiredWorksheetCount: number;
    matchedRequiredWorksheetCount: number;
    formulaCellCount: number;
    externalLinkPartCount: number;
    macroPartCount: number;
    embeddedObjectPartCount: number;
  };
  contractBinding: {
    intakeId: typeof PROGRAMMES_INTAKE_CONTRACT_ID;
    schemaVersion: 1 | typeof PROGRAMMES_INTAKE_CONTRACT_VERSION;
    sourceMarkerPresent: boolean;
    expectedWorksheetCount: number;
    matchedWorksheetCount: number;
    exactStructureMatch: boolean;
  };
  totals: {
    programmeForms: number;
    responseFields: number;
    notConfirmedResponses: number;
    criticalFields: number;
    unresolvedCriticalResponses: number;
    managementConfirmedForms: number;
    approvedForPublicationForms: number;
    trackerApprovedRows: number;
    trackerPublicationReadyRows: number;
    approvedEvidenceRows: number;
  };
  records: ProgrammesWorkbookRecordAudit[];
  repeatingRows: {
    campus: number;
    faculty: number;
    fees: number;
    results: number;
    scholarships: number;
    mediaAndEvidence: number;
    publicationTracker: number;
  };
  compatibility: {
    canonicalProgrammePathwaysRequired: 3;
    canonicalProgrammePathwaysDirectlyMapped: number;
    automaticContentPackageCreationSupported: false;
    manualInstitutionalModelDecisionRequired: true;
  };
  issueCodes: ProgrammesWorkbookIssueCode[];
  outcomes: {
    auditReceiptReady: true;
    sanitizedProjectionReady: false;
    publicationAuthorized: false;
  };
  privacy: {
    potentialPersonRecordsPresent: boolean;
    potentialContactFieldsPresent: boolean;
    internalFeeRowsPresent: boolean;
    evidenceRegisterRowsPresent: boolean;
    rawWorkbookContentReturned: false;
    sourceFilenameReturned: false;
    sourcePathReturned: false;
  };
  guardrails: {
    networkRequestPerformed: false;
    serverPersistencePerformed: false;
    repositoryWritePerformed: false;
    managementApprovalGranted: false;
    contentPackageCreated: false;
    approvalManifestUpdated: false;
    cmsWritePerformed: false;
    publicContentPublished: false;
    navigationActivated: false;
    deploymentPerformed: false;
    malwareScanPerformed: false;
  };
};

export type ProgrammesWorkbookPrivateDraft = {
  recordId: (typeof programmeSheets)[number]["recordId"];
  title: (typeof programmeSheets)[number]["privateDraftTitle"];
  state: "provisional-private-draft";
  publicationAuthorized: false;
  facts: {
    academicYear: string | null;
    studentLevels: string | null;
    duration: string | null;
    entryPoint: string | null;
    deliveryMode: string | null;
    medium: string | null;
    subjects: string[];
    curriculum: string | null;
    eligibility: string | null;
    intendedAudience: string | null;
  };
  availableFactCount: number;
  withheldOrUnresolvedFactCount: number;
  notConfirmedResponses: number;
  unresolvedCriticalResponses: number;
  withheldCategories: string[];
};

export type ProgrammesWorkbookPrivateDraftInspection = {
  receipt: ProgrammesWorkbookIntakeReceipt;
  drafts: ProgrammesWorkbookPrivateDraft[];
};

type SheetSnapshot = {
  cells: ReadonlyMap<string, string>;
  formulaCells: ReadonlySet<string>;
  formulaCellCount: number;
};

type WorkbookSnapshot = {
  sheetNames: string[];
  sheets: ReadonlyMap<string, SheetSnapshot>;
  formulaCellCount: number;
  externalLinkPartCount: number;
  macroPartCount: number;
  embeddedObjectPartCount: number;
};

function decodeXml(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|apos|gt|lt|quot);/gi, (match, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return named[entity.toLowerCase()] ?? match;
  });
}

function attribute(source: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`(?:^|\\s)${escapedName}=(?:"([^"]*)"|'([^']*)')`, "i"));
  return match ? decodeXml(match[1] ?? match[2] ?? "") : "";
}

function textNodes(source: string) {
  return [...source.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)]
    .map((match) => decodeXml(match[1]))
    .join("");
}

function normalizeWorksheetTarget(target: string) {
  const normalized = target.replaceAll("\\", "/").replace(/^\//, "");
  const withRoot = normalized.startsWith("xl/") ? normalized : `xl/${normalized}`;
  if (!/^xl\/worksheets\/[A-Za-z0-9._-]+\.xml$/.test(withRoot) || withRoot.includes("..")) {
    throw new Error("Workbook contains an invalid worksheet relationship.");
  }
  return withRoot;
}

function parseSharedStrings(xml: string | undefined) {
  if (!xml) return [];
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)].map((match) => {
    const withoutPhonetics = match[1].replace(/<rPh\b[^>]*>[\s\S]*?<\/rPh>/gi, "");
    return textNodes(withoutPhonetics);
  });
}

function parseWorksheet(xml: string, sharedStrings: readonly string[]): SheetSnapshot {
  const cells = new Map<string, string>();
  const formulaCells = new Set<string>();
  let formulaCellCount = 0;
  for (const match of xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)) {
    const reference = attribute(match[1], "r").toUpperCase();
    if (!/^[A-Z]{1,3}[1-9]\d{0,5}$/.test(reference)) continue;
    const type = attribute(match[1], "t");
    const body = match[2];
    if (/<f(?:\s|>)/i.test(body)) {
      formulaCellCount += 1;
      formulaCells.add(reference);
    }
    const rawValue = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i)?.[1];
    let value = "";
    if (type === "s" && rawValue !== undefined) {
      const index = Number.parseInt(rawValue, 10);
      value = Number.isInteger(index) ? sharedStrings[index] ?? "" : "";
    } else if (type === "inlineStr") {
      value = textNodes(body);
    } else if (rawValue !== undefined) {
      value = decodeXml(rawValue);
    }
    if (value !== "") cells.set(reference, value);
  }
  return { cells, formulaCells, formulaCellCount };
}

function parseWorkbook(bytes: Uint8Array): WorkbookSnapshot {
  if (bytes.byteLength === 0 || bytes.byteLength > PROGRAMMES_WORKBOOK_MAX_BYTES) {
    throw new Error("Choose an XLSX workbook no larger than 10 MB.");
  }
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("The selected file is not an XLSX ZIP package.");

  let archiveEntryCount = 0;
  let selectedUncompressedBytes = 0;
  let oversizedSelectedEntry = false;
  let selectedTotalExceeded = false;
  let externalLinkPartCount = 0;
  let macroPartCount = 0;
  let embeddedObjectPartCount = 0;

  const files = unzipSync(bytes, {
    filter(file) {
      archiveEntryCount += 1;
      const name = file.name.replaceAll("\\", "/");
      if (/^xl\/externalLinks\//i.test(name)) externalLinkPartCount += 1;
      if (/vbaProject|macrosheets?/i.test(name)) macroPartCount += 1;
      if (/^xl\/(?:embeddings|oleObjects)\//i.test(name)) embeddedObjectPartCount += 1;
      const selected = name === "xl/workbook.xml"
        || name === "xl/_rels/workbook.xml.rels"
        || name === "xl/sharedStrings.xml"
        || /^xl\/worksheets\/[A-Za-z0-9._-]+\.xml$/i.test(name);
      if (!selected) return false;
      if (file.originalSize > MAX_ENTRY_BYTES) {
        oversizedSelectedEntry = true;
        return false;
      }
      selectedUncompressedBytes += file.originalSize;
      if (selectedUncompressedBytes > MAX_SELECTED_UNCOMPRESSED_BYTES) {
        selectedTotalExceeded = true;
        return false;
      }
      return true;
    },
  });

  if (archiveEntryCount > MAX_ARCHIVE_ENTRIES || oversizedSelectedEntry || selectedTotalExceeded) {
    throw new Error("Workbook package limits were exceeded.");
  }

  const workbookXml = files["xl/workbook.xml"] ? strFromU8(files["xl/workbook.xml"]) : "";
  const relationshipsXml = files["xl/_rels/workbook.xml.rels"]
    ? strFromU8(files["xl/_rels/workbook.xml.rels"])
    : "";
  if (!workbookXml || !relationshipsXml) throw new Error("Workbook package is missing its workbook definition.");

  const relationshipTargets = new Map<string, string>();
  for (const match of relationshipsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/gi)) {
    const id = attribute(match[1], "Id");
    const type = attribute(match[1], "Type");
    const target = attribute(match[1], "Target");
    if (id && /\/worksheet$/i.test(type)) relationshipTargets.set(id, normalizeWorksheetTarget(target));
  }

  const sheets = new Map<string, SheetSnapshot>();
  const sheetNames: string[] = [];
  const sharedStrings = parseSharedStrings(
    files["xl/sharedStrings.xml"] ? strFromU8(files["xl/sharedStrings.xml"]) : undefined,
  );
  let formulaCellCount = 0;
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?\s*>/gi)) {
    const name = attribute(match[1], "name");
    const relationshipId = attribute(match[1], "r:id");
    if (!name || !relationshipId || sheets.has(name)) throw new Error("Workbook sheet definitions are invalid.");
    const target = relationshipTargets.get(relationshipId);
    const worksheetBytes = target ? files[target] : undefined;
    if (!target || !worksheetBytes) throw new Error("Workbook is missing a referenced worksheet.");
    const snapshot = parseWorksheet(strFromU8(worksheetBytes), sharedStrings);
    sheetNames.push(name);
    sheets.set(name, snapshot);
    formulaCellCount += snapshot.formulaCellCount;
  }

  return {
    sheetNames,
    sheets,
    formulaCellCount,
    externalLinkPartCount,
    macroPartCount,
    embeddedObjectPartCount,
  };
}

function cell(sheet: SheetSnapshot | undefined, reference: string) {
  return sheet?.cells.get(reference) ?? "";
}

function columnCount(sheet: SheetSnapshot | undefined, column: string, firstRow: number, lastRow: number) {
  let count = 0;
  for (let row = firstRow; row <= lastRow; row += 1) {
    if (cell(sheet, `${column}${row}`).trim()) count += 1;
  }
  return count;
}

function isNotConfirmed(value: string) {
  return /\bNOT CONFIRMED\b/i.test(value);
}

function isUnresolvedCritical(value: string) {
  return !value.trim() || /\bNOT (?:CONFIRMED|PROVIDED)\b/i.test(value);
}

const privateDraftFactCount = 10;
const privateDraftWithheldCategories = [
  "institutional ownership, board and affiliation claims",
  "faculty identities, qualifications and contacts",
  "fees, scholarships and payment details",
  "results, ranks, scores and performance claims",
  "campus addresses and direct contact details",
  "evidence, consent and approval records",
] as const;

const privateDraftRiskPatterns = [
  /(?:https?:\/\/|www\.)/i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\+?\d[\d\s().-]{7,}\d/,
  /(?:[A-Za-z]:\\|\\\\|\/(?:Users|home|var|tmp)\/)/,
  /(?:₹|\$|€|£|\b(?:INR|Rs\.?|rupees?|lakh|crore)\b)/i,
  /\b\d{4,}\b/,
  /\bNOT\s+(?:CONFIRMED|PROVIDED|APPLICABLE)\b/i,
  /\b(?:TBD|TBC|pending|confidential|internal)\b/i,
  /\bDO\s+NOT\s+PUBLISH\b/i,
  /\b(?:fees?|tuition|charges?|amounts?|results?|scores?|ranks?|percent(?:age|ile)?|marks?|toppers?)\b/i,
  /\b(?:affiliation|recognition|boards?|codes?|faculty|teachers?|staff|contacts?|phones?|emails?|addresses?|campus)\b/i,
  /\b(?:evidence|documents?|approv(?:al|ed)|consent|operator|partners?|wings?|integrated|institutes?|schools?|colleges?)\b/i,
  /\b(?:best|leading|guarantee(?:d)?|no\.?\s*1|number\s*one|100\s*%)\b/i,
  /\b(?:Mr|Mrs|Ms|Miss|Dr|Prof|Principal|Director)\.?\b/i,
  /\b(?:ProTrack|Miraku|SSKEMS)\b/i,
  /(?:javascript|data):/i,
  /<[^>]+>|\[[^\]]+\]\([^)]+\)/,
] as const;

function normalizedPrivateDraftText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function privateDraftText(value: string, maxLength = 240) {
  const normalized = normalizedPrivateDraftText(value);
  if (!normalized
    || normalized.length > maxLength
    || privateDraftRiskPatterns.some((pattern) => pattern.test(normalized))) return null;
  return normalized;
}

function privateDraftAcademicYear(value: string) {
  const normalized = normalizedPrivateDraftText(value);
  const match = normalized.match(/^(20\d{2})\s*[-–—/]\s*(?:(20\d{2})|(\d{2}))$/);
  if (!match) return null;
  const firstYear = Number.parseInt(match[1], 10);
  const secondYear = Number.parseInt(match[2] ?? `${match[1].slice(0, 2)}${match[3]}`, 10);
  return secondYear === firstYear + 1 ? normalized.slice(0, 16) : null;
}

function privateDraftList(value: string) {
  const normalized = normalizedPrivateDraftText(value);
  if (!normalized || privateDraftRiskPatterns.some((pattern) => pattern.test(normalized))) return [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const candidate of normalized.split(/[;•|]+/)) {
    const safe = privateDraftText(candidate, 80);
    if (!safe) return [];
    if (seen.has(safe.toLowerCase())) continue;
    seen.add(safe.toLowerCase());
    items.push(safe);
    if (items.length === 8) break;
  }
  return items;
}

function privateDraftEnum(value: string, allowed: ReadonlyMap<string, string>) {
  const normalized = normalizedPrivateDraftText(value);
  if (privateDraftRiskPatterns.some((pattern) => pattern.test(normalized))) return null;
  return allowed.get(normalized.toLowerCase()) ?? null;
}

function privateDraftCell(sheet: SheetSnapshot | undefined, reference: string) {
  return sheet?.formulaCells.has(reference.toUpperCase()) ? "" : cell(sheet, reference);
}

function programmeRecord(snapshot: WorkbookSnapshot, descriptor: (typeof programmeSheets)[number]): ProgrammesWorkbookRecordAudit {
  const sheet = snapshot.sheets.get(descriptor.sheetName);
  let responseFields = 0;
  let notConfirmedResponses = 0;
  let criticalFields = 0;
  let unresolvedCriticalResponses = 0;
  for (let row = 6; row <= 146; row += 1) {
    const response = cell(sheet, `D${row}`);
    if (response.trim()) responseFields += 1;
    if (isNotConfirmed(response)) notConfirmedResponses += 1;
    if (/^yes$/i.test(cell(sheet, `F${row}`).trim())) {
      criticalFields += 1;
      if (isUnresolvedCritical(response)) unresolvedCriticalResponses += 1;
    }
  }
  return {
    recordId: descriptor.recordId,
    responseFields,
    notConfirmedResponses,
    criticalFields,
    unresolvedCriticalResponses,
    managementConfirmed: /^yes$/i.test(cell(sheet, "D142").trim()),
    approvedForPublication: /^approved for publication$/i.test(cell(sheet, "D143").trim()),
  };
}

function privateDraftRecord(
  snapshot: WorkbookSnapshot,
  descriptor: (typeof programmeSheets)[number],
  audit: ProgrammesWorkbookRecordAudit,
): ProgrammesWorkbookPrivateDraft {
  const sheet = snapshot.sheets.get(descriptor.sheetName);
  const primaryAcademicYear = privateDraftAcademicYear(privateDraftCell(sheet, "D8"));
  const controlAcademicYear = privateDraftAcademicYear(privateDraftCell(sheet, "D130"));
  const facts: ProgrammesWorkbookPrivateDraft["facts"] = {
    academicYear: primaryAcademicYear && primaryAcademicYear === controlAcademicYear ? primaryAcademicYear : null,
    studentLevels: privateDraftText(privateDraftCell(sheet, "D38")),
    duration: privateDraftText(privateDraftCell(sheet, "D39")),
    entryPoint: privateDraftText(privateDraftCell(sheet, "D40")),
    deliveryMode: privateDraftEnum(privateDraftCell(sheet, "D42"), new Map([
      ["in person", "In person"],
      ["in-person", "In person"],
      ["offline", "In person"],
      ["online", "Online"],
      ["hybrid", "Hybrid"],
      ["blended", "Blended"],
    ])),
    medium: privateDraftEnum(privateDraftCell(sheet, "D43"), new Map([
      ["english", "English"],
      ["marathi", "Marathi"],
      ["hindi", "Hindi"],
      ["bilingual", "Bilingual"],
      ["multilingual", "Multilingual"],
    ])),
    subjects: privateDraftList(privateDraftCell(sheet, "D44")),
    curriculum: null,
    eligibility: privateDraftText(privateDraftCell(sheet, "D62")),
    intendedAudience: privateDraftText(privateDraftCell(sheet, "D118")),
  };
  const availableFactCount = Object.entries(facts).filter(([, value]) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  ).length;
  return {
    recordId: descriptor.recordId,
    title: descriptor.privateDraftTitle,
    state: "provisional-private-draft",
    publicationAuthorized: false,
    facts,
    availableFactCount,
    withheldOrUnresolvedFactCount: privateDraftFactCount - availableFactCount,
    notConfirmedResponses: audit.notConfirmedResponses,
    unresolvedCriticalResponses: audit.unresolvedCriticalResponses,
    withheldCategories: [...privateDraftWithheldCategories],
  };
}

function hexDigest(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function validGeneratedOn(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

async function createProgrammesWorkbookIntakeReceipt(
  snapshot: WorkbookSnapshot,
  bytes: Uint8Array,
  generatedOn: string,
): Promise<ProgrammesWorkbookIntakeReceipt> {
  const records = programmeSheets.map((descriptor) => programmeRecord(snapshot, descriptor));
  const requiredMatches = requiredSheetNames.filter((name) => snapshot.sheets.has(name)).length;
  const canonicalMatches = canonicalIntakeSheetNames.filter((name) => snapshot.sheets.has(name)).length;
  const sourceMarkerPresent = [...snapshot.sheets.values()].some((sheet) =>
    [...sheet.cells.values()].some((value) => value.trim() === PROGRAMMES_INTAKE_CONTRACT_ID),
  );
  const exactCanonicalStructure = snapshot.sheetNames.length === canonicalIntakeSheetNames.length
    && canonicalMatches === canonicalIntakeSheetNames.length;
  const repeatingRows = {
    campus: columnCount(snapshot.sheets.get("Campuses"), "A", 4, 200),
    faculty: columnCount(snapshot.sheets.get("Faculty"), "A", 4, 200),
    fees: columnCount(snapshot.sheets.get("Fees"), "A", 4, 200),
    results: columnCount(snapshot.sheets.get("Results"), "A", 4, 200),
    scholarships: columnCount(snapshot.sheets.get("Scholarships"), "A", 4, 200),
    mediaAndEvidence: columnCount(snapshot.sheets.get("Media & Evidence"), "A", 4, 200),
    publicationTracker: columnCount(snapshot.sheets.get("Publication Tracker"), "A", 12, 200),
  };
  const tracker = snapshot.sheets.get("Publication Tracker");
  let trackerApprovedRows = 0;
  let trackerPublicationReadyRows = 0;
  for (let row = 12; row <= 200; row += 1) {
    if (/^approved$/i.test(cell(tracker, `H${row}`).trim())) trackerApprovedRows += 1;
    if (/^(?:publication ready|published)$/i.test(cell(tracker, `N${row}`).trim())) trackerPublicationReadyRows += 1;
  }
  const evidence = snapshot.sheets.get("Media & Evidence");
  let approvedEvidenceRows = 0;
  for (let row = 4; row <= 200; row += 1) {
    if (/^yes$/i.test(cell(evidence, `I${row}`).trim())) approvedEvidenceRows += 1;
  }

  const totals = {
    programmeForms: records.length,
    responseFields: records.reduce((sum, record) => sum + record.responseFields, 0),
    notConfirmedResponses: records.reduce((sum, record) => sum + record.notConfirmedResponses, 0),
    criticalFields: records.reduce((sum, record) => sum + record.criticalFields, 0),
    unresolvedCriticalResponses: records.reduce((sum, record) => sum + record.unresolvedCriticalResponses, 0),
    managementConfirmedForms: records.filter((record) => record.managementConfirmed).length,
    approvedForPublicationForms: records.filter((record) => record.approvedForPublication).length,
    trackerApprovedRows,
    trackerPublicationReadyRows,
    approvedEvidenceRows,
  };

  const issueCodes: ProgrammesWorkbookIssueCode[] = [];
  if (requiredMatches !== requiredSheetNames.length || snapshot.sheetNames.length !== requiredSheetNames.length) {
    issueCodes.push("invalid-workbook-structure");
  }
  if (!sourceMarkerPresent) issueCodes.push("contract-marker-missing");
  if (!exactCanonicalStructure) issueCodes.push("canonical-contract-structure-mismatch");
  if (snapshot.externalLinkPartCount || snapshot.macroPartCount || snapshot.embeddedObjectPartCount) {
    issueCodes.push("unsupported-package-parts");
  }
  if (totals.notConfirmedResponses) issueCodes.push("unresolved-responses");
  if (totals.unresolvedCriticalResponses) issueCodes.push("unresolved-critical-responses");
  if (totals.managementConfirmedForms !== records.length) issueCodes.push("management-confirmation-missing");
  if (totals.approvedForPublicationForms !== records.length) issueCodes.push("publication-decision-missing");
  if (trackerApprovedRows !== repeatingRows.publicationTracker) issueCodes.push("tracker-approval-missing");
  if (trackerPublicationReadyRows !== repeatingRows.publicationTracker) issueCodes.push("tracker-publication-readiness-missing");
  if (approvedEvidenceRows === 0) issueCodes.push("approved-evidence-missing");
  if (repeatingRows.results === 0) issueCodes.push("result-claims-suppressed");
  issueCodes.push("canonical-model-reconciliation-required");
  if (repeatingRows.faculty || repeatingRows.fees || repeatingRows.mediaAndEvidence || repeatingRows.campus) {
    issueCodes.push("potential-private-data-detected");
  }

  const digestInput = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(digestInput).set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", digestInput);
  const blockingCodes = issueCodes.filter((code) => code !== "potential-private-data-detected" && code !== "result-claims-suppressed");
  const status: ProgrammesWorkbookStatus = blockingCodes.length === 1
    && blockingCodes[0] === "canonical-model-reconciliation-required"
    ? "ready-for-controlled-reconciliation"
    : "blocked";

  return {
    schemaVersion: PROGRAMMES_WORKBOOK_RECEIPT_VERSION,
    receiptId: PROGRAMMES_WORKBOOK_RECEIPT_ID,
    generatedOn,
    sourceFingerprint: {
      algorithm: "sha256",
      value: hexDigest(digest),
      byteLength: bytes.byteLength,
    },
    status,
    structure: {
      worksheetCount: snapshot.sheetNames.length,
      requiredWorksheetCount: requiredSheetNames.length,
      matchedRequiredWorksheetCount: requiredMatches,
      formulaCellCount: snapshot.formulaCellCount,
      externalLinkPartCount: snapshot.externalLinkPartCount,
      macroPartCount: snapshot.macroPartCount,
      embeddedObjectPartCount: snapshot.embeddedObjectPartCount,
    },
    contractBinding: {
      intakeId: PROGRAMMES_INTAKE_CONTRACT_ID,
      schemaVersion: PROGRAMMES_INTAKE_CONTRACT_VERSION,
      sourceMarkerPresent,
      expectedWorksheetCount: canonicalIntakeSheetNames.length,
      matchedWorksheetCount: canonicalMatches,
      exactStructureMatch: exactCanonicalStructure,
    },
    totals,
    records,
    repeatingRows,
    compatibility: {
      canonicalProgrammePathwaysRequired: 3,
      canonicalProgrammePathwaysDirectlyMapped: 1,
      automaticContentPackageCreationSupported: false,
      manualInstitutionalModelDecisionRequired: true,
    },
    issueCodes,
    outcomes: {
      auditReceiptReady: true,
      sanitizedProjectionReady: false,
      publicationAuthorized: false,
    },
    privacy: {
      potentialPersonRecordsPresent: repeatingRows.faculty > 0,
      potentialContactFieldsPresent: repeatingRows.campus > 0 || repeatingRows.faculty > 0,
      internalFeeRowsPresent: repeatingRows.fees > 0,
      evidenceRegisterRowsPresent: repeatingRows.mediaAndEvidence > 0,
      rawWorkbookContentReturned: false,
      sourceFilenameReturned: false,
      sourcePathReturned: false,
    },
    guardrails: {
      networkRequestPerformed: false,
      serverPersistencePerformed: false,
      repositoryWritePerformed: false,
      managementApprovalGranted: false,
      contentPackageCreated: false,
      approvalManifestUpdated: false,
      cmsWritePerformed: false,
      publicContentPublished: false,
      navigationActivated: false,
      deploymentPerformed: false,
      malwareScanPerformed: false,
    },
  };
}

export async function inspectProgrammesWorkbook(options: {
  bytes: Uint8Array;
  generatedOn?: string;
}): Promise<ProgrammesWorkbookIntakeReceipt> {
  const generatedOn = options.generatedOn ?? new Date().toISOString().slice(0, 10);
  if (!validGeneratedOn(generatedOn)) throw new Error("Workbook audit requires a valid generated-on date.");
  const snapshot = parseWorkbook(options.bytes);
  return createProgrammesWorkbookIntakeReceipt(snapshot, options.bytes, generatedOn);
}

export async function inspectProgrammesWorkbookForPrivateDraft(options: {
  bytes: Uint8Array;
  generatedOn?: string;
}): Promise<ProgrammesWorkbookPrivateDraftInspection> {
  const generatedOn = options.generatedOn ?? new Date().toISOString().slice(0, 10);
  if (!validGeneratedOn(generatedOn)) throw new Error("Workbook audit requires a valid generated-on date.");
  const snapshot = parseWorkbook(options.bytes);
  const receipt = await createProgrammesWorkbookIntakeReceipt(snapshot, options.bytes, generatedOn);
  if (receipt.issueCodes.includes("invalid-workbook-structure")) {
    throw new Error("Temporary preview requires the complete recognized workbook structure.");
  }
  if (receipt.structure.externalLinkPartCount
    || receipt.structure.macroPartCount
    || receipt.structure.embeddedObjectPartCount) {
    throw new Error("Temporary preview is unavailable because the workbook contains unsupported package parts.");
  }
  const auditByRecordId = new Map(receipt.records.map((record) => [record.recordId, record]));
  const drafts = programmeSheets
    .filter((descriptor) => snapshot.sheets.has(descriptor.sheetName))
    .map((descriptor) => privateDraftRecord(
      snapshot,
      descriptor,
      auditByRecordId.get(descriptor.recordId) ?? programmeRecord(snapshot, descriptor),
    ));
  return { receipt, drafts };
}

export function validateProgrammesWorkbookIntakeReceipt(value: unknown): string[] {
  const issues: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["Receipt must be an object."];
  const receipt = value as Partial<ProgrammesWorkbookIntakeReceipt>;
  function exactKeys(candidate: unknown, allowed: readonly string[], label: string) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      issues.push(`${label} must be an object.`);
      return;
    }
    const extras = Object.keys(candidate).filter((key) => !allowed.includes(key));
    if (extras.length) issues.push(`${label} contains an unknown property.`);
  }
  exactKeys(receipt, [
    "$schema", "schemaVersion", "receiptId", "generatedOn", "sourceFingerprint", "status", "structure",
    "contractBinding", "totals", "records", "repeatingRows", "compatibility", "issueCodes", "outcomes",
    "privacy", "guardrails",
  ], "Receipt");
  if (receipt.$schema !== undefined && receipt.$schema !== "./programmes-workbook-intake-receipt.schema.json") {
    issues.push("Receipt schema reference is invalid.");
  }
  if (receipt.schemaVersion !== 1) issues.push("Receipt schema version is invalid.");
  if (receipt.receiptId !== PROGRAMMES_WORKBOOK_RECEIPT_ID) issues.push("Receipt ID is invalid.");
  if (typeof receipt.generatedOn !== "string" || !validGeneratedOn(receipt.generatedOn)) issues.push("Generated-on date is invalid.");
  if (!receipt.sourceFingerprint || receipt.sourceFingerprint.algorithm !== "sha256"
    || !/^[a-f0-9]{64}$/.test(receipt.sourceFingerprint.value ?? "")
    || !Number.isInteger(receipt.sourceFingerprint.byteLength)
    || (receipt.sourceFingerprint.byteLength ?? 0) <= 0) {
    issues.push("Source fingerprint is invalid.");
  }
  exactKeys(receipt.sourceFingerprint, ["algorithm", "value", "byteLength"], "Source fingerprint");
  if (receipt.status !== "blocked" && receipt.status !== "ready-for-controlled-reconciliation") issues.push("Receipt status is invalid.");
  exactKeys(receipt.structure, [
    "worksheetCount", "requiredWorksheetCount", "matchedRequiredWorksheetCount", "formulaCellCount",
    "externalLinkPartCount", "macroPartCount", "embeddedObjectPartCount",
  ], "Structure");
  exactKeys(receipt.contractBinding, [
    "intakeId", "schemaVersion", "sourceMarkerPresent", "expectedWorksheetCount", "matchedWorksheetCount",
    "exactStructureMatch",
  ], "Contract binding");
  const supportedContractBinding = (receipt.contractBinding?.schemaVersion === 1
      && receipt.contractBinding?.expectedWorksheetCount === 9)
    || (receipt.contractBinding?.schemaVersion === PROGRAMMES_INTAKE_CONTRACT_VERSION
      && receipt.contractBinding?.expectedWorksheetCount === canonicalIntakeSheetNames.length);
  if (receipt.contractBinding?.intakeId !== PROGRAMMES_INTAKE_CONTRACT_ID
    || !supportedContractBinding
    || typeof receipt.contractBinding?.sourceMarkerPresent !== "boolean"
    || !Number.isInteger(receipt.contractBinding?.matchedWorksheetCount)
    || (receipt.contractBinding?.matchedWorksheetCount ?? -1) < 0
    || (receipt.contractBinding?.matchedWorksheetCount ?? Number.POSITIVE_INFINITY) > (receipt.contractBinding?.expectedWorksheetCount ?? -1)
    || typeof receipt.contractBinding?.exactStructureMatch !== "boolean") {
    issues.push("Contract binding is invalid.");
  }
  exactKeys(receipt.totals, [
    "programmeForms", "responseFields", "notConfirmedResponses", "criticalFields", "unresolvedCriticalResponses",
    "managementConfirmedForms", "approvedForPublicationForms", "trackerApprovedRows",
    "trackerPublicationReadyRows", "approvedEvidenceRows",
  ], "Totals");
  if (!Array.isArray(receipt.records) || receipt.records.length !== programmeSheets.length) {
    issues.push("Programme record audit is incomplete.");
  } else {
    const ids = new Set<string>();
    for (const record of receipt.records) {
      exactKeys(record, [
        "recordId", "responseFields", "notConfirmedResponses", "criticalFields", "unresolvedCriticalResponses",
        "managementConfirmed", "approvedForPublication",
      ], "Programme record");
      ids.add(record.recordId);
      if (!programmeSheets.some((descriptor) => descriptor.recordId === record.recordId)
        || ![record.responseFields, record.notConfirmedResponses, record.criticalFields, record.unresolvedCriticalResponses]
          .every((number) => Number.isInteger(number) && number >= 0)
        || typeof record.managementConfirmed !== "boolean"
        || typeof record.approvedForPublication !== "boolean") {
        issues.push("Programme record contains an invalid value.");
      }
    }
    if (ids.size !== programmeSheets.length) issues.push("Programme record IDs must be unique and complete.");
  }
  exactKeys(receipt.repeatingRows, ["campus", "faculty", "fees", "results", "scholarships", "mediaAndEvidence", "publicationTracker"], "Repeating rows");
  exactKeys(receipt.compatibility, [
    "canonicalProgrammePathwaysRequired", "canonicalProgrammePathwaysDirectlyMapped",
    "automaticContentPackageCreationSupported", "manualInstitutionalModelDecisionRequired",
  ], "Compatibility");
  if (!Array.isArray(receipt.issueCodes)
    || new Set(receipt.issueCodes).size !== receipt.issueCodes.length
    || receipt.issueCodes.some((code) => !programmesWorkbookIssueCodes.includes(code))) {
    issues.push("Receipt issue codes are invalid.");
  }
  exactKeys(receipt.outcomes, ["auditReceiptReady", "sanitizedProjectionReady", "publicationAuthorized"], "Outcomes");
  if (receipt.outcomes?.auditReceiptReady !== true
    || receipt.outcomes?.sanitizedProjectionReady !== false
    || receipt.outcomes?.publicationAuthorized !== false) {
    issues.push("Receipt outcomes are invalid.");
  }
  exactKeys(receipt.guardrails, [
    "networkRequestPerformed", "serverPersistencePerformed", "repositoryWritePerformed", "managementApprovalGranted",
    "contentPackageCreated", "approvalManifestUpdated", "cmsWritePerformed", "publicContentPublished",
    "navigationActivated", "deploymentPerformed", "malwareScanPerformed",
  ], "Guardrails");
  if (!receipt.guardrails || Object.values(receipt.guardrails).some((flag) => flag !== false)) {
    issues.push("Receipt guardrails must remain false.");
  }
  exactKeys(receipt.privacy, [
    "potentialPersonRecordsPresent", "potentialContactFieldsPresent", "internalFeeRowsPresent",
    "evidenceRegisterRowsPresent", "rawWorkbookContentReturned", "sourceFilenameReturned", "sourcePathReturned",
  ], "Privacy");
  if (!receipt.privacy || receipt.privacy.rawWorkbookContentReturned !== false
    || receipt.privacy.sourceFilenameReturned !== false
    || receipt.privacy.sourcePathReturned !== false) {
    issues.push("Receipt privacy boundary is invalid.");
  }
  if (receipt.compatibility?.automaticContentPackageCreationSupported !== false
    || receipt.compatibility?.manualInstitutionalModelDecisionRequired !== true) {
    issues.push("Receipt compatibility boundary is invalid.");
  }
  if (receipt.status === "blocked" && (!receipt.issueCodes || receipt.issueCodes.length === 0)) {
    issues.push("Blocked receipts require at least one issue code.");
  }
  return issues;
}

export const programmesWorkbookIssueLabels: Record<ProgrammesWorkbookIssueCode, string> = {
  "invalid-workbook-structure": "The workbook does not match the required worksheet structure.",
  "contract-marker-missing": "The workbook has no embedded intake ID and schema-version marker.",
  "canonical-contract-structure-mismatch": "The workbook tabs do not exactly match the repository's canonical nine-tab intake contract.",
  "unsupported-package-parts": "The workbook contains external links, macros or embedded objects that are not accepted.",
  "unresolved-responses": "One or more programme responses still contain NOT CONFIRMED.",
  "unresolved-critical-responses": "One or more critical programme responses are blank or unconfirmed.",
  "management-confirmation-missing": "Every programme form needs an explicit management accuracy confirmation.",
  "publication-decision-missing": "Every programme form needs an explicit Approved for publication decision.",
  "tracker-approval-missing": "Every publication tracker row needs an approved management state.",
  "tracker-publication-readiness-missing": "Every publication tracker row needs a publication-ready state.",
  "approved-evidence-missing": "No evidence register row is marked management approved.",
  "result-claims-suppressed": "No result record is present, so result claims must remain suppressed.",
  "canonical-model-reconciliation-required": "The workbook does not directly decide the canonical Senior Secondary, Junior College and exam-preparation institutional model.",
  "potential-private-data-detected": "The source may contain people, contacts, internal fees or evidence details; only aggregate audit metrics are retained.",
};
