import { expect, test } from "@playwright/test";
import { seed } from "./seed";

/** A learner can bring their own key: it is tested live, saved on the device, and sent as one header. */
test("model settings: test, save, and every agent call carries the key", async ({ page }) => {
  await seed(page);
  const seen: string[] = [];
  await page.route("**/api/health", async (route) => {
    const req = route.request();
    const hdr = req.headers()["x-genmentor-llm"];
    if (req.method() === "POST") {
      seen.push(hdr ?? "");
      return route.fulfill({ json: { ok: true, reply: "pong", ms: 42, model: "test-model" } });
    }
    return route.continue();
  });
  await page.goto("/learning-path");
  await page.getByTestId("open-model-settings").first().click();
  await page.getByLabel("API key").fill("sk-test-1234567890");
  await page.getByLabel("Endpoint (optional)").fill("https://example.test/v1");
  await page.getByLabel("Fast model").fill("test-model");
  await page.getByRole("button", { name: "Test", exact: true }).click();
  await expect(page.getByTestId("llm-test-result")).toContainText("pong");
  expect(JSON.parse(seen[0])).toMatchObject({ provider: "openai", apiKey: "sk-test-1234567890", baseUrl: "https://example.test/v1", fastModel: "test-model" });
  await page.getByRole("button", { name: "Save", exact: true }).click();

  // Saved on the device, and now attached to ordinary API calls.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("genmentor.llm.v1") ?? "{}"));
  expect(stored.state.byok.apiKey).toBe("sk-test-1234567890");
  // The home page's status badge is the one place that calls /api/health on load.
  const [req] = await Promise.all([page.waitForRequest((r) => r.url().includes("/api/health") && r.method() === "GET"), page.goto("/")]);
  expect(JSON.parse(req.headers()["x-genmentor-llm"])).toMatchObject({ apiKey: "sk-test-1234567890" });

  // Health now reports the learner's source and model.
  const health = await (await page.request.get("/api/health", { headers: { "x-genmentor-llm": req.headers()["x-genmentor-llm"] } })).json();
  expect(health.source).toBe("byok");
  expect(health.models.fast).toBe("test-model");
  expect(JSON.stringify(health)).not.toContain("sk-test");
});

test("invalid credentials header is ignored, not trusted", async ({ page }) => {
  const res = await page.request.get("/api/health", { headers: { "x-genmentor-llm": "not json" } });
  expect((await res.json()).source).toBe("server");
});
