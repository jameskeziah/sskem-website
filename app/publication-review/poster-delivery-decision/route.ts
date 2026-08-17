import { getChatGPTUser } from "@/app/chatgpt-auth";
import { createHomepagePosterDeliveryDecisionDownload } from "@/lib/homepage-poster-delivery-decision";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") return new Response("Not found", { status: 404 });
  if (!await getChatGPTUser()) {
    return new Response("Authentication required", {
      status: 401,
      headers: { "cache-control": "private, no-store" },
    });
  }

  const download = createHomepagePosterDeliveryDecisionDownload();
  return new Response(download.body, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="${download.filename}"`,
      "content-security-policy": "default-src 'none'; sandbox",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
