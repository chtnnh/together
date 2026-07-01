import { test, expect } from "@playwright/test";

test.describe("Open Graph images", () => {
  test("room opengraph-image returns a PNG", async ({ request }) => {
    const res = await request.get("/r/e2e-og/opengraph-image");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
    const body = await res.body();
    expect(body.byteLength).toBeGreaterThan(1000);
    expect(body[0]).toBe(0x89);
    expect(body[1]).toBe(0x50); // PNG signature
  });

  test("home opengraph-image returns a PNG", async ({ request }) => {
    const res = await request.get("/opengraph-image");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  });

  test("favicon is served from public assets", async ({ request }) => {
    const res = await request.get("/icon.svg");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("svg");
  });
});
