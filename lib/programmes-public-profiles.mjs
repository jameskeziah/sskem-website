import { readFile } from "node:fs/promises";

import { isOpaqueEvidenceReference, validateApprovalManifest } from "./approval-manifest.mjs";

export const programmesPublicProfilesUrl = new URL("../content/programmes-public-profiles.json", import.meta.url);

const routeModel = new Map([
  ["/school/academics", { id: "cbse-school", organisationType: "cbse-school" }],
  ["/junior-college", { id: "junior-college", organisationType: "junior-college" }],
  ["/programmes/jee-neet", { id: "neet-institute", organisationType: "institute" }],
]);
const exactProfileKeys = [
  "id", "route", "organisationId", "organisationType", "displayName", "navigationLabel", "eyebrow", "title",
  "summary", "publicationNote", "facts", "groups", "withheldSections", "evidenceReferences", "claimRecordIds", "seo", "validUntil",
];
const exactRootKeys = ["$schema", "schemaVersion", "profileSetId", "approvalReference", "publishedOn", "profiles"];
const exactSeoKeys = ["title", "description", "canonicalPath"];

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected) {
  return object(value) && Object.keys(value).length === expected.length && expected.every((key) => key in value);
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function uniqueNonemptyStrings(values) {
  return Array.isArray(values) && values.length > 0 && new Set(values).size === values.length
    && values.every((value) => typeof value === "string" && value.trim().length > 0);
}

export async function loadProgrammesPublicProfiles() {
  return JSON.parse(await readFile(programmesPublicProfilesUrl, "utf8"));
}

export function validateProgrammesPublicProfiles(profileSet, manifest, now = new Date()) {
  const issues = [];
  const add = (path, message) => issues.push({ path, message });
  const today = now.toISOString().slice(0, 10);

  if (!exactKeys(profileSet, exactRootKeys)) {
    add("$", "Profile set requires the exact versioned root fields.");
    return issues;
  }
  if (profileSet.$schema !== "./programmes-public-profiles.schema.json" || profileSet.schemaVersion !== 1) add("$", "Unsupported profile schema.");
  if (!isOpaqueEvidenceReference(profileSet.approvalReference)) add("approvalReference", "Approval reference must be opaque.");
  if (!validDate(profileSet.publishedOn) || profileSet.publishedOn > today) add("publishedOn", "Published date must be valid and not in the future.");
  if (!Array.isArray(profileSet.profiles) || profileSet.profiles.length !== routeModel.size) add("profiles", "Exactly one public profile is required for each governed route.");

  const manifestIssues = validateApprovalManifest(manifest);
  if (manifestIssues.length) add("manifest", `Approval manifest is invalid: ${manifestIssues[0].path}.`);
  const manifestRecords = new Map(Array.isArray(manifest?.records) ? manifest.records.map((record) => [record.id, record]) : []);
  const seenRoutes = new Set();
  const seenIds = new Set();

  for (const [index, profile] of (Array.isArray(profileSet.profiles) ? profileSet.profiles : []).entries()) {
    const path = `profiles[${index}]`;
    if (!exactKeys(profile, exactProfileKeys)) {
      add(path, "Profile contains missing or unknown fields.");
      continue;
    }
    const model = routeModel.get(profile.route);
    if (!model || profile.id !== model.id || profile.organisationType !== model.organisationType) add(path, "Route, profile ID and organisation type are incompatible.");
    if (seenRoutes.has(profile.route)) add(`${path}.route`, "Profile routes must be unique.");
    if (seenIds.has(profile.id)) add(`${path}.id`, "Profile IDs must be unique.");
    seenRoutes.add(profile.route);
    seenIds.add(profile.id);
    if (profile.seo?.canonicalPath !== profile.route || !exactKeys(profile.seo, exactSeoKeys)) add(`${path}.seo`, "SEO metadata must use the exact canonical route and fields.");
    if (!Array.isArray(profile.facts) || profile.facts.length === 0 || profile.facts.some((fact) => !exactKeys(fact, ["label", "value"]))) add(`${path}.facts`, "At least one exact labelled fact is required.");
    if (!Array.isArray(profile.groups) || profile.groups.some((group) => !exactKeys(group, ["title", "description", "items"]) || !uniqueNonemptyStrings(group.items))) add(`${path}.groups`, "Groups must contain exact fields and non-empty unique items.");
    if (!uniqueNonemptyStrings(profile.withheldSections)) add(`${path}.withheldSections`, "Withheld sections must be explicit and unique.");
    if (!uniqueNonemptyStrings(profile.evidenceReferences) || profile.evidenceReferences.some((reference) => !isOpaqueEvidenceReference(reference))) add(`${path}.evidenceReferences`, "Evidence references must be opaque and non-empty.");
    if (!uniqueNonemptyStrings(profile.claimRecordIds) || profile.claimRecordIds.some((id) => !/^claim-[a-z0-9-]+$/.test(id))) add(`${path}.claimRecordIds`, "Claim record IDs must be unique claim IDs.");
    if (profile.validUntil !== null && (!validDate(profile.validUntil) || profile.validUntil < today)) add(`${path}.validUntil`, "Expired public profiles are rejected.");

    const publicCopy = JSON.stringify({
      displayName: profile.displayName,
      navigationLabel: profile.navigationLabel,
      eyebrow: profile.eyebrow,
      title: profile.title,
      summary: profile.summary,
      facts: profile.facts,
      groups: profile.groups,
      seo: { title: profile.seo?.title, description: profile.seo?.description },
    });
    if (/31\/03\/2022|Affiliated up to 31/i.test(publicCopy)) add(path, "Stale affiliation wording is prohibited.");
    if (profile.route === "/junior-college" && /\bArts\b|current(?:ly)?[^.]{0,30}\bCommerce\b/i.test(publicCopy)) add(path, "Unverified Junior College stream claims are prohibited.");
    if (profile.route === "/junior-college" && !profile.facts.some((fact) => fact.label === "College No." && fact.value === "25.04.028")) add(path, "25.04.028 must be labelled College No.");
    if (profile.route === "/programmes/jee-neet" && /\bJEE\b/i.test(publicCopy)) add(path, "Detailed JEE claims are prohibited from the active Institute profile.");

    for (const recordId of profile.claimRecordIds) {
      const record = manifestRecords.get(recordId);
      if (!record) {
        add(`${path}.claimRecordIds`, `Missing approval record ${recordId}.`);
        continue;
      }
      if (record.decision !== "approved" || Object.values(record.checks).some((state) => state !== "verified" && state !== "not-applicable")) add(`${path}.claimRecordIds`, `${recordId} is not fully approved.`);
      if (!record.publicTargets.includes(profile.route)) add(`${path}.claimRecordIds`, `${recordId} does not target ${profile.route}.`);
      if (!record.evidenceReferences.some((reference) => profile.evidenceReferences.includes(reference))) add(`${path}.claimRecordIds`, `${recordId} is not bound to this profile evidence.`);
      if (record.expiresAt !== null && record.expiresAt < today) add(`${path}.claimRecordIds`, `${recordId} is expired.`);
    }
  }

  for (const route of routeModel.keys()) if (!seenRoutes.has(route)) add("profiles", `Missing profile for ${route}.`);
  const schoolUdise = profileSet.profiles?.find((profile) => profile.route === "/school/academics")?.facts?.find((fact) => fact.label === "UDISE code")?.value;
  const collegeUdise = profileSet.profiles?.find((profile) => profile.route === "/junior-college")?.facts?.find((fact) => fact.label === "Junior College UDISE")?.value;
  if (schoolUdise !== "27320420205" || collegeUdise !== "27320420206" || schoolUdise === collegeUdise) add("profiles", "The two regulatory entities require their distinct verified UDISE codes.");

  return issues;
}
