import { afterEach, describe, expect, it } from "vitest";
import {
  filterMentionMatches,
  isMentionedByYou,
  matchMentionAt,
  parseMentionQuery,
} from "./chat-mentions";
import { applyServerTimestamp } from "./clock-sync";
import {
  checkRateLimit,
  getClientIp,
  type RateLimitRule,
  resetRateLimitStoreForTests,
} from "./rate-limit";
import { shouldToastTrackSkipped } from "./skip-feedback";

describe("chat-mentions", () => {
  const participants = [
    {
      id: "p1",
      displayName: "Alice",
      anonId: "a1",
      role: "host" as const,
      latencyMs: 0,
      lastChatAt: 0,
    },
    {
      id: "p2",
      displayName: "Bob",
      anonId: "b1",
      role: "guest" as const,
      latencyMs: 0,
      lastChatAt: 0,
    },
  ];

  it("filterMentionMatches filters by query", () => {
    expect(filterMentionMatches(participants, "al")).toHaveLength(1);
    expect(filterMentionMatches(participants, null)).toHaveLength(0);
  });

  it("parseMentionQuery reads token at cursor", () => {
    expect(parseMentionQuery("hi @bo", 6)).toBe("bo");
    expect(parseMentionQuery("email@test.com", 5)).toBeNull();
  });

  it("isMentionedByYou detects @you", () => {
    expect(isMentionedByYou("@Alice hello", "p1", participants)).toBe(true);
    expect(isMentionedByYou("@Bob hi", "p1", participants)).toBe(false);
  });

  it("matchMentionAt resolves display names", () => {
    const body = "hey @Alice!";
    const at = body.indexOf("@");
    expect(matchMentionAt(body, at, participants)?.id).toBe("p1");
  });
});

describe("clock-sync", () => {
  it("applyServerTimestamp smooths offset", () => {
    expect(applyServerTimestamp(0, 5000, 4800)).toBe(200);
  });
});

describe("skip-feedback", () => {
  it("shouldToastTrackSkipped when newest history entry was skipped", () => {
    const history = [
      {
        id: "1",
        source: "youtube" as const,
        videoId: "abc",
        title: "Track",
        addedBy: "DJ",
        addedById: "p1",
        finishedAt: Date.now(),
        reason: "skipped" as const,
      },
    ];
    expect(shouldToastTrackSkipped(history, 0)).toBe(true);
    expect(shouldToastTrackSkipped(history, 1)).toBe(false);
  });
});

describe("rate-limit", () => {
  const rule: RateLimitRule = {
    name: `unit-${Date.now()}`,
    limit: 2,
    windowMs: 60_000,
  };

  afterEach(() => {
    resetRateLimitStoreForTests();
  });

  it("checkRateLimit blocks over limit", () => {
    const ip = `test-${Math.random()}`;
    expect(checkRateLimit(ip, rule).allowed).toBe(true);
    expect(checkRateLimit(ip, rule).allowed).toBe(true);
    expect(checkRateLimit(ip, rule).allowed).toBe(false);
  });

  it("getClientIp prefers test header", () => {
    const req = new Request("http://localhost", {
      headers: { "x-together-test-ip": "1.2.3.4" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });
});
