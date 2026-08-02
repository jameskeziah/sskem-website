import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
let workerPromise;

function projectFile(path) {
  return new URL(path, projectRoot);
}

async function source(path) {
  return readFile(projectFile(path), "utf8");
}

async function getWorker() {
  if (!workerPromise) {
    const workerUrl = projectFile("dist/server/index.js");
    workerUrl.searchParams.set("stage3-test", `${process.pid}-${Date.now()}`);
    workerPromise = import(workerUrl.href).then(({ default: worker }) => worker);
  }
  return workerPromise;
}

async function request(pathname) {
  const worker = await getWorker();
  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
      redirect: "manual",
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

function withoutScripts(html) {
  return html
    .replace(/<!--.*?-->/gs, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");
}

function textContent(markup) {
  return withoutScripts(markup)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&ndash;|&#x2013;|&#8211;/g, "–")
    .replace(/&mdash;|&#x2014;|&#8212;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function anchorsIn(html) {
  return [...withoutScripts(html).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(
    ([, attributes, content]) => ({
      href: attributes.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? "",
      text: textContent(content),
    }),
  );
}

function formsIn(html) {
  return [...withoutScripts(html).matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)].map(
    ([form]) => form,
  );
}

async function admissionsPolicy() {
  const moduleUrl = projectFile("lib/admissions-policy.ts");
  moduleUrl.searchParams.set("stage3-policy", `${process.pid}-${Date.now()}-${Math.random()}`);
  return import(moduleUrl.href);
}

async function assertPublicHtml(pathname) {
  const response = await request(pathname);
  assert.equal(response.status, 200, `${pathname} must be publicly reachable`);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("www-authenticate"), null);
  assert.equal(response.headers.get("set-cookie"), null);
  const html = await response.text();
  assert.match(html, /<main\b[^>]*\bid=["']main-content["']/i);
  assert.match(html, /<a\b[^>]*\bhref=["']#main-content["'][^>]*>\s*Skip to main content\s*<\/a>/i);
  return html;
}

async function sourcesUnder(directory) {
  const directoryUrl = projectFile(`${directory}/`);
  const files = await readdir(directoryUrl, { recursive: true });
  const sourceFiles = files.filter((file) => /\.(?:ts|tsx|sql)$/i.test(file));
  return Promise.all(sourceFiles.map((file) => source(`${directory}/${file.replaceAll("\\", "/")}`)));
}

test("serves the complete Stage 3 admissions route set without blocking essential guidance", async () => {
  const routes = [
    "/admissions",
    "/admissions/process",
    "/admissions/age-criteria",
    "/admissions/enquire",
    "/admissions/apply",
    "/admissions/application-status",
    "/admissions/documents-required",
    "/admissions/fees",
    "/admissions/faq",
    "/admissions/contact",
    "/admissions/rte",
    "/admissions/class-9-and-11-transfers",
    "/admissions/school",
    "/admissions/senior-secondary",
    "/admissions/visit",
  ];

  for (const route of routes) {
    const html = await assertPublicHtml(route);
    assert.doesNotMatch(html, /<iframe\b[^>]*\.pdf/i, `${route} must not be a PDF-only workflow`);
  }
});

test("separates enquiry, application, and status actions on the admissions landing page", async () => {
  const html = await assertPublicHtml("/admissions");
  const text = textContent(html);
  const anchors = anchorsIn(html);
  const expectedActions = [
    ["Make an Enquiry", "/admissions/enquire"],
    ["Start an Application", "/admissions/apply"],
    ["Check Application Status", "/admissions/application-status"],
  ];

  for (const [label, href] of expectedActions) {
    assert.ok(
      anchors.some((anchor) => anchor.text === label && anchor.href === href),
      `Missing distinct admissions action: ${label}`,
    );
  }

  assert.match(text, /2026\s*[–-]\s*27/i);
  assert.match(text, /applications? (?:open|closed|closing)|limited seats|waiting list|enquiries open|availability/i);
  assert.doesNotMatch(text, /(?:Make an Enquiry|Check Application Status)\s+Apply Now/i);
});

test("publishes the parent-facing admissions process in chronological order", async () => {
  const html = await assertPublicHtml("/admissions/process");
  const text = textContent(html);
  const steps = [
    /check eligibility/i,
    /make an enquiry/i,
    /speak with admissions|visit the school/i,
    /start (?:the )?(?:formal )?application/i,
    /application review/i,
    /interaction|orientation/i,
    /provisional offer/i,
    /admission confirmation/i,
  ];
  const positions = steps.map((pattern) => text.search(pattern));

  assert.ok(positions.every((position) => position >= 0), "All eight parent-facing steps must be present");
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, "Admissions steps must remain chronological");
  assert.match(text, /non-selective|not (?:a )?(?:selection )?test|no screening/i);
  assert.match(text, /does not guarantee admission|admission is not guaranteed/i);
});

test("keeps age guidance source-led and returns only safe eligibility language", async () => {
  const html = await assertPublicHtml("/admissions/age-criteria");
  const serverHtml = withoutScripts(html);
  const text = textContent(serverHtml);

  assert.match(text, /2026\s*[–-]\s*27/i);
  assert.match(text, /Government of Maharashtra|Maharashtra government/i);
  assert.match(text, /official (?:Maharashtra )?(?:order|cut-off)|government order/i);
  assert.match(text, /Requires manual review/i);
  assert.doesNotMatch(text, /Admission guaranteed/i);
  assert.doesNotMatch(
    text,
    /\b\d{1,2}[/. -]\d{1,2}[/. -](?:19|20)\d{2}\s*(?:to|through|[-–—])\s*\d{1,2}[/. -]\d{1,2}[/. -](?:19|20)\d{2}\b/i,
    "Unverified date-of-birth ranges must not be hard-coded into page content",
  );

  for (const label of ["Child's date of birth", "Academic year", "Class sought", "Check eligibility"]) {
    assert.match(text, new RegExp(label.replace("'", "['’]"), "i"), `Age checker is missing ${label}`);
  }
});

test("keeps the enquiry low-friction and excludes sensitive application-stage fields", async () => {
  const html = await assertPublicHtml("/admissions/enquire");
  const forms = formsIn(html);
  const form = forms.find((candidate) => /Parent (?:or|\/) guardian name|Parent or guardian name/i.test(textContent(candidate)));

  assert.ok(form, "The enquiry route must contain a native, labelled enquiry form");
  const formText = textContent(form);
  for (const label of [
    "Parent or guardian name",
    "Mobile number",
    "Child's name",
    "Class sought",
    "Academic year",
    "Preferred contact method",
  ]) {
    assert.match(formText, new RegExp(label.replace("'", "['’]"), "i"), `Enquiry form is missing ${label}`);
  }

  const inputMarkup = [...form.matchAll(/<(?:input|select|textarea)\b[^>]*>/gi)]
    .map(([tag]) => tag)
    .join("\n");
  assert.doesNotMatch(
    inputMarkup,
    /\b(?:name|id|placeholder)=["'][^"']*(?:aadhaar|aadhar|birth.?certificate|caste|income.?certificate|medical.?history|marksheet|occupation.?document|bank.?detail)[^"']*["']/i,
    "Enquiry inputs must not request sensitive application-stage evidence",
  );
  assert.doesNotMatch(inputMarkup, /\btype=["']file["']/i);

  const inputTags = [...form.matchAll(/<input\b[^>]*>/gi)].map(([tag]) => tag);
  assert.ok(
    inputTags.some((tag) => /\btype=["']checkbox["']/i.test(tag) && /\brequired\b/i.test(tag)),
    "Contact consent must be explicit and required",
  );

  const hasReviewBoundary = /review mode|preview|submissions? (?:are )?(?:disabled|not active)|not collecting real personal data/i.test(
    textContent(html),
  );
  const hasScopedApiAction = forms.some((candidate) => /\baction=["']\/api\/admissions\/enquir(?:y|ies)["']/i.test(candidate));
  assert.ok(hasReviewBoundary || hasScopedApiAction, "The form must expose either a safe review boundary or a scoped admissions endpoint");
});

test("separates regulated and exceptional admissions pathways", async () => {
  const [rteHtml, transferHtml, applyHtml, seniorHtml, statusHtml] = await Promise.all([
    assertPublicHtml("/admissions/rte"),
    assertPublicHtml("/admissions/class-9-and-11-transfers"),
    assertPublicHtml("/admissions/apply"),
    assertPublicHtml("/admissions/senior-secondary"),
    assertPublicHtml("/admissions/application-status"),
  ]);

  const rteText = textContent(rteHtml);
  assert.match(rteText, /official (?:Maharashtra )?RTE|Maharashtra.*official.*portal|School Education and Sports Department/i);
  assert.match(rteText, /ordinary|regular school (?:enquiry|application)|not the official RTE/i);
  assert.doesNotMatch(rteText, /₹\s*[\d,]+|income (?:limit|threshold)\s*(?:is|:)\s*[₹\d]/i);

  const transferText = textContent(transferHtml);
  assert.match(transferText, /Class IX/i);
  assert.match(transferText, /Class XI/i);
  assert.match(transferText, /31 August|after 31 August|competent authority/i);

  const exceptionalText = `${textContent(applyHtml)} ${textContent(seniorHtml)} ${transferText}`;
  assert.match(exceptionalText, /Class X[\s\S]{0,180}(?:not (?:an )?ordinary|special|restricted|manual review)/i);
  assert.match(exceptionalText, /Class XII[\s\S]{0,180}(?:not (?:an )?ordinary|special|restricted|manual review)/i);

  const statusText = textContent(statusHtml);
  for (const credential of [/application reference/i, /registered mobile/i, /one-time password|OTP/i]) {
    assert.match(statusText, credential, "The status portal must describe its secure lookup factors");
  }
  assert.match(statusText, /internal notes|staff discussions|risk flags/i);
  assert.match(statusText, /not (?:shown|exposed|visible)|remain private|never exposed/i);
});

test("declares and serves permanent legacy admissions redirects", async () => {
  const redirects = new Map([
    ["/guideline-procedure", "/admissions/process"],
    ["/section-strength", "/admissions/age-criteria"],
    ["/student-enrolment", "/admissions"],
    ["/registration-form", "/admissions/enquire"],
    ["/admission-form", "/admissions/apply"],
  ]);

  for (const [legacyPath, expectedPath] of redirects) {
    const response = await request(legacyPath);
    assert.ok([301, 308].includes(response.status), `Expected a permanent redirect for ${legacyPath}, received ${response.status}`);
    const location = response.headers.get("location");
    assert.ok(location, `${legacyPath} must include a Location header`);
    const destination = new URL(location, "http://localhost");
    assert.equal(destination.pathname.replace(/\/$/, ""), expectedPath);
    assert.equal((await request(destination.pathname)).status, 200, `${expectedPath} must resolve directly`);
  }
});

test("scaffolds the audited admissions records needed for later durable workflows", async () => {
  const databaseSources = (await sourcesUnder("db")).join("\n");
  for (const table of [
    "admission_cycles",
    "admission_class_availability",
    "admission_age_rules",
    "admission_enquiries",
    "admission_applications",
    "application_status_history",
    "application_consents",
    "admission_audit_log",
  ]) {
    assert.match(databaseSources, new RegExp(`\\b${table}\\b`), `Admissions schema is missing ${table}`);
  }

  for (const auditField of [
    "government_order_document_id",
    "verified_at",
    "consent_at",
    "previous_status",
    "new_status",
  ]) {
    assert.match(databaseSources, new RegExp(`\\b${auditField}\\b`), `Admissions schema is missing ${auditField}`);
  }
});

test("blocks age publication and calculation until the full source record is verified", async () => {
  const { evaluateAgeEligibility, isAgeRulePublishable } = await admissionsPolicy();
  const incompleteRule = {
    academicYear: "2026–27",
    cutoffDate: null,
    minimumAgeYears: 6,
    minimumAgeMonths: 0,
    maximumAgeYears: null,
    governmentOrderReference: null,
    governmentOrderDocumentId: null,
    verifiedBy: null,
    verifiedAt: null,
  };

  assert.equal(isAgeRulePublishable(incompleteRule), false);
  assert.deepEqual(
    evaluateAgeEligibility({
      dateOfBirth: "2020-01-01",
      rule: incompleteRule,
      classOption: { value: "class-1", label: "Class I", pathway: "standard" },
    }).code,
    "manual-review",
  );

  const completeRule = {
    ...incompleteRule,
    cutoffDate: "2026-06-30",
    governmentOrderReference: "ORDER-EXAMPLE",
    governmentOrderDocumentId: "document-token",
    verifiedBy: "authorised-reviewer",
    verifiedAt: "2026-02-01T10:00:00Z",
  };
  assert.equal(isAgeRulePublishable(completeRule), true);
  assert.equal(
    evaluateAgeEligibility({
      dateOfBirth: "2021-01-01",
      rule: completeRule,
      classOption: { value: "class-1", label: "Class I", pathway: "standard" },
    }).code,
    "too-young",
  );
});

test("keeps restricted and late senior-class applications in special review", async () => {
  const { parentFacingStatus, requiresSpecialAdmissionReview } = await admissionsPolicy();

  assert.equal(requiresSpecialAdmissionReview("class-10", "2026-06-01"), true);
  assert.equal(requiresSpecialAdmissionReview("class-12", "2026-06-01"), true);
  assert.equal(requiresSpecialAdmissionReview("class-9", "2026-09-01"), true);
  assert.equal(requiresSpecialAdmissionReview("class-9", "2026-08-31"), false);
  assert.equal(parentFacingStatus("internal_risk_hold"), "Review in progress");
});
