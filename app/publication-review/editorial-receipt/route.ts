import {
  getHomepageEditorialReview,
  type EditorialContentType,
} from "@/lib/cms/homepage-editorial.server";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

const allowedTypes = new Set<EditorialContentType>(["siteSettings", "announcement", "admissionCycle", "event"]);

export async function GET(request: Request) {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") return new Response("Not found", { status: 404 });
  if (!await getChatGPTUser()) {
    return new Response("Authentication required", {
      status: 401,
      headers: { "cache-control": "private, no-store" },
    });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const documentId = url.searchParams.get("id");
  const revision = url.searchParams.get("revision");
  if (!type || !allowedTypes.has(type as EditorialContentType) || !documentId || !revision || documentId.length > 128 || revision.length > 128) {
    return new Response("Invalid receipt request", { status: 400 });
  }

  const review = await getHomepageEditorialReview();
  if (review.status.reason !== "review-ready") {
    return new Response("Editorial review source is unavailable", {
      status: 503,
      headers: { "cache-control": "private, no-store" },
    });
  }

  const item = review.items.find((candidate) => (
    candidate.contentType === type
    && candidate.documentId === documentId
    && candidate.revision === revision
  ));
  if (!item) return new Response("Revision not found", { status: 404, headers: { "cache-control": "private, no-store" } });
  if (!item.receiptProposal) {
    return Response.json({ status: "blocked", blockers: item.blockers }, {
      status: 409,
      headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" },
    });
  }

  return new Response(`${JSON.stringify(item.receiptProposal, null, 2)}\n`, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="${item.receiptProposal.bindingId}.json"`,
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
