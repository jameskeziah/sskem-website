import { requireChatGPTUser } from "@/app/chatgpt-auth";
import {
  legacyMigrationWave7Manifest,
  legacyMigrationWave7WorksheetCsv,
} from "@/app/data/legacy-migration-wave-7";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
};

export async function GET() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") {
    return new Response("Not found", { status: 404, headers: privateHeaders });
  }
  await requireChatGPTUser("/publication-review/migration-wave-7/export");

  return new Response(await legacyMigrationWave7WorksheetCsv(), {
    headers: {
      ...privateHeaders,
      "content-disposition": `attachment; filename="sskem-${legacyMigrationWave7Manifest.waveId}.csv"`,
      "content-type": "text/csv; charset=utf-8",
    },
  });
}
