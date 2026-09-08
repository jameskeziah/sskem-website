import { expect, test } from "@playwright/test";

import budget from "../../content/programmes-performance-budget.json" with { type: "json" };

declare global {
  interface Window {
    __programmeVitals?: { cls: number; lcp: number };
  }
}

const routes = budget.scope.routes;

function durationMs(value: string) {
  return value.split(",").reduce((maximum, part) => {
    const duration = part.trim();
    const milliseconds = duration.endsWith("ms")
      ? Number.parseFloat(duration)
      : Number.parseFloat(duration) * 1000;
    return Math.max(maximum, Number.isFinite(milliseconds) ? milliseconds : 0);
  }, 0);
}

for (const route of routes) {
  test(`${route} stays inside the Programme runtime performance budget`, async ({ page }) => {
    await page.addInitScript(() => {
      window.__programmeVitals = { cls: 0, lcp: 0 };
      try {
        new PerformanceObserver((list) => {
          const last = list.getEntries().at(-1);
          if (last && window.__programmeVitals) window.__programmeVitals.lcp = last.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
            if (!shift.hadRecentInput && window.__programmeVitals) {
              window.__programmeVitals.cls += shift.value ?? 0;
            }
          }
        }).observe({ type: "layout-shift", buffered: true });
      } catch {
        // The assertions below fail closed when a required observer is unavailable.
      }
    });

    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.locator("main[data-private-programme-shell]")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);

    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const entries = [...navigation, ...resources];
      const measured = entries.map((entry) => ({
        name: entry.name,
        bytes: entry.transferSize || entry.encodedBodySize || 0,
        initiatorType: "initiatorType" in entry ? entry.initiatorType : "navigation",
      }));
      const fontResources = measured.filter((entry) => /\.(?:woff2?|ttf|otf)(?:\?|$)/i.test(entry.name));
      const videoResources = measured.filter((entry) => /\.(?:mp4|webm)(?:\?|$)/i.test(entry.name));
      const hero = document.querySelector<HTMLImageElement>(".private-programme-shell__media img");
      const heroEntry = hero
        ? measured.find((entry) => entry.name === hero.currentSrc || entry.name.endsWith(hero.getAttribute("src") ?? ""))
        : undefined;
      const elements = [...document.querySelectorAll<HTMLElement>("*")];
      const animationState = elements.reduce((state, element) => {
        const style = getComputedStyle(element);
        const durations = [style.animationDuration, style.transitionDuration]
          .flatMap((value) => value.split(","))
          .map((value) => value.trim())
          .map((value) => value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000)
          .filter(Number.isFinite);
        state.maximumDurationMs = Math.max(state.maximumDurationMs, ...durations, 0);
        state.infiniteAnimations += style.animationIterationCount.split(",").filter((value) => value.trim() === "infinite").length;
        return state;
      }, { infiniteAnimations: 0, maximumDurationMs: 0 });

      return {
        requests: measured.length,
        transferBytes: measured.reduce((total, entry) => total + entry.bytes, 0),
        zeroByteEntries: measured.filter((entry) => entry.bytes === 0).map((entry) => entry.name),
        fontFiles: fontResources.length,
        fontBytes: fontResources.reduce((total, entry) => total + entry.bytes, 0),
        videoBytes: videoResources.reduce((total, entry) => total + entry.bytes, 0),
        heroBytes: heroEntry?.bytes ?? 0,
        motionComponents: document.querySelectorAll("[data-motion-component]").length,
        autoplayMedia: document.querySelectorAll("video[autoplay], audio[autoplay]").length,
        ...animationState,
        cls: window.__programmeVitals?.cls ?? -1,
        lcp: window.__programmeVitals?.lcp ?? -1,
      };
    });

    const evidence = JSON.stringify(metrics, null, 2);
    expect(metrics.zeroByteEntries, `Every initial resource must expose a measurable transfer size.\n${evidence}`).toEqual([]);
    expect(metrics.transferBytes, evidence).toBeLessThanOrEqual(budget.pageWeight.maximumInitialTransferBytes);
    expect(metrics.requests, evidence).toBeLessThanOrEqual(budget.pageWeight.maximumRequests);
    expect(metrics.heroBytes, evidence).toBeGreaterThan(0);
    expect(metrics.heroBytes, evidence).toBeLessThanOrEqual(budget.heroMedia.maximumImageBytes);
    expect(metrics.videoBytes, evidence).toBeLessThanOrEqual(budget.heroMedia.maximumInitialVideoTransferBytes);
    expect(metrics.fontFiles, evidence).toBeLessThanOrEqual(budget.fonts.maximumFiles);
    expect(metrics.fontBytes, evidence).toBeLessThanOrEqual(budget.fonts.maximumTransferBytes);
    expect(metrics.motionComponents, evidence).toBeLessThanOrEqual(budget.animations.maximumMotionComponents);
    expect(metrics.autoplayMedia, evidence).toBeLessThanOrEqual(budget.animations.maximumAutoplayMedia);
    expect(metrics.infiniteAnimations, evidence).toBeLessThanOrEqual(budget.animations.maximumInfiniteAnimations);
    expect(metrics.maximumDurationMs, evidence).toBeLessThanOrEqual(budget.animations.maximumSingleDurationMs);
    expect(metrics.lcp, evidence).toBeGreaterThan(0);
    expect(metrics.lcp, evidence).toBeLessThanOrEqual(budget.webVitals.maximumLcpMs);
    expect(metrics.cls, evidence).toBeGreaterThanOrEqual(0);
    expect(metrics.cls, evidence).toBeLessThanOrEqual(budget.webVitals.maximumCls);
  });
}

test("the Programme performance thresholds are internally coherent", () => {
  expect(durationMs(`${budget.animations.maximumSingleDurationMs}ms`)).toBe(700);
  expect(budget.heroMedia.maximumInitialVideoTransferBytes).toBe(0);
  expect(budget.fonts.systemFontsOnly).toBe(true);
  expect(budget.webVitals.maximumLcpMs).toBe(2500);
  expect(budget.webVitals.maximumCls).toBe(0.1);
});
