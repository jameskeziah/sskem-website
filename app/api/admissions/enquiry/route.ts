import { admissionClassOptions, admissionsCycle } from "@/app/data/admissions";

export const runtime = "nodejs";

const enquiryTopics = new Set([
  "availability", "fees", "curriculum", "transport",
  "visit", "accessibility", "process", "other",
]);

function reply(message: string, status: number) {
  return Response.json(
    { message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function field(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length <= max ? value.trim() : null;
}

function validPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local);
}

export async function POST(request: Request) {
  // Disabled by default. No browser ever receives the CRM URL or bridge key.
  if (process.env.ADMISSIONS_ENQUIRY_ENABLED !== "true") {
    return reply("Online enquiries are not enabled yet. Please contact the school office.", 503);
  }
  const apiUrl = process.env.SSKEMS_CRM_API_BASE_URL;
  const bridgeKey = process.env.SSKEMS_CRM_BRIDGE_KEY;
  const challengeSecret = process.env.TURNSTILE_SECRET_KEY;
  if (!apiUrl || !bridgeKey || bridgeKey.length < 32 || !challengeSecret) {
    return reply("Online enquiries are temporarily unavailable.", 503);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return reply("Expected JSON enquiry information.", 415);
  }

  let data: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 10000) return reply("Enquiry is too long.", 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return reply("Invalid enquiry information.", 400);
    }
    data = parsed as Record<string, unknown>;
  } catch {
    return reply("Invalid enquiry information.", 400);
  }

  const website = field(data.website ?? "", 200);
  if (website === null) return reply("Invalid enquiry information.", 400);
  if (website) return reply("Enquiry received.", 201); // Honeypot.

  const studentName = field(data.studentName, 100);
  const parentName = field(data.parentName, 100);
  const parentPhone = field(data.mobile, 20);
  const classSought = field(data.classSought, 30);
  const academicYear = field(data.academicYear, 20);
  const enquiryTopic = field(data.enquiryTopic, 30);
  const preferredContactMethod = field(data.preferredContactMethod, 10);
  const email = field(data.email ?? "", 254);
  const question = field(data.question ?? "", 1000);
  const challengeToken = field(data.turnstileToken, 2048);
  const selectedClass = admissionClassOptions.find(({ value }) => value === classSought);

  if (
    !studentName || studentName.length < 2 ||
    !parentName || parentName.length < 2 ||
    !parentPhone || !validPhone(parentPhone) ||
    !selectedClass || academicYear !== admissionsCycle.academicYear ||
    !enquiryTopic || !enquiryTopics.has(enquiryTopic) ||
    !["phone", "email"].includes(preferredContactMethod ?? "") ||
    email === null || (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    (preferredContactMethod === "email" && !email) ||
    question === null || data.contactConsent !== true ||
    !challengeToken
  ) {
    return reply("Please check the required fields and complete the verification.", 400);
  }

  try {
    const challengeResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: challengeSecret, response: challengeToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const challenge: { success?: boolean } = await challengeResponse.json();
    if (!challengeResponse.ok || challenge.success !== true) {
      return reply("Verification failed or expired. Please try again.", 400);
    }
  } catch {
    return reply("Verification is temporarily unavailable. Please try again.", 503);
  }

  try {
    const base = new URL(apiUrl.endsWith("/") ? apiUrl : apiUrl + "/");
    if (process.env.NODE_ENV === "production" && base.protocol !== "https:") {
      return reply("School enquiry routing is not configured securely.", 503);
    }
    if (!["https:", "http:"].includes(base.protocol)) {
      return reply("School enquiry routing is not configured securely.", 503);
    }
    const endpoint = new URL("integrations/school/enquiry", base);
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-school-bridge-key": bridgeKey,
      },
      body: JSON.stringify({
        studentName,
        parentName,
        parentPhone,
        className: selectedClass.label,
        academicYear,
        enquiryTopic,
        preferredContactMethod,
        email,
        question,
        contactConsent: true,
        website: "",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (upstream.status === 201) return reply("Your enquiry was sent to the admissions team.", 201);
    if (upstream.status === 409) {
      return reply("An enquiry already exists for this mobile number. Please contact the school office.", 409);
    }
    return reply("We could not record your enquiry. Please contact the school office.", 502);
  } catch {
    return reply("We could not contact the admissions service. Please contact the school office.", 502);
  }
}
