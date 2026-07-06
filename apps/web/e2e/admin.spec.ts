import { test, expect } from "@playwright/test";

test.describe("v0.3 — Admin API", () => {
  test("GET /api/admin/stats returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/admin/stats");
    expect(res.status()).toBe(401);
  });

  test("GET /api/admin/rooms returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/admin/rooms");
    expect(res.status()).toBe(401);
  });

  test("GET /api/admin/audit returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/admin/audit");
    expect(res.status()).toBe(401);
  });

  test("GET /api/admin/abuse returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/admin/abuse");
    expect(res.status()).toBe(401);
  });
});
