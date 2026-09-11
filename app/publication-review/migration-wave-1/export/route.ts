import { requireChatGPTUser } from "@/app/chatgpt-auth";
import {
  legacyMigrationWave1Manifest,
  legacyMigrationWave1WorksheetCsv,
} from "@/app/data/legacy-migration-wave-1";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") {
    return new Response("Not found", { status: 404 });
  }
  await requireChatGPTUser("/publication-review/migration-wave-1/export");

  return new Response(await legacyMigrationWave1WorksheetCsv(), {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="sskem-${legacyMigrationWave1Manifest.waveId}.csv"`,
      "content-type": "text/csv; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
