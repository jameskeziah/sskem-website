import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
    workerUrl.searchParams.set("stage2-test", `${process.pid}-${Date.now()}`);
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

function textContent(markup) {
  return markup
    .replace(/<!--.*?-->/gs, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
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

function withoutScripts(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
}

function anchorsIn(html) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(
    ([, attributes, content]) => ({
      href: attributes.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? "",
      text: textContent(content),
      attributes,
    }),
  );
}

function headingTexts(html) {
  return [...withoutScripts(html).matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)].map(
    ([, content]) => textContent(content),
  );
}

function tableHeaders(table) {
  return [...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(([, value]) =>
    textContent(value),
  );
}

async function assertPublicHtml(pathname) {
  const response = await request(pathname);
  assert.equal(response.status, 200, `${pathname} must be publicly reachable`);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("www-authenticate"), null);
  assert.equal(response.headers.get("set-cookie"), null);
  const html = await response.text();
  assert.doesNotMatch(html, /<form\b[^>]*\baction=["'][^"']*(?:login|sign-in)/i);
  assert.doesNotMatch(html, /captcha/i);
  return html;
}

test("serves the Stage 2 disclosure and archive routes without authentication", async () => {
  const routes = [
    "/mandatory-public-disclosure",
    "/mandatory-public-disclosure/teaching-staff",
    "/mandatory-public-disclosure/infrastructure-inspection",
    "/documents",
    "/documents/archive",
    "/documents/safety-certificates",
    "/documents/building-safety-certificate",
    "/documents/building-safety-certificate/versions",
  ];

  for (const route of routes) {
    const html = await assertPublicHtml(route);
    assert.match(html, /<main\b[^>]*\bid=["']main-content["']/i);
    assert.match(html, /<a\b[^>]*\bhref=["']#main-content["'][^>]*>\s*Skip to main content\s*<\/a>/i);
  }
});

test("renders the five revised Appendix IX sections in the prescribed order", async () => {
  const html = await assertPublicHtml("/mandatory-public-disclosure");
  const headings = headingTexts(html);
  const prescribed = [
    "General information",
    "Documents and information",
    "Results and academics",
    "Teaching staff",
    "School infrastructure",
  ];

  const positions = prescribed.map((expected) =>
    headings.findIndex((heading) => heading.toLowerCase().includes(expected.toLowerCase())),
  );
  assert.ok(positions.every((position) => position >= 0), `Missing Appendix IX heading: ${prescribed[positions.indexOf(-1)] ?? "unknown"}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);

  const visibleHtml = withoutScripts(html);
  assert.match(visibleHtml, /Appendix IX\s*[–—-]\s*Revised Format/i);
  assert.match(visibleHtml, /<table\b/i, "The HTML disclosure must not be replaced by a PDF-only interface");
  assert.match(visibleHtml, /Report a broken document/i);
  assert.doesNotMatch(visibleHtml, /<iframe\b[^>]*\.pdf/i);
});

test("uses the exact Mandatory Public Disclosure navigation label everywhere", async () => {
  const [navigation, header, footer, homepage] = await Promise.all([
    source("app/data/navigation.ts"),
    source("components/site-header.tsx"),
    source("components/site-footer.tsx"),
    assertPublicHtml("/"),
  ]);

  assert.match(
    navigation,
    /label:\s*["']Mandatory Public Disclosure["']\s*,\s*href:\s*["']\/mandatory-public-disclosure["']/,
  );
  assert.doesNotMatch(navigation, /label:\s*["'](?:SARAS|OASIS)["']/i);
  assert.match(header, /utilityNavigation\.map/);
  assert.match(header, /aria-label=["']Mobile primary navigation["']/);
  assert.match(footer, /Compliance and Documents/i);

  const matchingHomepageLinks = anchorsIn(withoutScripts(homepage)).filter(
    (anchor) =>
      anchor.href === "/mandatory-public-disclosure" &&
      anchor.text === "Mandatory Public Disclosure",
  );
  assert.ok(matchingHomepageLinks.length >= 1, "The homepage needs an exact-label compliance shortcut");
});

test("server-renders archive search, filters, sorting, taxonomy, and document metadata", async () => {
  const [html, documentsSource] = await Promise.all([
    assertPublicHtml("/documents"),
    source("app/data/documents.ts"),
  ]);
  const serverHtml = withoutScripts(html);
  const visibleText = textContent(serverHtml);

  const searchForm = serverHtml.match(/<form\b[^>]*>[\s\S]*?<\/form>/i)?.[0] ?? "";
  assert.notEqual(searchForm, "", "The archive must expose a native HTML search/filter form");
  assert.match(searchForm, /\bmethod=["']get["']/i);
  assert.match(searchForm, /<(?:input|select)\b[^>]*\bname=["'][^"']+["']/i);

  for (const label of [
    "Keyword",
    "Document category",
    "Academic year",
    "Publication year",
    "Status",
    "Institution",
    "Language",
    "Issuing authority",
  ]) {
    assert.match(visibleText, new RegExp(`\\b${label.replace(" ", "\\s+")}\\b`, "i"), `${label} filter must be visible`);
  }
  for (const option of [
    "Newest first",
    "Oldest first",
    "Title A–Z",
    "Expiry date",
    "Recently updated",
  ]) {
    assert.ok(visibleText.includes(option), `${option} sort option must be server-rendered`);
  }

  const controlledCategories = [
    "Mandatory Public Disclosure",
    "Affiliation and Recognition",
    "Safety and Statutory Certificates",
    "Academic Calendars",
    "Fee Structures",
    "Board Results",
    "Policies",
    "Circulars and Notices",
    "Admission Documents",
    "Forms and Applications",
    "School Management Committee",
    "Parent Teacher Association",
    "Annual Reports",
    "Prescribed Books and Declarations",
    "Prospectuses and Handbooks",
  ];
  for (const category of controlledCategories) {
    assert.ok(documentsSource.includes(category), `Controlled category missing: ${category}`);
  }

  for (const field of [
    /category/i,
    /academic[_A-Z]?year/i,
    /issue[_A-Z]?date/i,
    /expiry[_A-Z]?date/i,
    /status/i,
    /language/i,
    /file[_A-Z]?type/i,
    /file[_A-Z]?size/i,
    /last[_A-Z]?reviewed/i,
  ]) {
    assert.match(documentsSource, field);
  }
  assert.match(serverHtml, /href=["']\/documents\/archive["']/i);
});

test("keeps public staff data minimal and missing compliance records explicit", async () => {
  const [mpdHtml, staffHtml] = await Promise.all([
    assertPublicHtml("/mandatory-public-disclosure"),
    assertPublicHtml("/mandatory-public-disclosure/teaching-staff"),
  ]);
  const publicMpd = withoutScripts(mpdHtml);
  const publicStaff = withoutScripts(staffHtml);
  const staffTable = [...publicStaff.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)]
    .map(([table]) => table)
    .find((table) => /Designation/i.test(table) && /Qualification/i.test(table));

  assert.ok(staffTable, "The teaching-staff route must expose a semantic public staff table");
  const headers = tableHeaders(staffTable);
  for (const required of ["Name", "Designation", "Qualification", "Staff category"]) {
    assert.ok(headers.some((header) => header.toLowerCase() === required.toLowerCase()), `Missing staff column: ${required}`);
  }
  for (const forbidden of [
    "Personal phone number",
    "Residential address",
    "Aadhaar number",
    "PAN",
    "Date of birth",
    "Salary",
    "Bank account",
    "Signature",
    "Personal email address",
  ]) {
    assert.ok(!headers.some((header) => header.toLowerCase() === forbidden.toLowerCase()), `Private staff column exposed: ${forbidden}`);
  }
  assert.doesNotMatch(staffTable, /href=["'](?:tel:|mailto:)/i);

  const mpdText = textContent(publicMpd);
  assert.doesNotMatch(mpdText, /\bNot available\b/i, "Missing mandatory records need an explicit compliance state");
  assert.match(mpdText, /pending|verification|required|compliance warning/i);
  assert.doesNotMatch(mpdText, /31\s*(?:March\s*)?2022|31[/. -]03[/. -]2022/i);

  for (const anchor of anchorsIn(publicMpd)) {
    assert.notEqual(anchor.href, "#", `Placeholder link exposed for ${anchor.text || "unnamed action"}`);
    assert.doesNotMatch(anchor.href, /private|private_original/i);
    assert.doesNotMatch(anchor.href, /[?&](?:token|signature|expires)=/i);
  }
});

test("declares and serves permanent legacy disclosure redirects", async () => {
  for (const legacyPath of ["/appendix-ix", "/saras"]) {
    const response = await request(legacyPath);
    assert.ok([301, 308].includes(response.status), `Expected a permanent redirect for ${legacyPath}, received ${response.status}`);

    const location = response.headers.get("location");
    assert.ok(location, `${legacyPath} must include a Location header`);
    const destination = new URL(location, "http://localhost");
    assert.equal(destination.pathname.replace(/\/$/, ""), "/mandatory-public-disclosure");

    const destinationResponse = await request(destination.pathname);
    assert.equal(destinationResponse.status, 200, "The redirect destination must resolve directly");
  }
});

test("essential disclosure and archive content works without client JavaScript", async () => {
  const [mpdHtml, archiveHtml] = await Promise.all([
    assertPublicHtml("/mandatory-public-disclosure"),
    assertPublicHtml("/documents"),
  ]);
  const mpdWithoutScripts = withoutScripts(mpdHtml);
  const archiveWithoutScripts = withoutScripts(archiveHtml);

  assert.match(mpdWithoutScripts, /<h1\b[^>]*>[\s\S]*Mandatory Public Disclosure[\s\S]*<\/h1>/i);
  assert.match(mpdWithoutScripts, /<table\b/i);
  assert.ok(
    anchorsIn(mpdWithoutScripts).some((anchor) => /report a broken document/i.test(anchor.text)),
    "Broken-document reporting must be a normal server-rendered link",
  );

  assert.match(archiveWithoutScripts, /<h1\b[^>]*>[\s\S]*Document(?:s| archive)[\s\S]*<\/h1>/i);
  assert.match(archiveWithoutScripts, /<form\b[^>]*\bmethod=["']get["']/i);
  assert.match(archiveWithoutScripts, /<a\b[^>]*\bhref=["']\/mandatory-public-disclosure["']/i);
  assert.doesNotMatch(archiveWithoutScripts, /javascript:/i);
});
