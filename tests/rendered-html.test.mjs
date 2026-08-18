import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/", headers = { accept: "text/html" }, redirect = "follow") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers,
      redirect,
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
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

test("server-renders the current SSKEMS website foundation", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const title = textContent(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  assert.match(title, /SSKEMS/i);
  assert.match(title, /Shree Samarth Krupa/i);

  const anchors = anchorsIn(html);
  assert.ok(
    anchors.some(
      (anchor) =>
        anchor.href === "#main-content" &&
        /skip to main content/i.test(anchor.text),
    ),
    "The page must start with a usable skip-to-content link",
  );
  assert.match(html, /<main\b[^>]*\bid=["']main-content["']/i);

  assert.match(html, /<nav\b[^>]*\baria-label=["']Utility navigation["']/i);
  assert.match(html, /<nav\b[^>]*\baria-label=["']Primary navigation["']/i);
  assert.doesNotMatch(html, /<nav\b[^>]*\baria-label=["']Breadcrumb["']/i);
  assert.match(html, /<footer\b/i);

  assert.ok(
    anchors.some(
      (anchor) =>
        anchor.href === "/mandatory-public-disclosure" &&
        /mandatory public disclosure/i.test(anchor.text),
    ),
    "Mandatory Public Disclosure must be one direct link away",
  );
  assert.ok(
    anchors.some(
      (anchor) =>
        anchor.href === "/admissions/enquire" && /enquire/i.test(anchor.text),
    ),
    "Enquire Now must be one direct link away",
  );

  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1, "The page must have one h1");
  assert.match(html, /data-motion-component=["']home-hero["']/i);
  assert.match(html, /data-motion-component=["']home-campus["']/i);
  assert.match(html, /data-motion-component=["']home-achievements["']/i);
  assert.match(textContent(html), /Here, possibility begins\./i);
  assert.match(textContent(html), /Admissions information for 2026–27 is being verified\./i);
  assert.doesNotMatch(html, /class=["']home-events["']/i);
  assert.match(html, /data-publication-review=["']required["']/i);
  assert.doesNotMatch(html, /style=["'][^"']*(?:opacity\s*:\s*0|visibility\s*:\s*hidden)/i);
  assert.doesNotMatch(
    html,
    /codex-preview|_sites-preview|SkeletonPreview|react-loading-skeleton|Building your site|Your site is taking shape/i,
  );
});

test("server-renders admissions motion in its readable final state", async () => {
  const response = await render("/admissions");
  assert.equal(response.status, 200);

  const html = await response.text();
  const readableText = textContent(html);
  const anchors = anchorsIn(html);

  assert.match(html, /data-motion-component=["']admissions-hero["']/i);
  assert.match(html, /data-motion-component=["']admissions-steps["']/i);
  assert.match(readableText, /Admissions, made clearer\./i);
  assert.match(readableText, /Know what comes next\./i);
  assert.ok(anchors.some((anchor) => anchor.href === "/admissions/enquire"));
  assert.ok(anchors.some((anchor) => anchor.href === "/admissions/application-status"));
  assert.match(html, /Primary navigation without JavaScript/i);
  assert.match(html, /class=["']static-navigation-fallback["']/i);
  assert.match(html, /<nav\b[^>]*\baria-label=["']Breadcrumb["']/i);
  assert.doesNotMatch(html, /style=["'][^"']*(?:opacity\s*:\s*0|visibility\s*:\s*hidden)/i);
});

test("server-renders the private publication approval queue from the manifest", async () => {
  const response = await render("/publication-review?kind=media&decision=review-required");
  assert.equal(response.status, 200);

  const html = await response.text();
  const readableText = textContent(html);

  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1);
  assert.match(readableText, /Owner-only publication control/i);
  assert.match(readableText, /Approval queue/i);
  assert.match(readableText, /Public release Blocked 4 of 6 launch gates remain blocked\./i);
  assert.match(readableText, /Composite launch gate/i);
  assert.match(readableText, /One result across every release dependency\./i);
  assert.match(readableText, /Publication approvals Blocked 0 of 33/i);
  assert.match(readableText, /Campus media Blocked 0 of 4/i);
  assert.match(readableText, /Appendix IX documents Blocked 0 of 12/i);
  assert.match(readableText, /Homepage media budget Blocked 4 of 5/i);
  assert.match(readableText, /Legacy route cutover Ready 35 of 35/i);
  assert.match(readableText, /Review-only treatment Ready 1 of 1/i);
  assert.match(readableText, /Achievement activation 0 of 4 bound 0 approval pair/i);
  assert.match(readableText, /33 governed records/i);
  assert.match(readableText, /Approve the four campus photographs first\./i);
  assert.match(readableText, /Guarded update: after independent review, generate the unfilled request/i);
  assert.match(readableText, /Template generation does not approve the record\./i);
  assert.match(readableText, /Download unfilled request/i);
  assert.match(html, /href=["']\/publication-review\/approval-request\/media-campus-main["']/i);
  assert.match(readableText, /Approved masters become responsive, privacy-clean assets\./i);
  assert.match(readableText, /AVIF · WebP · JPEG/i);
  assert.match(readableText, /Hero transfer/i);
  assert.match(readableText, /1\.38 MiB \/ 390\.6 KiB/i);
  assert.match(readableText, /Poster optimization Pixel-exact staging/i);
  assert.match(readableText, /Decision binding 0 of 1 bound/i);
  assert.match(readableText, /npm run poster:inspect/i);
  assert.match(readableText, /npm run poster:decision-plan/i);
  assert.match(readableText, /npm run poster:decision-record/i);
  assert.match(readableText, /Every default mode is read-only/i);
  assert.match(readableText, /Complete decision worksheet/i);
  assert.match(readableText, /pixel-identical lossless candidate/i);
  assert.match(readableText, /separate approved art-direction decision/i);
  assert.match(readableText, /Media release Blocked/i);
  assert.match(readableText, /2 media performance blocker\(s\) remain\./i);
  assert.match(readableText, /Exact activation 0 of 12 bound/i);
  assert.match(readableText, /Only a receipt-matched, hash-verified PDF becomes downloadable\./i);
  assert.match(readableText, /Showing 5 of 33 records\./i);
  assert.match(html, /media-campus-main/);
  assert.match(html, /media-campus-grounds/);
  assert.match(html, /media-campus-entrance/);
  assert.match(html, /media-campus-courtyard/);
  assert.match(html, /href=["']\/publication-review\/export["']/i);
  assert.match(html, /href=["']\/publication-review\/campus-media-packet["']/i);
  assert.match(html, /href=["']\/publication-review\/poster-delivery-decision["']/i);
  assert.match(html, /href=["']\/publication-review\/poster-delivery-decision-workspace["']/i);
  assert.match(readableText, /completed requests and approver identities outside the website/i);
  assert.match(readableText, /Evidence stays in the school’s controlled system\./i);
  assert.match(readableText, /Editorial CMS/i);
  assert.match(readableText, /Sanity delivery status/i);
  assert.match(readableText, /Ready for connection/i);
  assert.match(readableText, /Applicant records, pupil data, controlled documents, consent evidence and approver identities never enter this CMS\./i);
  assert.match(readableText, /Legacy cutover/i);
  assert.match(readableText, /Old WordPress links now have a controlled destination\./i);
  assert.match(readableText, /35 Captured 2026-08-16/i);
  assert.match(readableText, /33 Mapped directly to final modern routes\./i);
  assert.match(html, /href=["']\/publication-review\/cutover-export["']/i);
  assert.doesNotMatch(html, /style=["'][^"']*(?:opacity\s*:\s*0|visibility\s*:\s*hidden)/i);
});

test("server-renders the authenticated poster decision worksheet without a preselected scope", async () => {
  const authentication = {
    accept: "text/html",
    "oai-authenticated-user-id": "reviewer-test-id",
    "oai-authenticated-user-email": "reviewer@example.test",
  };
  const response = await render("/publication-review/poster-delivery-decision-workspace", authentication);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const readableText = textContent(html);
  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1);
  assert.match(readableText, /Poster delivery decision/i);
  assert.match(readableText, /No option is preselected/i);
  assert.match(readableText, /The worksheet downloads a file; it stores nothing\./i);
  assert.match(html, /<form\b[^>]*class=["'][^"']*poster-decision-form[^"']*["']/i);
  assert.doesNotMatch(html, /<form\b[^>]*\baction=/i);
  assert.equal((html.match(/<input\b[^>]*type=["']radio["'][^>]*name=["']selectedOption["']/gi) ?? []).length, 4);
  assert.doesNotMatch(html, /<input\b[^>]*type=["']radio["'][^>]*\bchecked(?:=|\s|>)/i);
  assert.match(html, /name=["']decisionConfirmation["']/i);
  assert.doesNotMatch(html, /reviewer@example\.test/i);
});

test("server-renders a digest-bound approval workspace without preselected decisions", async () => {
  const authentication = {
    accept: "text/html",
    "oai-authenticated-user-id": "reviewer-test-id",
    "oai-authenticated-user-email": "reviewer@example.test",
  };
  const response = await render("/publication-review/approval-request-workspace/media-campus-main", authentication);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const readableText = textContent(html);
  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1);
  assert.match(readableText, /Complete approval request/i);
  assert.match(readableText, /Main campus exterior/i);
  assert.match(readableText, /The worksheet downloads a file; it stores nothing\./i);
  assert.match(readableText, /Nothing is preselected/i);
  assert.match(html, /<form\b[^>]*class=["'][^"']*approval-workspace-form[^"']*["']/i);
  assert.doesNotMatch(html, /<form\b[^>]*\baction=/i);
  assert.equal((html.match(/<select\b[^>]*name=["']check:/gi) ?? []).length, 4);
  assert.doesNotMatch(html, /<option\b[^>]*value=["'](?:verified|not-applicable)["'][^>]*\bselected/i);
  assert.doesNotMatch(html, /<input\b[^>]*type=["']radio["'][^>]*\bchecked(?:=|\s|>)/i);
  assert.match(html, /name=["']approvalConfirmation["']/i);
  assert.doesNotMatch(html, /reviewer@example\.test/i);
});

test("serves exact unfilled approval requests only to authenticated private reviewers", async () => {
  const pathname = "/publication-review/approval-request/media-campus-main";
  const anonymous = await render(pathname, { accept: "application/json" });
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers.get("cache-control") ?? "", /private, no-store/i);

  const authentication = {
    accept: "application/json",
    "oai-authenticated-user-id": "reviewer-test-id",
    "oai-authenticated-user-email": "reviewer@example.test",
  };
  const response = await render(pathname, authentication);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  assert.match(response.headers.get("cache-control") ?? "", /private, no-store/i);
  assert.match(response.headers.get("content-disposition") ?? "", /sskem-approval-request-media-campus-main-2026-08-10\.json/i);
  assert.equal(response.headers.get("content-security-policy"), "default-src 'none'; sandbox");

  const request = JSON.parse(await response.text());
  assert.equal(request.recordId, "media-campus-main");
  assert.ok(Object.values(request.checks).every((state) => state === null));
  assert.deepEqual(request.evidenceReferences, []);
  assert.equal(request.approvedByRole, null);
  assert.equal(request.approvedAt, null);
  assert.doesNotMatch(JSON.stringify(request), /reviewer@example\.test|sourcePointer|publicTargets/i);

  const unknown = await render("/publication-review/approval-request/media-not-canonical", authentication);
  assert.equal(unknown.status, 404);
  assert.match(unknown.headers.get("cache-control") ?? "", /private, no-store/i);

  const posterPath = "/publication-review/poster-delivery-decision";
  const anonymousPoster = await render(posterPath, { accept: "application/json" });
  assert.equal(anonymousPoster.status, 401);
  assert.match(anonymousPoster.headers.get("cache-control") ?? "", /private, no-store/i);

  const posterResponse = await render(posterPath, authentication);
  assert.equal(posterResponse.status, 200);
  assert.match(posterResponse.headers.get("content-type") ?? "", /^application\/json\b/i);
  assert.match(posterResponse.headers.get("cache-control") ?? "", /private, no-store/i);
  assert.match(posterResponse.headers.get("content-disposition") ?? "", /sskem-homepage-poster-delivery-decision-\d{4}-\d{2}-\d{2}\.json/i);
  assert.equal(posterResponse.headers.get("content-security-policy"), "default-src 'none'; sandbox");

  const posterPacket = JSON.parse(await posterResponse.text());
  assert.equal(posterPacket.status, "decision-required");
  assert.equal(posterPacket.requestTemplate.selectedOption, null);
  assert.ok(Object.values(posterPacket.requestTemplate.acknowledgements).every((state) => state === null));
  assert.equal(posterPacket.guardrails.approvalGrantedByPacket, false);
  assert.doesNotMatch(JSON.stringify(posterPacket), /reviewer@example\.test|sourcePointer|publicTargets/i);
});

test("exports the owner-only approval worksheet without private evidence", async () => {
  const response = await render("/publication-review/export", { accept: "text/csv" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/csv\b/i);
  assert.match(response.headers.get("cache-control") ?? "", /private, no-store/i);
  assert.match(response.headers.get("content-disposition") ?? "", /sskem-publication-approval-queue-2026-08-10\.csv/i);

  const csv = await response.text();
  const rows = csv.trim().split(/\r?\n/);
  assert.equal(rows.length, 34, "Worksheet must contain one header and 33 manifest rows");
  assert.match(rows[0], /^record_id,kind,title,decision,check_profile/);
  assert.match(csv, /media-campus-main,media,Main campus exterior,review-required/);
  assert.match(csv, /document-mpd-c-4,document,Parent Teacher Association list,blocked/);
  assert.doesNotMatch(csv, /[a-z]:\\|file:\/\//i);
  assert.doesNotMatch(csv, /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i);
});

test("serves every inventoried legacy route without redirect chains", async () => {
  const inventory = JSON.parse(await readFile(new URL("../content/legacy-cutover-inventory.json", import.meta.url), "utf8"));
  const destinationStatuses = new Map();

  for (const record of inventory.records) {
    const response = await render(record.legacyPath, { accept: "text/html" }, "manual");
    if (record.disposition === "retain") {
      assert.equal(response.status, 200, `${record.legacyPath} must remain directly available`);
      continue;
    }

    assert.ok([301, 308].includes(response.status), `${record.legacyPath} must permanently redirect, received ${response.status}`);
    const location = response.headers.get("location");
    assert.ok(location, `${record.legacyPath} must include a Location header`);
    const destination = new URL(location, "http://localhost");
    assert.equal(destination.pathname.replace(/\/$/, "") || "/", record.targetPath);

    if (!destinationStatuses.has(record.targetPath)) {
      destinationStatuses.set(record.targetPath, (await render(record.targetPath)).status);
    }
    assert.equal(destinationStatuses.get(record.targetPath), 200, `${record.targetPath} must resolve directly`);
  }
});

test("exports the owner-only legacy cutover worksheet", async () => {
  const response = await render("/publication-review/cutover-export", { accept: "text/csv" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/csv\b/i);
  assert.match(response.headers.get("cache-control") ?? "", /private, no-store/i);
  assert.match(response.headers.get("content-disposition") ?? "", /sskem-legacy-cutover-2026-08-16\.csv/i);

  const csv = await response.text();
  const rows = csv.trim().split(/\r?\n/);
  assert.equal(rows.length, 36, "Worksheet must contain one header and 35 route rows");
  assert.match(rows[0], /^"id","title","legacyPath","disposition","targetPath"/);
  assert.match(csv, /"legacy-gallery-2026","Gallery 2026","\/gallery-2026","redirect","\/student-life\/gallery"/);
  assert.match(csv, /"legacy-contact","Contact","\/contact","retain","\/contact"/);
  assert.doesNotMatch(csv, /[a-z]:\\|file:\/\//i);
  assert.doesNotMatch(csv, /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i);
});
