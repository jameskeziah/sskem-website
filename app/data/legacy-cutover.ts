import inventoryData from "@/content/legacy-cutover-inventory.json";

export type LegacyCutoverRecord = (typeof inventoryData.records)[number];

export const legacyCutoverInventory = inventoryData;
export const legacyRedirectRecords = inventoryData.records.filter(
  (record) => record.disposition === "redirect",
);
export const legacyCatchAllRedirects = new Map(
  legacyRedirectRecords
    .filter((record) => record.implementation === "catch-all-redirect")
    .map((record) => [record.legacyPath, record.targetPath]),
);

export const legacyCutoverDashboard = {
  total: inventoryData.records.length,
  redirects: legacyRedirectRecords.length,
  retained: inventoryData.records.filter((record) => record.disposition === "retain").length,
  approvalBlocked: inventoryData.records.filter((record) => record.contentReview === "approval-blocked").length,
  highRisk: inventoryData.records.filter((record) => record.risk === "high").length,
  pendingImplementation: inventoryData.records.filter((record) => record.implementation === "pending").length,
};

export function legacyCatchAllRedirectTarget(path: string) {
  return legacyCatchAllRedirects.get(path) ?? null;
}

export function legacyCutoverCsv() {
  const headers = ["id", "title", "legacyPath", "disposition", "targetPath", "implementation", "contentReview", "risk", "ownerRole", "observedOn", "notes"];
  const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [
    headers.map(quote).join(","),
    ...inventoryData.records.map((record) => headers.map((header) => quote(record[header as keyof typeof record])).join(",")),
  ].join("\r\n");
}
