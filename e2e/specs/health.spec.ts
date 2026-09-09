import { expect, test } from "@playwright/test";

test("health reports mode and models without leaking a credential", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(["live", "record", "replay"]).toContain(body.mode);
  expect(typeof body.models.fast).toBe("string");
  expect(JSON.stringify(body)).not.toMatch(/sk-|Bearer|API_KEY/i);
});

test("home shows the live model status", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("health-badge")).toContainText(/Model ready|No model key/);
});
