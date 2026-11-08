import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const load = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("CRM enquiry bridge remains opt-in and server-side", async () => {
  const [route, env, page] = await Promise.all([
    load("app/api/admissions/enquiry/route.ts"),
    load(".env.example"),
    load("app/admissions/[...section]/page.tsx"),
  ]);
  assert.match(env, /SSKEMS_CRM_ENQUIRY_ENABLED=false/);
  assert.match(route, /process\.env\.SSKEMS_CRM_ENQUIRY_ENABLED === "true"/);
  assert.match(route, /contactConsent !== true/);
  assert.match(route, /new URL\("\/api\/public\/enquiries", backend\)/);
  assert.match(route, /cache: "no-store"/);
  assert.match(route, /https:/);
  assert.match(page, /EnquiryFormPrototype\s*[\s\S]*?live=\{/);
});

test("public API response stays generic and preview retains its boundary", async () => {
  const [route, form] = await Promise.all([
    load("app/api/admissions/enquiry/route.ts"),
    load("components/admissions-forms.tsx"),
  ]);
  assert.match(route, /response\.status === 201 \|\| response\.status === 202/);
  assert.doesNotMatch(route, /return respond\(.*leadId/);
  assert.match(route, /studentName: "Not provided \(website enquiry\)"/);
  assert.match(form, /if \(!live\)/);
  assert.match(form, /Nothing was submitted, stored or sent from this preview/);
  assert.match(form, /fetch\("\/api\/admissions\/enquiry"/);
  assert.match(form, /contactConsent: fields\.has\("contactConsent"\)/);
});
