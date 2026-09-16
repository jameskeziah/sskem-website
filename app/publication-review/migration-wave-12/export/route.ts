import { requireChatGPTUser } from "@/app/chatgpt-auth";
import {
  legacyMigrationWave12Manifest,
  legacyMigrationWave12WorksheetCsv,
} from "@/app/data/legacy-migration-wave-12";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
};

export async function GET() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") {
    return new Response("Not found", { status: 404, headers: privateHeaders });
  }
  await requireChatGPTUser("/publication-review/migration-wave-12/export");

  return new Response(await legacyMigrationWave12WorksheetCsv(), {
    headers: {
      ...privateHeaders,
      "content-disposition": `attachment; filename="sskem-${legacyMigrationWave12Manifest.waveId}.csv"`,
      "content-type": "text/csv; charset=utf-8",
    },
  });
}
