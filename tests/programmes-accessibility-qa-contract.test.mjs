import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the private Programme accessibility and responsive QA suite wired", async () => {
  const [spec, packageText, globalStyles] = await Promise.all([
    readFile(new URL("./browser/programmes-accessibility-responsive.spec.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);

  for (const route of ["/school/academics", "/junior-college", "/programmes/jee-neet"]) {
    assert.match(spec, new RegExp(route.replaceAll("/", "\\/")), route);
  }
  assert.match(spec, /AxeBuilder/);
  assert.match(spec, /color-contrast/);
  assert.match(spec, /ariaSnapshot/);
  assert.match(spec, /Skip to main content/);
  assert.match(spec, /reducedMotion: "reduce"/);
  assert.match(spec, /javaScriptEnabled: false/);
  assert.match(spec, /\[320, 360, 768\]/);
  assert.match(spec, /200-percent browser-zoom equivalent/);
  assert.match(packageJson.scripts["test:qa:programmes"], /test:qa:programmes:review/);
  assert.match(packageJson.scripts["test:qa:programmes:review"], /programmes-accessibility-responsive\.spec\.ts/);
  assert.match(globalStyles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation-duration: 0ms !important;[\s\S]*?transition-duration: 0ms !important;/);
});

