import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, projectRoot), "utf8");
}

test("adds scroll-direction navigation without weakening existing access", async () => {
  const [hook, header, css] = await Promise.all([
    source("components/motion/use-floating-navigation-motion.ts"),
    source("components/site-header.tsx"),
    source("app/globals.css"),
  ]);

  assert.match(hook, /window\.addEventListener\(["']scroll["'], requestUpdate, \{ passive: true \}\)/);
  assert.match(hook, /window\.requestAnimationFrame\(update\)/);
  assert.match(hook, /const minimumDirectionDelta = 6/);
  assert.match(hook, /const threshold = slotTop \+ slot\.offsetHeight/);
  assert.match(hook, /interactionLocked \|\| focusWithin/);
  assert.match(hook, /isVisible: delta < 0/);
  assert.match(hook, /prefers-reduced-motion: reduce/);
  assert.match(hook, /navigation\.addEventListener\(["']focusin["'], revealForFocus\)/);
  assert.match(hook, /removeEventListener\(["']scroll["'], requestUpdate\)/);
  assert.match(hook, /cancelAnimationFrame\(frame\)/);

  assert.match(header, /useFloatingNavigationMotion/);
  assert.match(header, /interactionLocked: Boolean\(openDesktop \|\| mobileOpen \|\| searchOpen\)/);
  assert.match(header, /className=["']header-main-slot["']/);
  assert.match(header, /data-floating=\{floatingNavigation\.isFloating\}/);
  assert.match(header, /data-visible=\{floatingNavigation\.isVisible\}/);
  assert.match(header, /StaticNavigationFallback/);
  assert.match(header, /Primary navigation without JavaScript/);

  assert.match(css, /header-main\[data-floating=["']true["']\][\s\S]*?position:\s*fixed/);
  assert.match(css, /header-main\[data-floating=["']true["']\][\s\S]*?backdrop-filter:\s*blur/);
  assert.match(css, /header-main\[data-floating=["']true["']\]\[data-visible=["']false["']\][\s\S]*?pointer-events:\s*none/);
  assert.doesNotMatch(css, /transition\s*:\s*(?:width|height|top|left)\b/i);
});

test("uses bounded shared GSAP tokens and cleans up the floating-nav motion", async () => {
  const hook = await source("components/motion/use-floating-navigation-motion.ts");

  assert.match(hook, /useGSAP\s*\(/);
  assert.match(hook, /gsap\.matchMedia\(\)/);
  assert.match(hook, /motionMedia/);
  assert.match(hook, /motionDurationSeconds\.standard/);
  assert.match(hook, /motionEase\.move/);
  assert.match(hook, /motionDistancePixels\.revealMobile/);
  assert.match(hook, /gsap\.killTweensOf\(element\)/);
  assert.match(hook, /clearProps:\s*["']transform,opacity["']/);
  assert.match(hook, /overwrite:\s*["']auto["']/);
  assert.match(hook, /media\.revert\(\)/);
  assert.doesNotMatch(hook, /duration:\s*[\d.]|ease:\s*["'][^"']+["']/);
  assert.doesNotMatch(hook, /\bpin\s*:\s*true|\bscrub\s*:|repeat\s*:\s*-?1|\byoyo\s*:/i);
});
