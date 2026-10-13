import { admissionClassOptions, admissionsCycle } from "@/app/data/admissions";

// This is intentionally off until school privacy, management, routing,
// operational abuse controls, and both deployment configurations are approved.
export function isCrmEnquiryEnabled() {
  return process.env.SSKEMS_CRM_ENQUIRY_ENABLED === "true" &&
    Boolean(process.env.SSKEMS_CRM_API_ORIGIN) &&
    Boolean(process.env.SSKEMS_CRM_TENANT_SLUG) &&
    Boolean(process.env.SSKEMS_CRM_BRANCH_ID);
}

const topics = new Set([
  "availability", "fees", "curriculum", "transport", "visit",
  "accessibility", "process", "other",
]);
const contactMethods = new Set(["phone", "email"]);
const MAX_BODY_BYTES = 8192;

function respond(message: string, status: number) {
  return Response.json({ message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function boundedString(value: unknown, max: number): string | null {
  if (typeof value !== "string" || value.length > max) return null;
  return value.trim();
}

function backendOrigin(): string | null {
  const configured = process.env.SSKEMS_CRM_API_ORIGIN;
  if (!configured) return null;
  try {
    const url = new URL(configured);
    const localDev = process.env.NODE_ENV === "development" &&
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !localDev) return null;
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!isCrmEnquiryEnabled()) {
    return respond("Online enquiries are not active. Please contact the school directly.", 503);
  }

  const backend = backendOrigin();
  const branchId = process.env.SSKEMS_CRM_BRANCH_ID || "";
  const tenant = process.env.SSKEMS_CRM_TENANT_SLUG || "";
  if (!backend || !/^\d+$/.test(branchId) || !/^[a-z0-9-]{2,80}$/.test(tenant)) {
    return respond("Online enquiries are temporarily unavailable.", 503);
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return respond("Forbidden", 403);
  }
  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return respond("Expected JSON", 415);
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    return respond("Enquiry is too large.", 413);
  }

  let data: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
      return respond("Enquiry is too large.", 413);
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return respond("Invalid enquiry.", 400);
    }
    data = parsed as Record<string, unknown>;
  } catch {
    return respond("Invalid enquiry.", 400);
  }

  // Honeypot: never forward bot-submitted data.
  if (data.website) return respond("Enquiry received.", 202);

  const parentName = boundedString(data.parentName, 120);
  const mobile = boundedString(data.mobile, 24);
  const classOption = admissionClassOptions.find((item) => item.value === data.classSought);
  const year = boundedString(data.academicYear, 32);
  const topic = boundedString(data.enquiryTopic, 40);
  const method = boundedString(data.preferredContactMethod, 16);
  const email = boundedString(data.email ?? "", 254);
  const question = boundedString(data.question ?? "", 1000);
  const phoneDigits = (mobile || "").replace(/\D/g, "");
  const phone = phoneDigits.length === 12 && phoneDigits.startsWith("91")
    ? phoneDigits.slice(2)
    : phoneDigits;

  if (
    !parentName || parentName.length < 2 ||
    !/^[6-9]\d{9}$/.test(phone) ||
    !classOption ||
    year !== admissionsCycle.academicYear ||
    !topic || !topics.has(topic) ||
    !method || !contactMethods.has(method) ||
    email === null || question === null ||
    (method === "email" && !email) ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    data.contactConsent !== true
  ) {
    return respond("Please check the enquiry details and contact consent.", 400);
  }

  try {
    const response = await fetch(new URL("/api/public/enquiries", backend), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        tenant,
        branchId,
        // A brief enquiry is not an application. The child is not
        // identified until staff follow-up.
        studentName: "Not provided (website enquiry)",
        parentName,
        parentPhone: phone,
        className: classOption.label,
        source: "WEBSITE",
        campaign: "SSKEMS_ADMISSIONS",
        academicYear: year,
        enquiryTopic: topic,
        preferredContactMethod: method,
        email,
        question,
        contactConsent: true,
      }),
    });
    if (response.status === 201 || response.status === 202) {
      // Do not disclose backend IDs, existing leads or duplicate status.
      return respond("Thank you. Your enquiry has been received.", 202);
    }
    return respond("Online enquiries are temporarily unavailable. Please contact the school.", 502);
  } catch {
    return respond("Online enquiries are temporarily unavailable. Please contact the school.", 502);
  }
}
