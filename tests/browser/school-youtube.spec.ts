import { expect, test } from "@playwright/test";

test("homepage presents YouTube channel next to the existing campus tour", async ({ page }) => {
  await page.goto("/");
  const videos = page.getByRole("region", { name: "School stories. On screen." });
  await expect(videos.getByRole("link", { name: /Visit our YouTube channel/ }))
    .toHaveAttribute("href", "https://www.youtube.com/@sskemschoolveral");
  await expect(page.getByRole("button", { name: /Watch with sound/ })).toBeVisible();
});

test("YouTube player does not load until requested", async ({ page }) => {
  await page.goto("/");
  const section = page.locator(".home-campus__youtube");
  await expect(section.locator("iframe")).toHaveCount(0);
  await section.getByRole("button", { name: /Play school YouTube videos/ }).click();
  await expect(section.locator("iframe")).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/videoseries?list=UUNfsMmmnubHQVr1mAYWHJbw&rel=0",
  );
  await section.getByRole("button", { name: /Hide YouTube videos/ }).click();
  await expect(section.locator("iframe")).toHaveCount(0);
});
