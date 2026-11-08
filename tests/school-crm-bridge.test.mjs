import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("school CRM bridge is disabled by default and keeps the shared key server-side", async () => {
  const [siteEnv, api, form, crmDoc] = await Promise.all([
    source(".env.example"),
    source("app/api/admissions/enquiry/route.ts"),
    source("components/admissions-forms.tsx"),
    source("docs/SSKEMS-CRM-BRIDGE.md"),
  ]);
  assert.match(siteEnv, /ADMISSIONS_ENQUIRY_ENABLED=false/);
  assert.match(siteEnv, /NEXT_PUBLIC_ADMISSIONS_ENQUIRY_ENABLED=false/);
  assert.match(api, /process\.env\.ADMISSIONS_ENQUIRY_ENABLED\s*!==\s*"true"/);
  assert.match(api, /process\.env\.SSKEMS_CRM_BRIDGE_KEY/);
  assert.doesNotMatch(form, /SSKEMS_CRM_BRIDGE_KEY|TURNSTILE_SECRET_KEY/);
  assert.match(form, /NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
  assert.match(crmDoc, /Formal admission applications/i);
});

test("enquiry validates consent and Turnstile before forwarding to CRM", async () => {
  const [api, form] = await Promise.all([
    source("app/api/admissions/enquiry/route.ts"),
    source("components/admissions-forms.tsx"),
  ]);
  assert.match(api, /data\.contactConsent\s*!==\s*true/);
  assert.match(api, /turnstile\/v0\/siteverify/);
  assert.match(api, /integrations\/school\/enquiry/);
  assert.match(api, /"Cache-Control": "no-store"/);
  assert.match(api, /upstream\.status === 409/);
  for (const field of ["studentName", "parentName", "mobile", "classSought", "academicYear", "enquiryTopic"]) {
    assert.match(form, new RegExp(field), `Missing school form field: ${field}`);
  }
});
