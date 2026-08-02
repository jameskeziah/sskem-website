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

test("server-renders the SSKEMS Phase 1 foundation", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const title = textContent(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  assert.match(title, /SSKEMS/i);
  assert.match(title, /Phase 1/i);

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
  assert.doesNotMatch(
    html,
    /codex-preview|_sites-preview|SkeletonPreview|react-loading-skeleton|Building your site|Your site is taking shape/i,
  );
});
