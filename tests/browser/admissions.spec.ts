import { expect, test } from "@playwright/test";

test("admissions hub keeps the three parent journeys distinct", async ({ page }) => {
  await page.goto("/admissions");

  await expect(page.getByRole("heading", { name: /Admissions/i, level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Make an Enquiry", exact: true })).toHaveAttribute(
    "href",
    "/admissions/enquire",
  );
  await expect(page.getByRole("link", { name: "Start an Application", exact: true })).toHaveAttribute(
    "href",
    "/admissions/apply",
  );
  await expect(page.getByRole("link", { name: "Check Application Status", exact: true })).toHaveAttribute(
    "href",
    "/admissions/application-status",
  );
});

test("unverified age rules resolve to manual review without guaranteeing admission", async ({ page }) => {
  await page.goto("/admissions/age-criteria");

  await page.getByLabel(/Child(?:'|’)?s date of birth/i).fill("2020-01-01");
  const classField = page.getByLabel("Class sought", { exact: true });
  await expect(classField).toBeVisible();
  await classField.selectOption({ label: "Class I" });
  await page.getByRole("button", { name: "Check eligibility", exact: true }).click();

  await expect(page.getByText("Requires manual review", { exact: false }).last()).toBeVisible();
  await expect(page.getByText("Admission guaranteed", { exact: false })).toHaveCount(0);
});

test("mobile enquiry remains short and does not collect sensitive evidence", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/admissions/enquire");

  const form = page.locator("form").filter({ has: page.getByLabel(/Parent (?:or|\/) guardian name/i) });
  await expect(form).toBeVisible();
  await expect(form.getByLabel(/Mobile number/i)).toBeVisible();
  await expect(form.getByLabel(/Child(?:'|’)?s name/i)).toBeVisible();
  await expect(form.getByLabel("Class sought", { exact: true })).toBeVisible();
  await expect(form.getByLabel(/Consent to be contacted|I consent/i)).toBeVisible();
  await expect(form.locator('input[type="file"]')).toHaveCount(0);

  const sensitiveInputs = await form.locator("input, select, textarea").evaluateAll((fields) =>
    fields.filter((field) => {
      const input = field as HTMLInputElement;
      const identifier = `${input.name} ${input.id} ${input.placeholder}`.toLowerCase();
      return /aadhaar|aadhar|birth.?certificate|caste|income.?certificate|medical.?history|marksheet|bank.?detail/.test(
        identifier,
      );
    }).length,
  );
  expect(sensitiveInputs).toBe(0);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
