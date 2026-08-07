import { describe, expect, it } from "vitest";
import { cn, formatDuration, slugify } from "./utils";

describe("utils", () => {
  it("cn merges class names", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("formatDuration formats mm:ss", () => {
    expect(formatDuration(125_000)).toBe("2:05");
    expect(formatDuration(undefined)).toBe("--:--");
  });

  it("slugify normalizes strings", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });
});
