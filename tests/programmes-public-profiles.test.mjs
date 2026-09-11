import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { loadApprovalManifest } from "../lib/approval-manifest.mjs";
import {
  loadProgrammesPublicProfiles,
  validateProgrammesPublicProfiles,
} from "../lib/programmes-public-profiles.mjs";
import { getCurrentProgrammeProfiles } from "../lib/programme-publication-window.mjs";

const NOW = new Date("2026-09-09T06:00:00.000Z");

async function fixture() {
  const [profileSet, manifest] = await Promise.all([
    loadProgrammesPublicProfiles(),
    loadApprovalManifest(),
  ]);
  return { profileSet, manifest };
}

test("accepts the exact approved public subset for all three institutional routes", async () => {
  const { profileSet, manifest } = await fixture();
  assert.deepEqual(validateProgrammesPublicProfiles(profileSet, manifest, NOW), []);
  assert.equal(profileSet.approvalReference, "APR-2026-001");
  assert.deepEqual(profileSet.profiles.map(({ route }) => route), [
    "/school/academics",
    "/junior-college",
    "/programmes/jee-neet",
  ]);

  const school = profileSet.profiles[0];
  const college = profileSet.profiles[1];
  const institute = profileSet.profiles[2];
  assert.equal(school.facts.find(({ label }) => label === "UDISE code").value, "27320420205");
  assert.equal(college.facts.find(({ label }) => label === "Junior College UDISE").value, "27320420206");
  assert.equal(college.facts.find(({ label }) => label === "College No.").value, "25.04.028");
  assert.deepEqual(college.groups[0].items, ["Science"]);
  assert.equal(institute.navigationLabel, "Institute");
  assert.equal(institute.facts.find(({ label }) => label === "Approved programme scope").value, "NEET-UG preparation");
});

test("keeps unverified promotional and time-sensitive details out of displayed profile fields", async () => {
  const { profileSet } = await fixture();
  const displayed = JSON.stringify(profileSet.profiles.map((profile) => ({
    displayName: profile.displayName,
    navigationLabel: profile.navigationLabel,
    eyebrow: profile.eyebrow,
    title: profile.title,
    summary: profile.summary,
    facts: profile.facts,
    groups: profile.groups,
    seoTitle: profile.seo.title,
    seoDescription: profile.seo.description,
  })));

  assert.doesNotMatch(displayed, /31\/03\/2022|Affiliated up to 31/i);
  assert.doesNotMatch(displayed, /\bArts\b|\bJEE\b|fee amount|result statistic|faculty name/i);
  assert.doesNotMatch(displayed, /recognition number|recognition valid/i);
  assert.match(displayed, /College No\./);
  assert.match(displayed, /Science/);
});

test("rejects stale, mutated or approval-unbound public profiles", async () => {
  const { profileSet, manifest } = await fixture();

  const expired = structuredClone(profileSet);
  expired.profiles[2].validUntil = "2026-09-08";
  assert.match(validateProgrammesPublicProfiles(expired, manifest, NOW).map(({ message }) => message).join("\n"), /Expired public profiles/i);

  const stale = structuredClone(profileSet);
  stale.profiles[0].summary = "Affiliated up to 31/03/2022";
  assert.match(validateProgrammesPublicProfiles(stale, manifest, NOW).map(({ message }) => message).join("\n"), /Stale affiliation wording/i);

  const unbound = structuredClone(manifest);
  unbound.records.find(({ id }) => id === "claim-junior-college-public-profile").decision = "blocked";
  assert.match(validateProgrammesPublicProfiles(profileSet, unbound, NOW).map(({ message }) => message).join("\n"), /not fully approved/i);
});

test("keeps the Institute visible through its approved date and removes it the next UTC day", async () => {
  const { profileSet } = await fixture();
  const onFinalApprovedDay = getCurrentProgrammeProfiles(
    profileSet.profiles,
    new Date("2026-12-01T23:59:59.999Z"),
  );
  const afterExpiry = getCurrentProgrammeProfiles(
    profileSet.profiles,
    new Date("2026-12-02T00:00:00.000Z"),
  );

  assert.deepEqual(onFinalApprovedDay.map(({ route }) => route), [
    "/school/academics",
    "/junior-college",
    "/programmes/jee-neet",
  ]);
  assert.deepEqual(afterExpiry.map(({ route }) => route), [
    "/school/academics",
    "/junior-college",
  ]);
});

test("renders only approved text slots and deliberately omits structured data and media", async () => {
  const [component, schoolRoute, collegeRoute, instituteRoute, sitemap, navigation, header, footer, provider] = await Promise.all([
    readFile(new URL("../components/programmes/public-programme-profile.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/school/academics/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/junior-college/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/programmes/jee-neet/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/navigation.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/site-header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/site-footer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/navigation/publication-navigation-provider.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(component, /data-publication-state="approved-public-subset"/);
  assert.match(component, /profile\.facts\.map/);
  assert.match(component, /profile\.groups\.map/);
  assert.doesNotMatch(component, /ProgrammeMedia|Faculty|Results|FeeSummary|StructuredData|application\/ld\+json/);
  for (const route of [schoolRoute, collegeRoute, instituteRoute]) {
    assert.match(route, /getPublicProgrammeProfile\(route\)/);
    assert.match(route, /PublicProgrammeProfilePage/);
    assert.match(route, /alternates:\s*\{ canonical:/);
    assert.match(route, /index:\s*true, follow:\s*true/);
  }
  assert.match(navigation, /getCurrentPublicProgrammeProfiles\(now\)/);
  assert.match(navigation, /profile\.navigationLabel/);
  assert.match(navigation, /export function getPublicationNavigation/);
  assert.match(sitemap, /getPublicationNavigation\(\)/);
  assert.match(sitemap, /programmeLinks\.map/);
  assert.match(header, /usePublicationNavigation\(\)/);
  assert.match(footer, /usePublicationNavigation\(\)/);
  assert.match(provider, /const current = getPublicationNavigation\(now\)/);
  assert.match(provider, /setValue\(getPublicationNavigation\(new Date\(\)\)\)/);
});
