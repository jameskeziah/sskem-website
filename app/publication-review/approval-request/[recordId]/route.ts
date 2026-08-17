import { getChatGPTUser } from "@/app/chatgpt-auth";
import { createApprovalRequestDownload } from "@/lib/approval-request-download";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ recordId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") return new Response("Not found", { status: 404 });
  if (!await getChatGPTUser()) {
    return new Response("Authentication required", {
      status: 401,
      headers: { "cache-control": "private, no-store" },
    });
  }

  const { recordId } = await params;
  let download;
  try {
    download = createApprovalRequestDownload(recordId);
  } catch (error) {
    if (error instanceof Error && error.message === `Unknown approval record: ${recordId}.`) {
      return new Response("Not found", {
        status: 404,
        headers: { "cache-control": "private, no-store" },
      });
    }
    throw error;
  }

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
