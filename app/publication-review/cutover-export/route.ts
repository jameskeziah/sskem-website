import {
  legacyCutoverCsv,
  legacyCutoverInventory,
} from "@/app/data/legacy-cutover";

export async function GET() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") {
    return new Response("Not found", { status: 404 });
  }

  return new Response(legacyCutoverCsv(), {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="sskem-legacy-cutover-${legacyCutoverInventory.capturedOn}.csv"`,
      "content-type": "text/csv; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
