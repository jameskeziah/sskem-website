import { requireChatGPTUser } from "@/app/chatgpt-auth";
import {
  legacyContentMigrationMatrix,
  legacyContentMigrationWorksheetCsv,
} from "@/app/data/legacy-content-migration";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") {
    return new Response("Not found", { status: 404 });
  }
  await requireChatGPTUser("/publication-review/migration-matrix-export");

  return new Response(await legacyContentMigrationWorksheetCsv(), {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="sskem-legacy-migration-decision-contract-${legacyContentMigrationMatrix.builtOn}.csv"`,
      "content-type": "text/csv; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
