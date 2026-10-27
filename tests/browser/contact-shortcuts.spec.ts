import { expect, test } from "@playwright/test";

test("school contact shortcuts link to WhatsApp, office calls and the official YouTube channel", async ({ page }) => {
  await page.goto("/");
  const shortcuts = page.getByRole("navigation", { name: "School contact shortcuts" });

  await expect(shortcuts.getByRole("link", { name: "Chat with SSKEMS on WhatsApp at 7219819806" }))
    .toHaveAttribute("href", /^https:\/\/wa\.me\/917219819806\?text=/);
  await expect(shortcuts.getByRole("link", { name: "Call SSKEMS school office at 7219819814" }))
    .toHaveAttribute("href", "tel:7219819814");
  await expect(shortcuts.getByRole("link", { name: "Watch videos on the official SSKEMS YouTube channel" }))
    .toHaveAttribute("href", "https://www.youtube.com/@sskemschoolveral");
  await expect(shortcuts.locator("a")).toHaveCount(3);
});

test("contact details and school YouTube link appear on the contact page", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("link", { name: "7219819814" }).first()).toHaveAttribute("href", "tel:7219819814");
  await expect(page.getByRole("link", { name: "7219819808" }).first()).toHaveAttribute("href", "tel:7219819808");
  await expect(page.getByRole("link", { name: "8830832123" }).first()).toHaveAttribute("href", "tel:8830832123");
  await expect(page.getByRole("link", { name: /Message school on WhatsApp/ })).toHaveAttribute("href", "https://wa.me/917219819806");
  await expect(page.getByRole("link", { name: "SSKEMS on YouTube" })).toHaveAttribute("href", "https://www.youtube.com/@sskemschoolveral");
  await expect(page.getByText(/School Code 30780/).first()).toBeVisible();
});

test("contact shortcuts are inert while the mobile navigation dialog is open", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("/");
  const shortcuts = page.getByRole("navigation", { name: "School contact shortcuts" });
  await expect(shortcuts).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(shortcuts).toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(shortcuts).not.toHaveAttribute("inert", "");
});

test("three floating actions remain accessible and compact on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  const shortcuts = page.getByRole("navigation", { name: "School contact shortcuts" });
  await expect(shortcuts.getByRole("link", { name: "Chat with SSKEMS on WhatsApp at 7219819806" })).toBeVisible();
  await expect(shortcuts.getByRole("link", { name: "Call SSKEMS school office at 7219819814" })).toBeVisible();
  await expect(shortcuts.getByRole("link", { name: "Watch videos on the official SSKEMS YouTube channel" })).toBeVisible();
  const rect = await shortcuts.boundingBox();
  expect(rect).not.toBeNull();
  expect(rect!.x).toBeGreaterThanOrEqual(0);
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(375);
});
