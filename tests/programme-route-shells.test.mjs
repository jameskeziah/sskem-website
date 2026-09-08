import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PROGRAMME_SHELL_COMPONENTS,
  privateProgrammeRouteShells,
} from "../app/data/programme-route-shells.ts";
import { PROGRAMMES_PUBLICATION_ROUTES } from "../lib/programmes-publication-routes.ts";

const projectRoot = new URL("../", import.meta.url);

const routeFiles = {
  "/school/academics": "app/school/academics/page.tsx",
  "/junior-college": "app/junior-college/page.tsx",
  "/programmes/jee-neet": "app/programmes/jee-neet/page.tsx",
};

async function source(path) {
  return readFile(new URL(path, projectRoot), "utf8");
}

test("defines one complete ten-slot shell for every governed Programme route", () => {
  assert.deepEqual(Object.keys(privateProgrammeRouteShells), PROGRAMMES_PUBLICATION_ROUTES);
  assert.equal(PROGRAMME_SHELL_COMPONENTS.length, 10);

  for (const route of PROGRAMMES_PUBLICATION_ROUTES) {
    const shell = privateProgrammeRouteShells[route];
    assert.equal(shell.route, route);
    assert.equal(shell.slots.length, PROGRAMME_SHELL_COMPONENTS.length);
    assert.deepEqual(shell.slots.map((slot) => slot.component), PROGRAMME_SHELL_COMPONENTS);
    assert.equal(new Set(shell.slots.map((slot) => slot.component)).size, PROGRAMME_SHELL_COMPONENTS.length);
    assert.ok(shell.blockers.length >= 3);
  }
});

test("keeps every direct route private, authenticated, dynamic and non-indexable", async () => {
  for (const route of PROGRAMMES_PUBLICATION_ROUTES) {
    const page = await source(routeFiles[route]);
    const guardPosition = page.indexOf('process.env.HOMEPAGE_REVIEW_MODE !== "private"');
    const authPosition = page.indexOf("requireChatGPTUser(route)");

    assert.ok(guardPosition >= 0, `${route} private-mode guard`);
    assert.ok(authPosition > guardPosition, `${route} authenticates after denying public mode`);
    assert.match(page, /notFound\(\)/, route);
    assert.match(page, /export const dynamic = "force-dynamic"/, route);
    assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*nocache:\s*true\s*\}/, route);
    assert.match(page, /PrivateProgrammeRouteShell/, route);
  }
});

test("shows placeholders and blockers instead of manufacturing a public-ready state", async () => {
  const [shell, data] = await Promise.all([
    source("components/programmes/private-programme-route-shell.tsx"),
    source("app/data/programme-route-shells.ts"),
  ]);

  assert.match(shell, /data-publication-state="blocked"/);
  assert.match(shell, /Private review only/);
  assert.match(shell, /Awaiting approved source/);
  assert.match(shell, /Approved package[\s\S]*?Not bound/);
  assert.doesNotMatch(shell, /issueApprovedProgrammeRenderGate|publicationReady\s*=\s*true/);
  assert.match(data, /No digest-covered public projection has been accepted for this route\./g);
  assert.doesNotMatch(data, /\b100%\b|\bNo\.\s*1\b|\bbest\b/i);
});

test("links the shells only from private review while public navigation and sitemap remain filtered", async () => {
  const [preview, dashboard, navigation, footer, sitemap] = await Promise.all([
    source("app/publication-review/programmes-preview/page.tsx"),
    source("app/publication-review/page.tsx"),
    source("app/data/navigation.ts"),
    source("components/site-footer.tsx"),
    source("app/sitemap.ts"),
  ]);

  for (const route of PROGRAMMES_PUBLICATION_ROUTES) {
    assert.match(preview, new RegExp(route.replaceAll("/", "\\/")), route);
  }
  assert.match(dashboard, /Review private route shells/);
  assert.match(navigation, /filter\(\(item\) => !isProgrammesPublicationRoute\(item\.href\)\)/);
  assert.match(footer, /footerNavigationGroups/);
  assert.doesNotMatch(footer, /\/junior-college|\/programmes\/jee-neet|\/school\/academics/);
  assert.match(sitemap, /filter\(\(path\) => !isProgrammesPublicationRoute\(path\)\)/);
});
