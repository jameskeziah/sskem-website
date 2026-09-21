import assert from "node:assert/strict";
import test from "node:test";

import { getWordPressCmsInventory } from "../lib/cms/wordpress-rest.server.ts";

const ORIGIN = "https://www.sskemschool.com";

function rendered(value) {
  return { rendered: value };
}

function responseFor(collection, payload) {
  const totals = { pages: "50", posts: "18", media: "1058" };
  const body = JSON.stringify(payload);
  return {
    ok: true,
    url: `${ORIGIN}/wp-json/wp/v2/${collection}`,
    headers: new Headers({
      "content-type": "application/json; charset=UTF-8",
      "x-wp-total": totals[collection],
    }),
    async text() { return body; },
  };
}

function payloads() {
  return {
    pages: [
      {
        id: 348,
        slug: "vision-and-mission",
        status: "publish",
        type: "page",
        modified_gmt: "2025-06-17T06:25:38",
        link: `${ORIGIN}/vision-and-mission/`,
        title: rendered("Vision &amp; mission"),
        excerpt: rendered("<p>Our public purpose.</p>"),
        content: rendered("[vc_row]<p>Learn <strong>together</strong>.</p><script>alert(1)</script>[/vc_row]"),
      },
      {
        id: 0,
        slug: "invalid",
        status: "publish",
        type: "page",
        modified_gmt: "not-a-date",
        link: `${ORIGIN}/invalid/`,
        title: rendered("Invalid"),
        excerpt: rendered(""),
        content: rendered(""),
      },
    ],
    posts: [{
      id: 6541,
      slug: "independence-day",
      status: "publish",
      type: "post",
      modified_gmt: "2021-08-13T17:55:30",
      link: `${ORIGIN}/independence-day/`,
      title: rendered("Independence Day"),
      excerpt: rendered("<p>Archived school post.</p>"),
      content: rendered("<p>Legacy post content.</p>"),
    }],
    media: [{
      id: 7763,
      slug: "_appendix_ix-2",
      status: "inherit",
      type: "attachment",
      modified_gmt: "2026-08-14T05:42:50",
      source_url: `${ORIGIN}/wp-content/uploads/2026/08/Appendix-IX.pdf`,
      mime_type: "application/pdf",
      alt_text: "",
      caption: rendered("<p>Appendix IX document.</p>"),
      title: rendered("Appendix IX"),
    }],
  };
}

function mockFetch(allPayloads = payloads()) {
  const calls = [];
  const fetchImpl = async (input, init) => {
    const url = new URL(input);
    const collection = url.pathname.split("/").at(-1);
    calls.push({ url, init, collection });
    return responseFor(collection, allPayloads[collection]);
  };
  return { calls, fetchImpl };
}

test("stays disabled without an explicit WordPress origin", async () => {
  let requests = 0;
  const inventory = await getWordPressCmsInventory({
    env: {},
    fetchImpl: async () => { requests += 1; throw new Error("must not fetch"); },
  });

  assert.equal(requests, 0);
  assert.equal(inventory.status.reason, "missing-config");
  assert.equal(inventory.status.publicAccepted, 0);
  assert.deepEqual(inventory.candidates, []);
});

test("rejects unsafe or unrelated origins before requesting them", async (t) => {
  for (const origin of [
    "https://sskemschool.com",
    "http://www.sskemschool.com",
    "https://example.com",
    "https://user:secret@www.sskemschool.com",
    "https://www.sskemschool.com/wordpress",
    "https://www.sskemschool.com/?redirect=1",
  ]) {
    await t.test(origin, async () => {
      let requests = 0;
      const inventory = await getWordPressCmsInventory({
        env: { WORDPRESS_CMS_ORIGIN: origin },
        fetchImpl: async () => { requests += 1; throw new Error("must not fetch"); },
      });
      assert.equal(requests, 0);
      assert.equal(inventory.status.reason, "invalid-config");
    });
  }
});

test("reads public REST metadata through a credential-free, bounded server boundary", async () => {
  const { calls, fetchImpl } = mockFetch();
  const inventory = await getWordPressCmsInventory({
    env: { WORDPRESS_CMS_ORIGIN: ORIGIN },
    fetchImpl,
  });

  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map((call) => call.collection).sort(), ["media", "pages", "posts"]);
  for (const call of calls) {
    assert.equal(call.url.origin, ORIGIN);
    assert.equal(call.url.searchParams.get("context"), "view");
    assert.equal(call.url.searchParams.get("status"), call.collection === "media" ? null : "publish");
    assert.equal(call.url.searchParams.get("per_page"), "100");
    assert.equal(call.init.method, "GET");
    assert.equal(call.init.headers.accept, "application/json");
    assert.equal(call.init.credentials, "omit");
    assert.equal(call.init.cache, "no-store");
    assert.equal(call.init.redirect, "error");
    assert.equal(call.init.headers.authorization, undefined);
  }

  assert.equal(inventory.status.reason, "review-ready");
  assert.equal(inventory.status.reviewCandidates, 3);
  assert.equal(inventory.status.publicAccepted, 0);
  assert.equal(inventory.status.rejected, 1);
  assert.deepEqual(inventory.collections.map(({ collection, reportedTotal }) => [collection, reportedTotal]), [
    ["pages", 50], ["posts", 18], ["media", 1058],
  ]);
  assert.deepEqual(inventory.policy, {
    authenticationSent: false,
    rawHtmlExposed: false,
    publicPublicationAutomatic: false,
    approvalBindingRequired: true,
  });
});

test("returns sanitized review projections and exact fingerprints, never raw WordPress HTML", async () => {
  const { fetchImpl } = mockFetch();
  const inventory = await getWordPressCmsInventory({
    env: { WORDPRESS_CMS_ORIGIN: ORIGIN },
    fetchImpl,
  });

  const page = inventory.candidates.find((candidate) => candidate.collection === "pages");
  assert.equal(page.sourceId, "wordpress:page:348");
  assert.equal(page.title, "Vision & mission");
  assert.equal(page.summary, "Our public purpose.");
  assert.equal(page.bodyText, "Learn together .");
  assert.match(page.fingerprintSha256, /^[a-f0-9]{64}$/);
  assert.equal(page.publicationState, "review-required");
  assert.equal(page.publicEligible, false);
  assert.equal(page.blockers.length, 1);

  const media = inventory.candidates.find((candidate) => candidate.collection === "media");
  assert.equal(media.sourceId, "wordpress:media:7763");
  assert.equal(media.slug, "_appendix_ix-2");
  assert.equal(media.mimeType, "application/pdf");
  assert.equal(media.altText, null);
  assert.equal(media.bodyText, null);

  const serialized = JSON.stringify(inventory.candidates);
  assert.doesNotMatch(serialized, /<p>|<script>|vc_row|alert\(1\)/i);
});

test("changes the fingerprint when the sanitized WordPress content changes", async () => {
  const firstPayloads = payloads();
  const secondPayloads = payloads();
  secondPayloads.pages[0].content = rendered("<p>Updated approved-source candidate.</p>");

  const first = await getWordPressCmsInventory({
    env: { WORDPRESS_CMS_ORIGIN: ORIGIN },
    fetchImpl: mockFetch(firstPayloads).fetchImpl,
  });
  const second = await getWordPressCmsInventory({
    env: { WORDPRESS_CMS_ORIGIN: ORIGIN },
    fetchImpl: mockFetch(secondPayloads).fetchImpl,
  });

  assert.notEqual(first.candidates[0].fingerprintSha256, second.candidates[0].fingerprintSha256);
});

test("fails closed on network errors, cross-origin responses and malformed payloads", async (t) => {
  await t.test("network", async () => {
    const inventory = await getWordPressCmsInventory({
      env: { WORDPRESS_CMS_ORIGIN: ORIGIN },
      fetchImpl: async () => { throw new Error("offline"); },
    });
    assert.equal(inventory.status.reason, "fetch-failed");
    assert.equal(inventory.status.publicAccepted, 0);
  });

  await t.test("redirect", async () => {
    const inventory = await getWordPressCmsInventory({
      env: { WORDPRESS_CMS_ORIGIN: ORIGIN },
      fetchImpl: async () => ({ ...responseFor("pages", []), url: "https://evil.example/wp-json/wp/v2/pages" }),
    });
    assert.equal(inventory.status.reason, "invalid-response");
  });

  await t.test("malformed", async () => {
    const inventory = await getWordPressCmsInventory({
      env: { WORDPRESS_CMS_ORIGIN: ORIGIN },
      fetchImpl: async () => ({ ...responseFor("pages", []), async text() { return JSON.stringify({ records: [] }); } }),
    });
    assert.equal(inventory.status.reason, "invalid-response");
  });

  await t.test("non-json", async () => {
    const inventory = await getWordPressCmsInventory({
      env: { WORDPRESS_CMS_ORIGIN: ORIGIN },
      fetchImpl: async () => ({
        ...responseFor("pages", []),
        headers: new Headers({ "content-type": "text/html" }),
        async text() { return "<html>not JSON</html>"; },
      }),
    });
    assert.equal(inventory.status.reason, "invalid-response");
  });
});
