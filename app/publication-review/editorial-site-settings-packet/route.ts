import { getChatGPTUser } from "@/app/chatgpt-auth";
import { createSiteSettingsMigrationPacket } from "@/lib/cms/site-settings-migration";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") return new Response("Not found", { status: 404 });
  if (!await getChatGPTUser()) {
    return new Response("Authentication required", {
      status: 401,
      headers: { "cache-control": "private, no-store" },
    });
  }

  const packet = createSiteSettingsMigrationPacket();
  const date = packet.generatedAt.slice(0, 10);
  return new Response(`${JSON.stringify(packet, null, 2)}\n`, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="sskem-site-settings-migration-${date}.json"`,
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
