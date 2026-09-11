import { requireChatGPTUser } from "@/app/chatgpt-auth";
import {
  legacyMigrationWave2Manifest,
  legacyMigrationWave2WorksheetCsv,
} from "@/app/data/legacy-migration-wave-2";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") {
    return new Response("Not found", { status: 404 });
  }
  await requireChatGPTUser("/publication-review/migration-wave-2/export");

  return new Response(await legacyMigrationWave2WorksheetCsv(), {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="sskem-${legacyMigrationWave2Manifest.waveId}.csv"`,
      "content-type": "text/csv; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
