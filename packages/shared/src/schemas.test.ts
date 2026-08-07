import { describe, expect, it } from "vitest";
import { createRoomInputSchema, displayNameSchema, roomSettingsSchema } from "./schemas";

describe("schemas", () => {
  it("displayNameSchema rejects empty names", () => {
    expect(displayNameSchema.safeParse("").success).toBe(false);
    expect(displayNameSchema.safeParse("DJ").success).toBe(true);
  });

  it("createRoomInputSchema accepts minimal create payload", () => {
    const result = createRoomInputSchema.safeParse({ displayName: "Host" });
    expect(result.success).toBe(true);
  });

  it("roomSettingsSchema applies defaults", () => {
    const parsed = roomSettingsSchema.parse({});
    expect(parsed.skipThreshold).toBeGreaterThan(0);
    expect(parsed.democraticPromote).toBe(false);
  });
});
