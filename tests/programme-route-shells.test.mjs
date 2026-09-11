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

test("publishes each approved profile while retaining private-deployment authentication", async () => {
  for (const route of PROGRAMMES_PUBLICATION_ROUTES) {
    const page = await source(routeFiles[route]);
    const profilePosition = page.indexOf("getPublicProgrammeProfile(route)");
    const authPosition = page.indexOf("requireChatGPTUser(route)");

    assert.ok(profilePosition >= 0, `${route} resolves its approved public profile`);
    assert.ok(authPosition > profilePosition, `${route} authenticates only for the private deployment preview`);
    assert.match(page, /notFound\(\)/, route);
    assert.match(page, /export const dynamic = "force-dynamic"/, route);
    assert.match(page, /index:\s*true, follow:\s*true/, route);
    assert.match(page, /\?\s*\{\s*index:\s*false,\s*follow:\s*false,\s*nocache:\s*true\s*\}/, route);
    assert.match(page, /PublicProgrammeProfilePage/, route);
    assert.match(page, /alternates:\s*\{ canonical:/, route);
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

test("reflects the reconciled institutional model while retaining route blockers", () => {
  const school = privateProgrammeRouteShells["/school/academics"];
  const juniorCollege = privateProgrammeRouteShells["/junior-college"];
  const institute = privateProgrammeRouteShells["/programmes/jee-neet"];

  assert.match(school.summary, /separately identified CBSE Senior Secondary school/i);
  assert.match(juniorCollege.summary, /distinct Maharashtra Junior College/i);
  assert.match(juniorCollege.blockers.join(" "), /25\.04\.028/);
  assert.match(juniorCollege.blockers.join(" "), /Arts must remain withheld/i);
  assert.match(institute.summary, /Shree Samarth Krupa Institute/);
  assert.match(institute.blockers.join(" "), /NEET is evidenced/i);
  assert.match(institute.blockers.join(" "), /current JEE scope/i);
  assert.doesNotMatch(institute.blockers.join(" "), /ProTrack/);
});

test("retains the private shell workspace while public navigation and sitemap expose approved profiles", async () => {
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
  assert.match(navigation, /getCurrentPublicProgrammeProfiles\(now\)/);
  assert.match(navigation, /profile\.navigationLabel/);
  assert.match(navigation, /href:\s*profile\.route/);
  assert.match(footer, /usePublicationNavigation/);
  assert.doesNotMatch(footer, /\/junior-college|\/programmes\/jee-neet|\/school\/academics/);
  assert.match(sitemap, /programmeLinks\.map/);
});
