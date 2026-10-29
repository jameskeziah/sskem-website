import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function file(path) {
  return readFile(new URL(path, root), "utf8");
}

/** SARAS import arrays are emitted as JSON literals followed by 'as const'. */
function sourceArray(source, exportName) {
  const prefix = `export const ${exportName} = `;
  const start = source.indexOf(prefix);
  assert.notEqual(start, -1, `Missing SARAS export: ${exportName}`);
  const contentStart = start + prefix.length;
  const end = source.indexOf(" as const;", contentStart);
  assert.notEqual(end, -1, `Missing SARAS export terminator: ${exportName}`);
  return JSON.parse(source.slice(contentStart, end));
}

test("retains all eight Section B and five Section C SARAS legacy references without activating PDFs", async () => {
  const [source, bindings] = await Promise.all([
    file("app/data/saras7-disclosure.ts"),
    file("content/public-document-publication-bindings.json"),
  ]);
  for (const [name, count] of [["saras7SectionBDocuments", 8], ["saras7SectionCDocuments", 5]]) {
    const refs = sourceArray(source, name);
    assert.equal(refs.length, count);
    refs.forEach((ref, i) => {
      assert.equal(ref.row, i + 1);
      assert.match(ref.sourceUrl, /^https:\/\/www\.sskemschool\.com\/wp-content\/uploads\/20\d{2}\//);
      assert.match(ref.sourceUrl, /\.pdf$/i);
    });
  }
  assert.deepEqual(JSON.parse(bindings).bindings, [], "Original URLs must not bypass approved-document activation");
});

test("reproduces the 2026 result rows exactly as stated in SARAS", async () => {
  const src = await file("app/data/saras7-disclosure.ts");
  const results = sourceArray(src, "saras7Results");
  assert.deepEqual(results.map(({ classLevel, year, registered, passed, reportedPercentage }) =>
    [classLevel, year, registered, passed, reportedPercentage]), [
      ["Class X", "2026", 18, 17, "94.44"],
      ["Class XII", "2026", 28, 26, "92.85"],
    ]);
});

test("keeps complete personnel roster and highlights unreconciled teacher counts", async () => {
  const [src, disclosure, page, staffPage] = await Promise.all([
    file("app/data/saras7-disclosure.ts"),
    file("app/data/disclosure.ts"),
    file("app/mandatory-public-disclosure/page.tsx"),
    file("app/mandatory-public-disclosure/teaching-staff/page.tsx"),
  ]);
  const staff = sourceArray(src, "saras7Staff");
  assert.equal(staff.length, 58);
  assert.deepEqual(staff.map(({ number }) => number), Array.from({ length: 58 }, (_, index) => index + 1));
  const count = (designation) => staff.filter((row) => row.designation === designation).length;
  assert.equal(count("PRT"), 13);
  assert.equal(count("WELLNESS TEACHER"), 3);
  assert.equal(count("OTHER"), 10);
  assert.match(disclosure, /detailed Section F list contains 13 PRT/);
  assert.match(disclosure, /detailed Section F list contains 3 WELLNESS TEACHER/);
  assert.match(page, /section-f-title/);
  assert.match(staffPage, /saras7Staff\.map/);
  assert.match(staffPage, /School sign-off required/);
});

test("preserves SARAS source caveats and inspection reference", async () => {
  const [src, page, infrastructure] = await Promise.all([
    file("app/data/saras7-disclosure.ts"),
    file("app/mandatory-public-disclosure/page.tsx"),
    file("app/mandatory-public-disclosure/infrastructure-inspection/page.tsx"),
  ]);
  const facts = sourceArray(src, "saras7GeneralInformation");
  assert.equal(facts.find(({ label }) => label === "Contact number")?.value, "7219819805");
  assert.match(src, /76KJnCZviLk/);
  assert.match(page, /document-approval workflow/);
  assert.match(infrastructure, /inspection date/);
  assert.match(page, /92\.86%/);
});
