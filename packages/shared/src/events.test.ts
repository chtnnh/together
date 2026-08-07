import { describe, expect, it } from "vitest";
import { clientEvents } from "./events";

describe("events", () => {
  it("parses join client event", () => {
    const parsed = clientEvents.join.safeParse({
      type: "join",
      roomId: "room-1",
      displayName: "Guest",
      anonId: "anon-1",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects chat with empty body", () => {
    const parsed = clientEvents.chat.safeParse({ type: "chat", body: "" });
    expect(parsed.success).toBe(false);
  });
});
