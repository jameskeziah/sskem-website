import assert from "node:assert/strict";
import test from "node:test";

import { admissionsCycle as fallbackAdmissionsCycle } from "../app/data/admissions.ts";
import { siteFacts } from "../app/data/site.ts";
import { digestEditorialProjection } from "../lib/cms/editorial-publication-binding.ts";
import { getHomepageEditorialContent } from "../lib/cms/homepage-editorial.server.ts";

const NOW = "2026-08-12T06:00:00.000Z";
const env = { SANITY_PROJECT_ID: "sskemtest", SANITY_DATASET: "production" };

function manifest(...approvedIds) {
  return {
    records: approvedIds.map((id) => ({ id, decision: "approved", expiresAt: null })),
  };
}

function gate(approvalRecordId, overrides = {}) {
  return {
    state: "published",
    approvalRecordId,
    validFrom: "2026-08-01",
    validUntil: "2026-08-31",
    ...overrides,
  };
}

function sanityRecord(contentType, documentId, fields, revision = `rev-${documentId}`) {
  return { _id: documentId, _rev: revision, _type: contentType, ...fields };
}

async function bindingRegistry(...entries) {
  const bindings = await Promise.all(entries.map(async ({ candidate, projection }, index) => ({
    bindingId: `cms-binding-test-${index + 1}`,
    approvalRecordId: candidate.publication.approvalRecordId,
    contentType: candidate._type,
    documentId: candidate._id,
    revision: candidate._rev,
    contentDigestSha256: await digestEditorialProjection({
      contentType: candidate._type,
      documentId: candidate._id,
      revision: candidate._rev,
      projection,
    }),
    boundOn: "2026-08-12",
    ownerRole: "website-publisher",
    notes: "Test-only exact public projection receipt.",
  })));

  return {
    $schema: "./editorial-publication-bindings.schema.json",
    schemaVersion: 1,
    registryId: "sskem-editorial-publication-bindings",
    policy: {
      privateEvidenceStoredInRepository: false,
      exactRevisionRequired: true,
      exactContentDigestRequired: true,
    },
    bindings,
  };
}

function mockFetch(result) {
  return async (input, init) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://sskemtest.api.sanity.io");
    assert.equal(url.pathname, "/v2026-08-12/data/query/production");
    assert.match(url.searchParams.get("query"), /siteSettings/);
    assert.equal(init.method, "GET");
    assert.equal(init.headers.accept, "application/json");
    assert.equal(init.cache, "no-store");
    assert.equal(init.headers.authorization, undefined);
    return {
      ok: true,
      async json() {
        return { result };
      },
    };
  };
}

function emptyResult(overrides = {}) {
  return {
    contacts: [],
    notices: [],
    admissionsCycles: [],
    events: [],
    ...overrides,
  };
}

test("returns reviewed local fallbacks without making a request when Sanity is not configured", async () => {
  let requests = 0;
  const result = await getHomepageEditorialContent({
    env: {},
    fetchImpl: async () => {
      requests += 1;
      throw new Error("must not fetch");
    },
  });

  assert.equal(requests, 0);
  assert.deepEqual(result.contact, {
    location: siteFacts.location,
    phone: siteFacts.phone,
    mobile: siteFacts.mobile,
    email: siteFacts.email,
    principalEmail: siteFacts.principalEmail,
    workingHours: siteFacts.workingHours,
  });
  assert.deepEqual(result.admissionsCycle, fallbackAdmissionsCycle);
  assert.equal(result.notice, null);
  assert.deepEqual(result.events, []);
  assert.deepEqual(result.status, {
    source: "fallback",
    reason: "missing-config",
    remoteAccepted: 0,
    remoteRejected: 0,
  });
});

test("rejects an invalid Sanity API version before making a request", async () => {
  let requests = 0;
  const result = await getHomepageEditorialContent({
    env: { ...env, SANITY_API_VERSION: "latest" },
    fetchImpl: async () => {
      requests += 1;
      throw new Error("must not fetch");
    },
  });

  assert.equal(requests, 0);
  assert.equal(result.status.reason, "invalid-config");
  assert.equal(result.status.source, "fallback");
});

test("rejects records that are not approved by the publication manifest", async () => {
  const result = await getHomepageEditorialContent({
    env,
    now: NOW,
    manifest: { records: [{ id: "claim-home-notice", decision: "review-required", expiresAt: null }] },
    fetchImpl: mockFetch(emptyResult({
      notices: [{
        title: "Admissions",
        message: "Applications are open.",
        href: "/admissions",
        publication: gate("claim-home-notice"),
      }],
    })),
  });

  assert.equal(result.notice, null);
  assert.equal(result.status.reason, "no-approved-content");
  assert.equal(result.status.remoteRejected, 1);
});

test("accepts only approved records whose publication window is current", async () => {
  const notices = [
    {
      title: "Too early",
      message: "This should remain hidden.",
      publication: gate("claim-future", { validFrom: "2026-09-01", validUntil: "2026-09-30" }),
    },
    sanityRecord("announcement", "notice-current", {
      title: "Current notice",
      message: "The school office is accepting enquiries.",
      href: "/admissions/enquire",
      publication: gate("claim-current"),
    }),
  ];
  const currentProjection = {
    title: "Current notice",
    message: "The school office is accepting enquiries.",
    href: "/admissions/enquire",
  };

  const result = await getHomepageEditorialContent({
    env,
    now: NOW,
    manifest: manifest("claim-future", "claim-current"),
    bindings: await bindingRegistry({ candidate: notices[1], projection: currentProjection }),
    fetchImpl: mockFetch(emptyResult({ notices })),
  });

  assert.deepEqual(result.notice, currentProjection);
  assert.equal(result.status.source, "mixed");
  assert.equal(result.status.remoteAccepted, 1);
  assert.equal(result.status.remoteRejected, 1);
});

test("rejects published records when either validity boundary is missing", async () => {
  const result = await getHomepageEditorialContent({
    env,
    now: NOW,
    manifest: manifest("claim-no-start", "claim-no-end"),
    fetchImpl: mockFetch(emptyResult({
      notices: [
        {
          title: "No start",
          message: "Missing its valid-from boundary.",
          publication: gate("claim-no-start", { validFrom: undefined }),
        },
        {
          title: "No end",
          message: "Missing its valid-until boundary.",
          publication: gate("claim-no-end", { validUntil: undefined }),
        },
      ],
    })),
  });

  assert.equal(result.notice, null);
  assert.equal(result.status.reason, "no-approved-content");
  assert.equal(result.status.remoteRejected, 2);
});

test("rejects malformed and executable links instead of exposing them", async () => {
  const result = await getHomepageEditorialContent({
    env,
    now: NOW,
    manifest: manifest("claim-bad-link"),
    fetchImpl: mockFetch(emptyResult({
      notices: [{
        title: "Unsafe notice",
        message: "This record has an executable link.",
        href: "javascript:alert(1)",
        publication: gate("claim-bad-link"),
      }],
    })),
  });

  assert.equal(result.notice, null);
  assert.equal(result.status.reason, "no-approved-content");
  assert.equal(result.status.remoteRejected, 1);
});

test("safely merges valid approved fields with fallbacks and limits events to three", async () => {
  const events = [1, 2, 3, 4].map((day) => sanityRecord("event", `event-${day}`, {
    title: `School event ${day}`,
    summary: day === 1 ? "A public school event." : undefined,
    startAt: `2026-09-0${day}T09:00:00+05:30`,
    endAt: `2026-09-0${day}T11:00:00+05:30`,
    location: "SSKEMS campus",
    href: day === 1 ? "https://www.sskemschool.com/student-life/calendar" : undefined,
    publication: gate(`claim-event-${day}`, { validUntil: "2026-09-30" }),
  }));
  const saturdayHours = "Saturday, 10 a.m.–1 p.m.";
  const contact = sanityRecord("siteSettings", "site-settings", {
    contact: { email: "OFFICE@SSKEMSCHOOL.COM", workingHours: { saturday: saturdayHours } },
    publication: gate("claim-contact"),
  });
  const admissions = sanityRecord("admissionCycle", "admissions-2026", {
    publicStatus: "Enquiries available",
    publication: gate("claim-admissions"),
  });
  const contactProjection = {
    location: siteFacts.location,
    phone: siteFacts.phone,
    mobile: siteFacts.mobile,
    email: "office@sskemschool.com",
    principalEmail: siteFacts.principalEmail,
    workingHours: { weekdays: siteFacts.workingHours.weekdays, saturday: saturdayHours },
  };
  const admissionsProjection = { ...fallbackAdmissionsCycle, publicStatus: "Enquiries available" };
  const eventProjections = [1, 2, 3].map((day) => ({
    title: `School event ${day}`,
    summary: day === 1 ? "A public school event." : null,
    startAt: `2026-09-0${day}T03:30:00.000Z`,
    endAt: `2026-09-0${day}T05:30:00.000Z`,
    location: "SSKEMS campus",
    href: day === 1 ? "https://www.sskemschool.com/student-life/calendar" : null,
  }));

  const result = await getHomepageEditorialContent({
    env,
    now: NOW,
    manifest: manifest("claim-contact", "claim-admissions", ...events.map((_, index) => `claim-event-${index + 1}`)),
    bindings: await bindingRegistry(
      { candidate: contact, projection: contactProjection },
      { candidate: admissions, projection: admissionsProjection },
      ...events.slice(0, 3).map((candidate, index) => ({ candidate, projection: eventProjections[index] })),
    ),
    fetchImpl: mockFetch(emptyResult({
      contacts: [contact],
      admissionsCycles: [admissions],
      events,
    })),
  });

  assert.equal(result.contact.email, "office@sskemschool.com");
  assert.equal(result.contact.location, siteFacts.location);
  assert.equal(result.contact.workingHours.weekdays, siteFacts.workingHours.weekdays);
  assert.equal(result.contact.workingHours.saturday, saturdayHours);
  assert.equal(result.admissionsCycle.publicStatus, "Enquiries available");
  assert.equal(result.admissionsCycle.publicMessage, fallbackAdmissionsCycle.publicMessage);
  assert.equal(result.events.length, 3);
  assert.deepEqual(result.events.map((event) => event.title), ["School event 1", "School event 2", "School event 3"]);
  assert.equal(result.events[0].href, "https://www.sskemschool.com/student-life/calendar");
  assert.equal(result.status.source, "mixed");
  assert.equal(result.status.remoteAccepted, 5);
});

test("rejects edits and revision changes after an exact CMS review receipt is recorded", async () => {
  const reviewed = sanityRecord("announcement", "notice-integrity", {
    title: "Office notice",
    message: "The office is open on Monday.",
    href: "/contact",
    publication: gate("claim-integrity"),
  }, "rev-reviewed");
  const reviewedProjection = {
    title: "Office notice",
    message: "The office is open on Monday.",
    href: "/contact",
  };
  const bindings = await bindingRegistry({ candidate: reviewed, projection: reviewedProjection });

  for (const candidate of [
    { ...reviewed, message: "The office is open every day." },
    { ...reviewed, _rev: "rev-after-edit" },
  ]) {
    const result = await getHomepageEditorialContent({
      env,
      now: NOW,
      manifest: manifest("claim-integrity"),
      bindings,
      fetchImpl: mockFetch(emptyResult({ notices: [candidate] })),
    });
    assert.equal(result.notice, null);
    assert.equal(result.status.reason, "no-approved-content");
    assert.equal(result.status.remoteRejected, 1);
  }
});

test("fails closed on network and malformed Content Lake responses", async () => {
  const networkFailure = await getHomepageEditorialContent({
    env,
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });
  assert.equal(networkFailure.status.reason, "fetch-failed");
  assert.equal(networkFailure.contact.email, siteFacts.email);

  const malformed = await getHomepageEditorialContent({
    env,
    fetchImpl: async () => ({ ok: true, async json() { return { result: { notices: [] } }; } }),
  });
  assert.equal(malformed.status.reason, "invalid-response");
  assert.equal(malformed.notice, null);
});
