import { expect, test } from "@playwright/test";

const viewports = [
  { name: "320px / 400-percent desktop equivalent", width: 320, height: 720 },
  { name: "tablet", width: 768, height: 900 },
  { name: "laptop", width: 1024, height: 800 },
  { name: "wide desktop", width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test(`reflows without page-level horizontal loss at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);
  });
}

test("supports reduced motion and representative multilingual content", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const duration = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--motion-duration-normal").trim()
  );
  expect(duration).toBe("1ms");
  await expect(page.getByText("शिक्षण, संस्कार आणि आत्मविश्वास यांचा समतोल विकास.")).toBeVisible();
  await expect(page.getByText("शिक्षा, संस्कार और आत्मविश्वास का संतुलित विकास।")).toBeVisible();
});
