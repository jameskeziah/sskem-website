import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const guide = readFileSync(
  new URL("../components/home/homepage-family-guide.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../app/homepage-family-guide.css", import.meta.url),
  "utf8",
);

test("family guide is included in the server-rendered public homepage", () => {
  assert.match(page, /<HomepageFamilyGuide \/>/);
  assert.match(page, /import "\.\/homepage-family-guide\.css"/);
  assert.match(page, /const eventsChapter = achievementArtwork\.length \? "08" : "07"/);
  assert.match(page, /<span>07<\/span> \{privateAchievementReview \?/);
});

test("family questions are native keyboard-accessible details without JavaScript dependence", () => {
  assert.match(guide, /<details className="home-family-guide__item"/);
  assert.match(guide, /<summary>/);
  assert.match(guide, /ariaLabelledby="home-family-guide-title"/);
  assert.match(styles, /summary:focus-visible/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test("guide uses canonical school facts and only established public navigation", () => {
  assert.match(guide, /siteFacts\.affiliationNumber/);
  for (const route of [
    "/admissions/enquire",
    "/admissions/process",
    "/mandatory-public-disclosure",
    "/school/academics",
    "/contact",
  ]) {
    assert.ok(guide.includes(route), `Missing verified navigation: ${route}`);
  }
  assert.doesNotMatch(guide, /hero-drafts|HOMEPAGE_REVIEW_MODE|guardianConsent|approvalManifest/);
});
