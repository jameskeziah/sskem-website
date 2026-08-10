import { approvalManifest, approvalQueueCsv } from "@/app/data/publication-approval";

export async function GET() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") {
    return new Response("Not found", { status: 404 });
  }

  return new Response(approvalQueueCsv(), {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="sskem-publication-approval-queue-${approvalManifest.updatedOn}.csv"`,
      "content-type": "text/csv; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
