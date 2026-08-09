import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
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
  assert.match(html, /<nav\b[^>]*\baria-label=["']Breadcrumb["']/i);
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
  assert.doesNotMatch(html, /style=["'][^"']*(?:opacity\s*:\s*0|visibility\s*:\s*hidden)/i);
});
