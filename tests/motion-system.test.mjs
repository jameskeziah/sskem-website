import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

function projectFile(path) {
  return new URL(path, projectRoot);
}

async function source(path) {
  return readFile(projectFile(path), "utf8");
}

function values(group) {
  return Object.fromEntries(
    Object.entries(group)
      .filter(([name]) => !name.startsWith("$"))
      .map(([name, token]) => [name, token.$value.value ?? token.$value]),
  );
}

test("publishes the approved motion tokens to CSS and GSAP", async () => {
  const [tokenSource, css, generated] = await Promise.all([
    source("app/design-tokens.json"),
    source("app/tokens.css"),
    import(new URL(`../lib/motion-tokens.generated.ts?test=${Date.now()}`, import.meta.url).href),
  ]);
  const motion = JSON.parse(tokenSource).reference.motion;

  assert.deepEqual(values(motion.duration), {
    instant: 0,
    micro: 120,
    fast: 180,
    standard: 260,
    deliberate: 380,
    slow: 520,
    ceremonial: 700,
  });
  assert.ok(Object.values(values(motion.duration)).every((duration) => duration <= 800));
  assert.deepEqual(Object.keys(motion.ease).filter((name) => !name.startsWith("$")), [
    "linear",
    "enter",
    "exit",
    "move",
    "emphasised",
  ]);
  assert.equal(motion.ease.linear.$value, "linear");
  assert.deepEqual(motion.ease.enter.$value, [0.16, 1, 0.3, 1]);
  assert.deepEqual(motion.ease.exit.$value, [0.7, 0, 0.84, 0]);
  assert.deepEqual(motion.ease.move.$value, [0.65, 0, 0.35, 1]);
  assert.deepEqual(motion.ease.emphasised.$value, [0.22, 1, 0.36, 1]);
  assert.deepEqual(values(motion.distance), {
    revealDesktop: 20,
    revealTablet: 16,
    revealMobile: 10,
    parallaxDesktopMaximum: 24,
    parallaxTabletMaximum: 12,
  });
  assert.deepEqual(values(motion.stagger), {
    interface: 40,
    cards: 60,
    heading: 80,
    mobile: 40,
  });
  assert.deepEqual(values(motion.scale), {
    iconHoverMaximum: 1.02,
    galleryHoverMaximum: 1.025,
    imageMaskMaximum: 1.03,
  });

  for (const [name, duration] of Object.entries(values(motion.duration))) {
    assert.match(css, new RegExp(`--motion-duration-${name}: ${duration}ms;`));
  }
  for (const name of ["linear", "enter", "exit", "move", "emphasised"]) {
    assert.match(css, new RegExp(`--motion-ease-${name}:`));
  }
  assert.deepEqual(generated.motionDurationSeconds, {
    instant: 0,
    micro: 0.12,
    fast: 0.18,
    standard: 0.26,
    deliberate: 0.38,
    slow: 0.52,
    ceremonial: 0.7,
  });
  assert.deepEqual(generated.motionEase, {
    linear: "none",
    enter: "power3.out",
    exit: "power2.in",
    move: "power2.inOut",
    emphasised: "power4.out",
  });
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*--motion-duration-ceremonial:\s*0ms/);
});

test("keeps motion in narrow, scoped and reversible client islands", async () => {
  const directory = projectFile("components/motion/");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".tsx"));
  assert.deepEqual(files.sort(), [
    "admissions-hero-motion.tsx",
    "admissions-timeline-motion.tsx",
    "home-achievements-motion.tsx",
    "home-campus-motion.tsx",
    "home-hero-motion.tsx",
    "home-hero-video-transition.tsx",
    "home-preloader-motion.tsx",
    "programmes-grid-motion.tsx",
    "programmes-hero-motion.tsx",
  ]);

  for (const file of files) {
    const code = await readFile(new URL(file, directory), "utf8");
    assert.match(code, /^"use client";/);
    assert.match(code, /useGSAP\s*\(/);
    assert.match(code, /gsap\.matchMedia\(\)/);
    assert.match(code, /scope:\s*root/);
    assert.match(code, /media\.revert\(\)/);
    assert.doesNotMatch(code, /document\.querySelectorAll|useEffect\s*\(/);
    assert.doesNotMatch(code, /duration:\s*[\d.]|stagger:\s*[\d.]|delay:\s*[\d.]/);
  }

  const [hero, timeline, admissions, homeHero, homeHeroVideo, homePreloader, homeCampus, homeAchievements, programmesHero, programmesGrid, programmesPreview, homepage, homepageStyles] = await Promise.all([
    source("components/motion/admissions-hero-motion.tsx"),
    source("components/motion/admissions-timeline-motion.tsx"),
    source("components/admissions.tsx"),
    source("components/motion/home-hero-motion.tsx"),
    source("components/motion/home-hero-video-transition.tsx"),
    source("components/motion/home-preloader-motion.tsx"),
    source("components/motion/home-campus-motion.tsx"),
    source("components/motion/home-achievements-motion.tsx"),
    source("components/motion/programmes-hero-motion.tsx"),
    source("components/motion/programmes-grid-motion.tsx"),
    source("app/publication-review/programmes-preview/page.tsx"),
    source("app/page.tsx"),
    source("app/homepage.css"),
  ]);
  assert.match(hero, /data-motion-component="admissions-hero"/);
  assert.match(hero, /motionDistancePixels\.revealMobile/);
  assert.match(hero, /motionDurationSeconds\.slow/);
  assert.match(timeline, /ScrollTrigger/);
  assert.match(timeline, /motionScrollTrigger/);
  assert.match(timeline, /items\.slice\(0, 4\)/);
  assert.match(timeline, /items\.slice\(4, 8\)/);
  assert.match(admissions, /data-motion-step/);
  assert.match(admissions, /<AdmissionsTimelineMotion preview=\{preview\}>/);
  assert.match(homeHero, /data-motion-component="home-hero"/);
  assert.match(homeHero, /reviewMode === "private-review"/);
  assert.match(homeHero, /conditions\.reduce \|\| !animateLiveHero/);
  assert.match(homeHero, /data-motion-home-hero-media/);
  assert.match(homeHero, /motionScale\.imageMaskMaximum/);
  assert.match(homeHero, /homeArrivalSignal/);
  assert.match(homeHeroVideo, /data-motion-component="home-hero-video-transition"/);
  assert.match(homeHeroVideo, /asset:\s*HomeHeroVideoAsset \| null/);
  assert.match(homeHeroVideo, /preload="none"/);
  assert.match(homeHeroVideo, /kind="captions"/);
  assert.match(homeHeroVideo, /data-home-hero-video-source/);
  assert.match(homeHeroVideo, /data-home-hero-video-captions/);
  assert.match(homeHeroVideo, /attachMedia\(\)/);
  assert.match(homeHeroVideo, /conditions\.reduce/);
  assert.match(homeHeroVideo, /video\.muted = true/);
  assert.match(homeHeroVideo, /launch\.hidden = false/);
  assert.match(homeHeroVideo, /controls\.hidden = true/);
  assert.match(homeHeroVideo, /element\.dataset\.homeHeroVideoState = "preview"/);
  assert.match(homeHeroVideo, /gsap\.killTweensOf\(\[frame, video\]\)/);
  assert.doesNotMatch(homeHeroVideo, /autoPlay|\bloop\b/);
  assert.match(homePreloader, /document\.fonts\?\.ready/);
  assert.match(homePreloader, /data-motion-home-hero-media/);
  assert.match(homePreloader, /motionDurationSeconds\.ceremonial/);
  assert.match(homePreloader, /element\.dataset\.state = "loading"/);
  assert.match(homePreloader, /element\.dataset\.state = "exit-reveal"/);
  assert.match(homePreloader, /onStart:\s*\(\) => \{[\s\S]*?announceHomeArrivalReady\(\)/);
  assert.match(homePreloader, /sessionStorage\.getItem\(homeEntrySessionKey\)/);
  assert.match(homePreloader, /get\("replayPreloader"\) === "1"/);
  assert.match(homePreloader, /scale: 1 \/ motionScale\.imageMaskMaximum/);
  assert.match(homePreloader, /data-motion-component="home-preloader"/);
  assert.match(homePreloader, /aria-hidden="true"[\s\S]*?hidden/);
  assert.doesNotMatch(homePreloader, /setInterval|loader-number|percentage|progress/i);
  assert.match(homeCampus, /data-motion-component="home-campus"/);
  assert.match(homeCampus, /ScrollTrigger/);
  assert.match(homeCampus, /for \(const block of copy\)/);
  assert.match(homeCampus, /trigger: block/);
  assert.match(homeCampus, /for \(const frame of frames\)/);
  assert.match(homeCampus, /trigger: frame/);
  assert.match(homeAchievements, /data-motion-component="home-achievements"/);
  assert.match(homeAchievements, /motionStaggerSeconds\.cards/);
  assert.match(programmesHero, /data-motion-component="programmes-hero"/);
  assert.match(programmesHero, /motionDurationSeconds\.micro \/ 2/);
  assert.match(programmesGrid, /data-motion-component="programmes-grid"/);
  assert.match(programmesGrid, /cards\.slice\(index, index \+ 4\)/);
  assert.match(programmesGrid, /motionScrollTrigger/);
  assert.match(programmesPreview, /<ProgrammesHeroMotion>/);
  assert.match(programmesPreview, /<ProgrammesGridMotion>/);
  assert.match(programmesPreview, /data-motion-programme-card/);
  assert.match(homepage, /<HomeHeroMotion reviewMode=/);
  assert.match(homepage, /privateHomepageReview \? <HomePreloaderMotion \/> : null/);
  assert.match(homepage, /data-home-hero-art/);
  assert.match(homepage, /data-motion-home-hero-media/);
  assert.match(homepage, /<HomeHeroVideoTransition asset=\{null\}>/);
  assert.match(homepageStyles, /background-image:\s*url\(["']\/og\.png["']\)/);
  assert.match(homepage, /<HomeCampusMotion\b/);
  assert.match(homepage, /<HomeAchievementsMotion\b/);
});

test("keeps the homepage P0 prototype publication-aware and readable", async () => {
  const [homepage, identity, pathways, admissions, styles] = await Promise.all([
    source("app/page.tsx"),
    source("components/home/homepage-identity-strip.tsx"),
    source("components/home/homepage-institution-pathways.tsx"),
    source("components/home/homepage-admissions-feature.tsx"),
    source("app/homepage.css"),
  ]);

  assert.match(homepage, /process\.env\.HOMEPAGE_REVIEW_MODE === "private"/);
  assert.match(homepage, /<HomepageIdentityStrip \/>/);
  assert.match(homepage, /<HomepageInstitutionPathways privateReview=\{privateHomepageReview\} \/>/);
  assert.match(homepage, /<HomepageAdmissionsFeature cycle=\{editorial\.admissionsCycle\} \/>/);

  assert.match(identity, /data-homepage-p0="identity-strip"/);
  assert.match(identity, /siteFacts\.affiliationNumber/);
  assert.match(identity, /href="\/mandatory-public-disclosure"/);
  assert.doesNotMatch(identity, /affiliat(?:ed|ion)\s+(?:until|valid)/i);

  assert.match(pathways, /PROGRAMMES_PUBLICATION_ROUTES\.flatMap/);
  assert.match(pathways, /getPublicProgrammeProfile\(route, now\)/);
  assert.match(pathways, /if \(!privateReview\) return \[\]/);
  assert.match(pathways, /data-publication-state=\{pathway\.state\}/);
  assert.doesNotMatch(pathways, /institutionPathways|publicProgrammeNavigation/);

  assert.match(admissions, /cycle\.publicStatus/);
  assert.match(admissions, /cycle\.publicMessage/);
  assert.match(admissions, /admissionsProcess\.slice\(0, 4\)/);
  assert.doesNotMatch(admissions, /Admissions Open|fee amount|result statistic/i);

  assert.doesNotMatch(styles, /\.home-hero--private-review \.home-hero__(?:desktop-poster|live-copy|mobile-media)/);
  assert.match(styles, /\.home-identity-strip/);
  assert.match(styles, /\.home-admissions-feature/);
});

test("rejects prohibited, unbounded and layout-changing motion patterns", async () => {
  const [globals, admissions, compliance, homepage, hero, timeline, homeHero, homeHeroVideo, homePreloader, homeCampus, homeAchievements, programmesHero, programmesGrid] = await Promise.all([
    source("app/globals.css"),
    source("app/admissions.css"),
    source("app/compliance.css"),
    source("app/homepage.css"),
    source("components/motion/admissions-hero-motion.tsx"),
    source("components/motion/admissions-timeline-motion.tsx"),
    source("components/motion/home-hero-motion.tsx"),
    source("components/motion/home-hero-video-transition.tsx"),
    source("components/motion/home-preloader-motion.tsx"),
    source("components/motion/home-campus-motion.tsx"),
    source("components/motion/home-achievements-motion.tsx"),
    source("components/motion/programmes-hero-motion.tsx"),
    source("components/motion/programmes-grid-motion.tsx"),
  ]);
  const cssFiles = { globals, admissions, compliance, homepage };
  const combined = `${globals}\n${admissions}\n${compliance}\n${homepage}\n${hero}\n${timeline}\n${homeHero}\n${homeHeroVideo}\n${homePreloader}\n${homeCampus}\n${homeAchievements}\n${programmesHero}\n${programmesGrid}`;

  assert.doesNotMatch(combined, /motion-duration-normal|motion-easing-standard/);
  assert.doesNotMatch(combined, /animation\s*:[^;]*(?:infinite|linear\s+infinite)/i);
  assert.doesNotMatch(combined, /transition\s*:\s*(?:width|height|top|left)\b/i);
  assert.doesNotMatch(combined, /\b(?:bounce|elastic|back\.|ScrollSmoother|Lenis|Locomotive)\b/i);
  assert.doesNotMatch(combined, /\bpin\s*:\s*true|\bscrub\s*:/i);
  assert.doesNotMatch(homepage, /\.home-services__links a:hover\s*\{[^}]*padding-inline/s);
  assert.match(homepage, /\.home-services__links a:hover i\s*\{\s*transform: translateX/);
  assert.doesNotMatch(combined, /repeat\s*:\s*-?1|cursor-follow|gyroscope|autoplay\s+sound/i);
  assert.doesNotMatch(`${globals}\n${admissions}\n${homepage}`, /(?:phase|admissions|home)-hero[^{}]*\{[^{}]*animation\s*:/s);
  assert.doesNotMatch(`${globals}\n${admissions}\n${compliance}\n${homepage}`, /\b(?:[1-9]\d*)ms\b/);
  assert.doesNotMatch(`${globals}\n${admissions}\n${compliance}\n${homepage}`, /\bwill-change\s*:/);

  for (const [name, css] of Object.entries(cssFiles)) {
    const finePointer = css.indexOf("@media (hover: hover) and (pointer: fine)");
    assert.ok(finePointer >= 0, `${name} must contain a fine-pointer hover boundary`);
    const firstHover = css.indexOf(":hover");
    assert.ok(firstHover > finePointer, `${name} must not apply hover effects before the fine-pointer boundary`);
  }
});

test("keeps essential navigation and content available without JavaScript", async () => {
  const [header, admissions, homepage, globals] = await Promise.all([
    source("components/site-header.tsx"),
    source("components/admissions.tsx"),
    source("app/page.tsx"),
    source("app/globals.css"),
  ]);

  assert.match(header, /StaticNavigationFallback/);
  assert.match(header, /Primary navigation without JavaScript/);
  assert.match(header, /setAttribute\("data-navigation-enhanced", "true"\)/);
  assert.match(header, /href="\/admissions\/enquire"/);
  assert.match(admissions, /<h1>\{title\}<\/h1>/);
  assert.match(admissions, /<Link href="\/admissions\/contact">Ask the school/);
  assert.doesNotMatch(admissions, /style=\{\{[^}]*opacity:\s*0/);
  assert.match(homepage, /Here,/);
  assert.match(homepage, /href="\/admissions\/enquire"/);
  assert.match(homepage, /Mandatory Public Disclosure/);
  assert.match(homepage, /privateHomepageReview \? <HomePreloaderMotion \/> : null/);
  assert.match(homepage, /<HomeHeroVideoTransition asset=\{null\}>/);
  assert.doesNotMatch(homepage, /style=\{\{[^}]*opacity:\s*0/);
  assert.match(globals, /site-header:not\(\[data-navigation-enhanced="true"\]\) \.mobile-menu-button/);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(globals, /scroll-behavior:\s*auto\s*!important/);
  assert.match(globals, /animation-duration:\s*0ms\s*!important/);
});
