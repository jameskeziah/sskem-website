import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

function projectFile(path) {
  return new URL(path, projectRoot);
}

async function source(path) {
  return readFile(projectFile(path), "utf8");
}

function assertExports(file, code, names) {
  for (const name of names) {
    assert.match(
      code,
      new RegExp(`\\bexport\\s+(?:async\\s+)?(?:function|const|class)\\s+${name}\\b`),
      `${file} must export ${name}`,
    );
  }
}

test("publishes reference, semantic, and component token levels", async () => {
  const [jsonText, css] = await Promise.all([
    source("app/design-tokens.json"),
    source("app/tokens.css"),
  ]);
  const tokens = JSON.parse(jsonText);

  assert.equal(
    tokens.$schema,
    "https://www.designtokens.org/schemas/2025.10/format.json",
  );

  assert.ok(tokens.reference, "Reference token group must exist");
  assert.ok(tokens.semantic, "Semantic token group must exist in the JSON source");
  assert.ok(tokens.component, "Component token group must exist in the JSON source");
  const reference = tokens.reference;

  assert.deepEqual(
    Object.keys(reference.color.brand).filter((key) => key !== "$type"),
    ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  );
  assert.deepEqual(
    Object.keys(reference.color.neutral).filter((key) => key !== "$type"),
    ["0", "50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  );

  const requiredJsonGroups = [
    reference.color.green,
    reference.color.amber,
    reference.color.red,
    reference.color.blue,
    reference.font.family.heading,
    reference.font.family.body,
    reference.font.size["100"],
    reference.font.size["900"],
    reference.font.weight.regular,
    reference.font.weight.bold,
    reference.space["0"],
    reference.space["96"],
    reference.radius.none,
    reference.radius.pill,
    reference.shadow.small,
    reference.shadow.large,
    reference.border.width.default,
    reference.border.width.strong,
    reference.motion.duration.instant,
    reference.motion.duration.micro,
    reference.motion.duration.fast,
    reference.motion.duration.standard,
    reference.motion.duration.deliberate,
    reference.motion.duration.slow,
    reference.motion.duration.ceremonial,
    reference.motion.ease.linear,
    reference.motion.ease.enter,
    reference.motion.ease.exit,
    reference.motion.ease.move,
    reference.motion.ease.emphasised,
    reference.motion.distance.revealDesktop,
    reference.motion.distance.revealTablet,
    reference.motion.distance.revealMobile,
    reference.motion.stagger.cards,
    reference.motion.scale.imageMaskMaximum,
    reference.layout.content,
    reference.layout.wide,
    reference.layout.reading,
  ];
  assert.ok(requiredJsonGroups.every(Boolean), "All required reference token families must exist");

  for (const token of [
    ...Object.values(reference.color.brand).filter((value) => typeof value === "object"),
    ...Object.values(reference.color.neutral).filter((value) => typeof value === "object"),
    reference.color.green,
    reference.color.amber,
    reference.color.red,
    reference.color.blue,
  ]) {
    assert.equal(token.$value.colorSpace, "srgb");
    assert.equal(token.$value.components.length, 3);
    assert.ok(token.$value.components.every((component) => component >= 0 && component <= 1));
  }

  for (const token of Object.values(reference.motion.duration).filter((value) => typeof value === "object")) {
    assert.equal(typeof token.$value.value, "number");
    assert.match(token.$value.unit, /^(ms|s)$/);
  }

  for (const token of Object.values(reference.shadow).filter((value) => typeof value === "object")) {
    for (const dimension of ["offsetX", "offsetY", "blur", "spread"]) {
      assert.equal(typeof token.$value[dimension].value, "number");
      assert.match(token.$value[dimension].unit, /^(px|rem)$/);
    }
  }

  assert.equal(tokens.semantic.surface.page.$value, "{reference.color.neutral.50}");
  assert.equal(tokens.component.button.primary.background.$value, "{semantic.action.primary}");

  const referenceVariables = [
    "--color-brand-50",
    "--color-brand-950",
    "--color-neutral-0",
    "--color-neutral-950",
    "--font-family-heading",
    "--font-size-100",
    "--font-size-900",
    "--space-0",
    "--space-96",
    "--radius-pill",
    "--shadow-large",
    "--border-width-strong",
    "--motion-duration-standard",
    "--motion-duration-deliberate",
    "--motion-ease-enter",
    "--motion-ease-move",
    "--motion-distance-reveal-mobile",
    "--motion-stagger-cards",
    "--layout-reading",
  ];
  const semanticVariables = [
    "--surface-page",
    "--surface-subtle",
    "--surface-raised",
    "--surface-brand",
    "--text-primary",
    "--text-secondary",
    "--text-muted",
    "--text-on-brand",
    "--border-default",
    "--border-strong",
    "--action-primary",
    "--action-primary-hover",
    "--action-secondary",
    "--focus-ring",
    "--status-success",
    "--status-warning",
    "--status-danger",
    "--status-information",
  ];
  const componentVariables = [
    "--button-primary-background",
    "--button-primary-text",
    "--header-background",
    "--navigation-item-hover",
    "--notice-background",
    "--document-card-border",
  ];

  for (const variable of [
    ...referenceVariables,
    ...semanticVariables,
    ...componentVariables,
  ]) {
    assert.match(css, new RegExp(`${variable.replaceAll("-", "\\-")}\\s*:`), `${variable} must be exposed in CSS`);
  }

  assert.match(css, /--surface-page\s*:\s*var\(--color-neutral-50\)/);
  assert.match(css, /--button-primary-background\s*:\s*var\(--action-primary\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("exports the complete Phase 1 component inventory", async () => {
  const inventory = {
    "components/layout.tsx": [
      "PageContainer",
      "ReadingContainer",
      "Section",
      "Stack",
      "Inline",
      "Grid",
      "Cluster",
      "Divider",
      "AspectRatio",
      "VisuallyHidden",
    ],
    "components/typography.tsx": [
      "Heading",
      "Text",
      "Lead",
      "Eyebrow",
      "Caption",
      "TextLink",
      "ExternalLink",
      "DownloadLink",
      "List",
      "Quote",
    ],
    "components/controls.tsx": [
      "Button",
      "IconButton",
      "Input",
      "Textarea",
      "Select",
      "Checkbox",
      "RadioGroup",
      "FormField",
      "FieldHint",
      "FieldError",
      "ErrorSummary",
      "SearchInput",
    ],
    "components/content.tsx": [
      "NoticeBar",
      "Alert",
      "Breadcrumbs",
      "ProgrammeCard",
      "DisclosureDocumentCard",
      "DocumentList",
      "ContactCard",
      "LeadershipCard",
      "FacultyCard",
      "Statistic",
      "Accordion",
      "DataTable",
      "ResponsiveImage",
      "VideoEmbed",
      "GalleryCard",
      "EmptyState",
      "ErrorState",
      "Pagination",
    ],
    "components/site-header.tsx": ["SiteHeader"],
    "components/site-footer.tsx": ["SiteFooter"],
  };

  await Promise.all(
    Object.entries(inventory).map(async ([file, names]) => {
      assertExports(file, await source(file), names);
    }),
  );
});

test("exposes only the approved institutional profiles in primary navigation", async () => {
  const navigation = await source("app/data/navigation.ts");

  assert.match(
    navigation,
    /label:\s*["']CBSE School["'][\s\S]*?status:\s*["']active["']/,
  );
  assert.match(
    navigation,
    /label:\s*["']Junior College["'][\s\S]*?status:\s*["']active["']/,
  );
  assert.match(
    navigation,
    /label:\s*["']Institute["'][\s\S]*?status:\s*["']active["']/,
  );

  const primaryStart = navigation.indexOf("export const primaryNavigation");
  const primaryEnd = navigation.indexOf("export const utilityNavigation");
  assert.ok(primaryStart >= 0 && primaryEnd > primaryStart);
  const primaryNavigation = navigation.slice(primaryStart, primaryEnd);

  assert.match(primaryNavigation, /label:\s*["']CBSE School["']/);
  assert.match(primaryNavigation, /href:\s*["']\/school\/academics["']/);
  assert.match(primaryNavigation, /label:\s*["']Junior College["']/);
  assert.match(primaryNavigation, /label:\s*["']Institute["']/);
  assert.match(navigation, /Mandatory Public Disclosure/);
  assert.match(navigation, /href:\s*["']\/admissions\/enquire["']/);
});

test("ships complete site states, an accessible shell and the approved Programme profile lane", async () => {
  const [notFound, loading, errorPage, globalError, header, footer, navigation, css, catchAll, schoolRoute, collegeRoute, preparationRoute] = await Promise.all([
    source("app/not-found.tsx"),
    source("app/loading.tsx"),
    source("app/error.tsx"),
    source("app/global-error.tsx"),
    source("components/site-header.tsx"),
    source("components/site-footer.tsx"),
    source("app/data/navigation.ts"),
    source("app/globals.css"),
    source("app/[...slug]/page.tsx"),
    source("app/school/academics/page.tsx"),
    source("app/junior-college/page.tsx"),
    source("app/programmes/jee-neet/page.tsx"),
  ]);

  for (const state of [notFound, loading, errorPage]) {
    assert.match(state, /<SiteHeader/);
    assert.match(state, /<main\s+id="main-content"\s+tabIndex=\{-1\}/);
    assert.match(state, /<SiteFooter/);
    assert.doesNotMatch(state, /JEE|NEET|Junior College|affiliation|faculty name|fee amount|result statistic/i);
  }
  assert.match(notFound, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  assert.match(notFound, /Return home/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /role="status"\s+aria-live="polite"/);
  assert.match(errorPage, /^"use client";/);
  assert.match(errorPage, /role="alert"/);
  assert.match(errorPage, /onClick=\{reset\}/);
  assert.doesNotMatch(errorPage, /error\.message|error\.stack|error\.digest/);
  assert.match(globalError, /<html lang="en">/);
  assert.match(globalError, /onClick=\{reset\}/);

  assert.match(header, /<nav className="skip-links" aria-label="Skip links">/);
  assert.match(header, /href="#main-content"/);
  assert.match(header, /href="#site-footer"/);
  assert.match(header, /aria-labelledby="mobile-navigation-title"/);
  assert.match(header, /aria-describedby="mobile-navigation-description"/);
  assert.match(header, /\$\{expanded \? "Hide" : "Show"\}/);
  assert.match(header, /onClick=\{closeMobileNavigation\}/);
  assert.match(footer, /id="site-footer"\s+tabIndex=\{-1\}/);
  assert.match(footer, /footerNavigationGroups/);
  assert.doesNotMatch(footer, /institutionPathways|confirmation pending|· confirmed/);
  assert.match(navigation, /footerNavigationGroups/);
  assert.match(navigation, /title:\s*["']Programmes["']/);
  assert.match(navigation, /href:\s*["']\/programmes\/jee-neet["']/);
  assert.doesNotMatch(catchAll, /"\/junior-college"\s*:\s*\{|"\/institute"\s*:\s*\{/);
  assert.doesNotMatch(catchAll, /\.\.\.institutionPathways/);
  assert.match(catchAll, /isProgrammesPublicationRoute\(path\) \|\| !allKnownPaths\.has\(path\)/);

  assert.match(css, /\.skip-links:focus-within/);
  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(css, /@media\s+print[\s\S]*?@page/);
  assert.match(css, /\.mobile-drawer-layer,[\s\S]*?\.search-layer,[\s\S]*?display:\s*none\s*!important/);
  assert.match(css, /h1,[\s\S]*?break-after:\s*avoid/);

  for (const route of [schoolRoute, collegeRoute, preparationRoute]) {
    const publicMetadata = route.slice(route.indexOf("export function generateMetadata"), route.indexOf("export default"));
    assert.match(publicMetadata, /getPublicProgrammeProfile\(route\)/);
    assert.match(publicMetadata, /alternates:\s*\{ canonical:/);
    assert.match(publicMetadata, /index:\s*true, follow:\s*true/);
    assert.match(publicMetadata, /index:\s*false, follow:\s*false, nocache:\s*true/);
  }
});

test("encodes accessible navigation, disclosure, controls, and content semantics", async () => {
  const [header, controls, content, footer] = await Promise.all([
    source("components/site-header.tsx"),
    source("components/controls.tsx"),
    source("components/content.tsx"),
    source("components/site-footer.tsx"),
  ]);

  assert.match(header, /className=["']skip-link["'][^>]*href=["']#main-content["']/);
  assert.match(header, /<nav[\s\S]*?aria-label=["']Primary navigation["']/);
  assert.match(header, /<ul>/);
  assert.match(header, /aria-expanded=\{/);
  assert.match(header, /aria-controls=\{/);
  assert.match(header, /role=["']dialog["][^>]*aria-modal=["']true["']/);
  assert.match(header, /event\.key === ["']Escape["']/);
  assert.match(header, /setAttribute\(["']inert["']/);
  assert.match(header, /const returnButton = menuButtonRef\.current/);
  assert.match(header, /returnButton\?\.focus\(\{\s*preventScroll:\s*true\s*\}\)/);
  assert.doesNotMatch(header, /role=["']menu["']/);

  assert.match(controls, /aria-busy=\{loading \|\| undefined\}/);
  assert.match(controls, /aria-label=\{label\}/);
  assert.match(controls, /<fieldset/);
  assert.match(controls, /<legend>/);
  assert.match(controls, /role=["']alert["]/);

  assert.match(content, /<nav aria-label=["']Breadcrumb["']/);
  assert.match(content, /aria-current=["']page["']/);
  assert.match(content, /aria-label=\{`View \$\{title\}, \$\{fileType\}, \$\{fileSize\}`\}/);
  assert.match(content, /<th scope=["']col["']/);
  assert.match(content, /aria-label=\{`\$\{caption\}, scrollable table`\}/);
  assert.match(footer, /id=["']site-footer["']/);
  assert.match(footer, /aria-label=["']Legal links["']/);
  assert.doesNotMatch(footer, /Institutional pathway status|confirmation pending/);
});

test("component sources do not contain arbitrary raw hex colours", async () => {
  const componentDirectory = projectFile("components/");
  const files = (await readdir(componentDirectory)).filter((file) => file.endsWith(".tsx"));
  assert.ok(files.length > 0);

  for (const file of files) {
    const code = await readFile(new URL(file, componentDirectory), "utf8");
    assert.doesNotMatch(
      code,
      /#[\da-f]{3,8}\b/i,
      `${file} contains a raw hex colour; use semantic or component tokens`,
    );
  }
});

test("catalogues homepage media and keeps pupil artwork behind publication gates", async () => {
  const mediaFiles = [
    "public/media/home/campus-main.jpeg",
    "public/media/home/campus-grounds.jpeg",
    "public/media/home/campus-entrance.jpeg",
    "public/media/home/campus-courtyard.jpeg",
    "public/media/home/class-x-results-2025-26.jpeg",
    "public/media/home/xii-science-2025-26.jpeg",
    "public/media/home/rangotsav-2025-26.jpeg",
    "public/media/home/result-and-admissions-2025-26.jpg",
    "public/og.png",
  ];

  for (const file of mediaFiles) {
    const details = await stat(projectFile(file));
    assert.ok(details.isFile(), `${file} must be a file`);
    assert.ok(details.size >= 10_000, `${file} is unexpectedly small`);
    assert.ok(details.size <= 2_000_000, `${file} exceeds the prototype media ceiling`);
  }

  const [homepage, layout, achievements, achievementPublication, brief, publicationGuide, publicationGate, packageText] = await Promise.all([
    source("app/page.tsx"),
    source("app/layout.tsx"),
    source("components/motion/home-achievements-motion.tsx"),
    source("lib/homepage-achievement-publication.ts"),
    source("docs/campus-media-brief.md"),
    source("docs/approval-manifest.md"),
    source("scripts/assert-publication-safety.mjs"),
    source("package.json"),
  ]);
  const packageJson = JSON.parse(packageText);

  for (const file of mediaFiles.slice(0, 4)) {
    assert.match(homepage, new RegExp(file.replace("public", "").replaceAll(".", "\\.")));
  }
  for (const file of mediaFiles.slice(4, -1)) {
    assert.match(achievementPublication, new RegExp(file.replace("public", "").replaceAll(".", "\\.")));
  }
  assert.match(achievements, /data-publication-review=/);
  assert.match(achievements, /publicationMode === ["']private-review["'] \? ["']required["'] : ["']approved["']/);
  assert.match(homepage, /Approval gate/);
  assert.match(homepage, /names, photographs, marks, award wording and institutional status require approval/i);
  assert.match(layout, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  assert.match(brief, /parent or guardian media consent/i);
  assert.match(brief, /Junior College\/institutional status[\s\S]*?pending/i);
  assert.match(brief, /review markers, not access[\s\S]*?public build must omit those assets/i);
  assert.match(brief, /npm run build:review[\s\S]*?access-controlled review environment/i);
  assert.match(brief, /content\/approval-manifest\.json[\s\S]*?release source of truth/i);
  assert.match(brief, /No autoplay sound/i);
  assert.match(brief, /LCP ≤ 2\.5 seconds/i);
  assert.match(publicationGuide, /Never place[\s\S]*?consent forms[\s\S]*?private file paths/i);
  assert.match(publicationGuide, /separation of duties/i);
  assert.match(publicationGate, /Public build blocked by the structured approval manifest/);
  assert.match(publicationGate, /loadApprovalManifest/);
  assert.match(publicationGate, /HOMEPAGE_REVIEW_MODE === "private"/);
  assert.match(packageJson.scripts.prebuild, /assert-publication-safety\.mjs/);
  assert.match(packageJson.scripts["approvals:audit"], /audit-approval-manifest\.mjs/);
  assert.match(packageJson.scripts["approvals:release"], /--release/);
  assert.match(packageJson.scripts["build:review"], /HOMEPAGE_REVIEW_MODE=private/);
  assert.match(packageJson.scripts.test, /HOMEPAGE_REVIEW_MODE=private/);
  assert.match(packageJson.scripts["test:browser"], /HOMEPAGE_REVIEW_MODE=private/);
  assert.match(packageJson.scripts["test:visual"], /HOMEPAGE_REVIEW_MODE=private/);
});
