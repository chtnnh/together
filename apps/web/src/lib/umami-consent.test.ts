import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import {
  canLoadUmamiRecorder,
  canLoadUmamiTracker,
  hasCredentialQuery,
  isDoNotTrackEnabled,
  isUmamiExcludedRoute,
  resolveUmamiConsent,
  sanitizeUmamiPayload,
  sanitizeUmamiUrl,
} from "./umami-consent";

type TrackerState = { consent: string; doNotTrack: string };
type History = {
  pushState: (data: unknown, unused: string, url?: string | URL | null) => void;
};

const trackerStateChanges: Array<[string, (state: TrackerState, history: History) => void]> = [
  ["navigates to admin", (_state, history) => history.pushState(null, "", "/admin/users")],
  [
    "enables Do Not Track",
    (state) => {
      state.doNotTrack = "1";
    },
  ],
];

describe("Umami consent", () => {
  it("requires affirmative consent and lets DNT veto stored replay consent", () => {
    expect(resolveUmamiConsent(null, false)).toBe("essential");
    expect(resolveUmamiConsent("replay", true)).toBe("essential");
    expect(canLoadUmamiTracker("essential")).toBe(true);
    expect(canLoadUmamiTracker("basic")).toBe(true);
    expect(isUmamiExcludedRoute("/admin")).toBe(true);
    expect(isUmamiExcludedRoute("/admin/users")).toBe(true);
    expect(isUmamiExcludedRoute("/r/public-room")).toBe(false);
    expect(canLoadUmamiRecorder("basic")).toBe(false);
    expect(canLoadUmamiRecorder("replay")).toBe(true);
    expect(isDoNotTrackEnabled({ doNotTrack: "yes" })).toBe(true);
    expect(isDoNotTrackEnabled(undefined, { doNotTrack: "1" })).toBe(true);
    expect(isDoNotTrackEnabled({ doNotTrack: "0", msDoNotTrack: "yes" }, { doNotTrack: "0" })).toBe(
      true,
    );
    expect(isDoNotTrackEnabled({ doNotTrack: "0", msDoNotTrack: "0" }, { doNotTrack: "1" })).toBe(
      true,
    );
  });
});

describe("Umami URL sanitization", () => {
  it("recognizes credential-bearing query keys", () => {
    for (const key of [
      "password",
      "token",
      "code",
      "state",
      "access_token",
      "refresh_token",
      "email",
    ]) {
      expect(hasCredentialQuery(`/r/public-room?${key}=secret`)).toBe(true);
    }
    expect(hasCredentialQuery("/r/public-room?theme=dark")).toBe(false);
  });

  it("recognizes credential-bearing hash keys", () => {
    expect(hasCredentialQuery("/auth/callback#access_token=secret&state=opaque")).toBe(true);
    expect(hasCredentialQuery("/r/public-room#theme=dark")).toBe(false);
  });

  it("retains standard UTM attribution while removing other queries and room identities", () => {
    expect(
      sanitizeUmamiUrl(
        "https://together.example/r/secret-room?utm_source=producthunt&utm_campaign=launch&token=secret#invite",
      ),
    ).toBe("https://together.example/r/[room]?utm_source=producthunt&utm_campaign=launch");
  });

  it("removes hashes from malformed URL fallbacks", () => {
    expect(sanitizeUmamiUrl("http://[#access_token=secret")).toBe("http://[");
    expect(sanitizeUmamiUrl("http://[/r/secret-room?token=secret#fragment")).toBe(
      "http://[/r/[room]",
    );
  });

  it("sanitizes tracker and replay URL fields recursively", () => {
    expect(
      sanitizeUmamiPayload({
        url: "https://together.example/r/secret-room?password=secret",
        events: [
          {
            data: {
              href: "/r/another-room?invite=secret#chat",
              action: "/r/action-room?token=secret#submit",
              rr_src: "https://together.example/r/third-room?token=secret",
              referrer: "https://together.example/r/fourth-room?token=secret#invite",
              srcset:
                "https://together.example/r/fifth-room?token=secret 1x, https://together.example/r/sixth-room#invite 2x",
            },
          },
        ],
      }),
    ).toEqual({
      url: "https://together.example/r/[room]",
      events: [
        {
          data: {
            href: "https://together.invalid/r/[room]",
            action: "https://together.invalid/r/[room]",
            rr_src: "https://together.example/r/[room]",
            referrer: "https://together.example/r/[room]",
            srcset: "https://together.example/r/[room] 1x, https://together.example/r/[room] 2x",
          },
        },
      ],
    });
  });

  it("preserves an empty direct-visit referrer", () => {
    expect(sanitizeUmamiPayload({ referrer: "" })).toEqual({ referrer: "" });
  });

  it("replaces tracker titles with a generic value", () => {
    expect(
      sanitizeUmamiPayload({
        title: "Private room — secret-room",
        payload: { title: "Another secret room" },
      }),
    ).toEqual({ title: "Together", payload: { title: "Together" } });
  });
});

describe("Umami recorder sanitizer", () => {
  it("forwards first-visit tracker requests without a Referer but blocks the recorder", async () => {
    const calls: Array<{ input: unknown; init?: RequestInit }> = [];
    const window = {
      location: { origin: "https://together.example", pathname: "/r/public-room" },
      localStorage: { getItem: () => null },
      doNotTrack: "0",
      addEventListener: () => undefined,
      fetch: async (input: unknown, init?: RequestInit) => {
        calls.push({ input, init });
        return new Response();
      },
      history: { pushState: () => undefined, replaceState: () => undefined },
    };
    const source = readFileSync(
      new URL("../../public/umami-recorder-sanitizer.js", import.meta.url),
      "utf8",
    );
    vm.runInNewContext(source, {
      Map,
      Promise,
      Response,
      URL,
      JSON,
      Object,
      String,
      Number,
      navigator: { doNotTrack: "0" },
      window,
    });

    await window.fetch("/w/a/api/send", { method: "POST" });
    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({ payload: { events: [{ type: 3, data: {} }] } }),
    });

    expect(calls).toHaveLength(1);
    expect(calls.map(({ init }) => init?.referrerPolicy)).toEqual(["no-referrer"]);
  });

  it.each(trackerStateChanges)(
    "blocks tracker egress after a clean permitted session %s",
    async (_reason, changeState) => {
      const calls: unknown[] = [];
      const state: TrackerState = { consent: "basic", doNotTrack: "0" };
      const window = {
        location: { origin: "https://together.example", pathname: "/r/public-room" },
        localStorage: { getItem: () => state.consent },
        get doNotTrack() {
          return state.doNotTrack;
        },
        addEventListener: () => undefined,
        fetch: async (_input: unknown, _init?: RequestInit) => {
          calls.push(_input);
          return new Response();
        },
      };
      const history = {
        pushState: (_data: unknown, _unused: string, url?: string | URL | null) => {
          if (url) window.location.pathname = new URL(url, window.location.origin).pathname;
        },
      };
      Object.assign(window, { history });
      const source = readFileSync(
        new URL("../../public/umami-recorder-sanitizer.js", import.meta.url),
        "utf8",
      );
      vm.runInNewContext(source, {
        Map,
        Promise,
        Response,
        URL,
        URLSearchParams,
        JSON,
        Object,
        String,
        Number,
        navigator: {
          get doNotTrack() {
            return state.doNotTrack;
          },
        },
        window,
      });

      await window.fetch("/w/a/api/send", { method: "POST" });
      expect(calls).toHaveLength(1);

      changeState(state, history);
      await window.fetch("/w/a/api/send", { method: "POST" });
      expect(calls).toHaveLength(1);
    },
  );

  it("blocks a buffered admin canary after client-side navigation to a room", async () => {
    const calls: unknown[] = [];
    const listeners = new Map<string, () => void>();
    const window = {
      location: { origin: "https://together.example", pathname: "/admin/users" },
      localStorage: { getItem: () => "replay" },
      doNotTrack: "0",
      addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
      fetch: async (_input: unknown, init?: { body?: string }) => {
        calls.push(init?.body);
        return new Response();
      },
    };
    const history = {
      pushState: (_data: unknown, _unused: string, url?: string | URL | null) => {
        if (url) window.location.pathname = new URL(url, window.location.origin).pathname;
      },
      replaceState: (_data: unknown, _unused: string, url?: string | URL | null) => {
        if (url) window.location.pathname = new URL(url, window.location.origin).pathname;
      },
    };
    Object.assign(window, { history });
    const source = readFileSync(
      new URL("../../public/umami-recorder-sanitizer.js", import.meta.url),
      "utf8",
    );
    vm.runInNewContext(source, {
      Map,
      Promise,
      Response,
      URL,
      JSON,
      Object,
      String,
      Number,
      navigator: { doNotTrack: "0" },
      window,
    });

    const adminCanary = "admin-only-canary";
    // The recorder can retain this event locally while it is on /admin.
    expect(window.location.pathname).toBe("/admin/users");
    expect(adminCanary).toBe("admin-only-canary");
    history.pushState(null, "", "/r/public-room");
    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({ payload: { events: [{ type: 3, data: { text: adminCanary } }] } }),
    });

    expect(calls).toHaveLength(0);
  });

  it("blocks recorder egress after client-side navigation from a room to admin", async () => {
    const calls: unknown[] = [];
    const window = {
      location: { origin: "https://together.example", pathname: "/r/public-room" },
      localStorage: { getItem: () => "replay" },
      doNotTrack: "0",
      addEventListener: () => undefined,
      fetch: async (_input: unknown, init?: { body?: string }) => {
        calls.push(init?.body);
        return new Response();
      },
    };
    const history = {
      pushState: (_data: unknown, _unused: string, url?: string | URL | null) => {
        if (url) window.location.pathname = new URL(url, window.location.origin).pathname;
      },
    };
    Object.assign(window, { history });
    const source = readFileSync(
      new URL("../../public/umami-recorder-sanitizer.js", import.meta.url),
      "utf8",
    );
    vm.runInNewContext(source, {
      Map,
      Promise,
      Response,
      URL,
      JSON,
      Object,
      String,
      Number,
      navigator: { doNotTrack: "0" },
      window,
    });

    history.pushState(null, "", "/admin/users");
    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({ payload: { events: [{ type: 3, data: {} }] } }),
    });

    expect(calls).toHaveLength(0);
  });

  it("blocks recorder egress after a credential-bearing hash-query SPA visit", async () => {
    const calls: unknown[] = [];
    const window = {
      location: {
        origin: "https://together.example",
        pathname: "/r/public-room",
        search: "",
        hash: "",
      },
      localStorage: { getItem: () => "replay" },
      doNotTrack: "0",
      addEventListener: () => undefined,
      fetch: async (_input: unknown, init?: { body?: string }) => {
        calls.push(init?.body);
        return new Response();
      },
    };
    const history = {
      pushState: (_data: unknown, _unused: string, url?: string | URL | null) => {
        if (url) {
          const next = new URL(url, window.location.origin);
          Object.assign(window.location, {
            pathname: next.pathname,
            search: next.search,
            hash: next.hash,
          });
        }
      },
    };
    Object.assign(window, { history });
    const source = readFileSync(
      new URL("../../public/umami-recorder-sanitizer.js", import.meta.url),
      "utf8",
    );
    vm.runInNewContext(source, {
      Map,
      Promise,
      Response,
      URL,
      URLSearchParams,
      JSON,
      Object,
      String,
      Number,
      navigator: { doNotTrack: "0" },
      window,
    });

    history.pushState(null, "", "/r/public-room#?token=secret");
    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({ payload: { events: [{ type: 3, data: {} }] } }),
    });

    expect(calls).toHaveLength(0);
  });

  it.each([
    ["consent changes away from replay", "basic", "0"],
    ["Do Not Track becomes active", "replay", "1"],
  ])(
    "blocks an executing recorder's unload flush when %s",
    async (_reason, consent, doNotTrack) => {
      const calls: unknown[] = [];
      const localStorage = { getItem: () => consent };
      const navigator = { doNotTrack };
      const window = {
        location: { origin: "https://together.example" },
        localStorage,
        doNotTrack,
        fetch: async (_input: unknown, init?: { body?: string }) => {
          calls.push(init?.body);
          return new Response();
        },
      };
      const source = readFileSync(
        new URL("../../public/umami-recorder-sanitizer.js", import.meta.url),
        "utf8",
      );
      vm.runInNewContext(source, {
        Map,
        Promise,
        Response,
        URL,
        JSON,
        Object,
        String,
        Number,
        navigator,
        window,
      });

      await window.fetch("/w/a/api/record", {
        body: JSON.stringify({ payload: { events: [{ type: 3, data: {} }] } }),
      });

      expect(calls).toHaveLength(0);
    },
  );

  it("reassembles actual recorder fragments before sanitizing their egress", async () => {
    const rawCanary = "https://together.example/r/canary-room?token=canary#invite";
    const serialized = JSON.stringify({ action: rawCanary });
    const middle = Math.floor(serialized.length / 2);
    const calls: unknown[] = [];
    const window = {
      location: { origin: "https://together.example" },
      localStorage: { getItem: () => "replay" },
      doNotTrack: "0",
      fetch: async (_input: unknown, init?: { body?: string }) => {
        calls.push(init?.body);
        return new Response();
      },
    };
    const source = readFileSync(
      new URL("../../public/umami-recorder-sanitizer.js", import.meta.url),
      "utf8",
    );
    vm.runInNewContext(source, {
      Map,
      Promise,
      Response,
      URL,
      JSON,
      Object,
      String,
      Number,
      navigator: { doNotTrack: "0" },
      window,
    });

    const sendFragment = (index: number, value: string) =>
      window.fetch("/w/a/api/record", {
        body: JSON.stringify({
          payload: {
            events: [
              {
                type: "umami:rrweb-event-fragment",
                data: { id: "canary", index, total: 2, value },
              },
            ],
          },
        }),
      });

    await sendFragment(0, serialized.slice(0, middle));
    await sendFragment(1, serialized.slice(middle));

    const egress = calls.join("\n");
    const reassembled = calls
      .map((body) => JSON.parse(String(body)).payload.events[0].data.value)
      .join("");
    expect(egress).not.toContain(rawCanary);
    expect(reassembled).toContain("/r/[room]");
  });

  it("tracks title topology from a fragmented full snapshot for later mutations", async () => {
    const roomTitle = "Private room — secret-room";
    const calls: Array<{ init?: { body?: string } }> = [];
    const window = {
      location: { origin: "https://together.example" },
      localStorage: { getItem: () => "replay" },
      doNotTrack: "0",
      fetch: async (_input: unknown, init?: { body?: string }) => {
        calls.push({ init });
        return new Response();
      },
    };
    const source = readFileSync(
      new URL("../../public/umami-recorder-sanitizer.js", import.meta.url),
      "utf8",
    );
    vm.runInNewContext(source, {
      Map,
      Promise,
      Response,
      URL,
      JSON,
      Object,
      String,
      Number,
      navigator: { doNotTrack: "0" },
      window,
    });

    const fullSnapshot = JSON.stringify({
      type: 2,
      data: {
        node: {
          type: 0,
          childNodes: [
            {
              type: 1,
              id: 3,
              tagName: "title",
              childNodes: [{ type: 3, id: 4, textContent: roomTitle }],
            },
          ],
        },
      },
    });
    const middle = Math.floor(fullSnapshot.length / 2);
    const sendFragment = (index: number, value: string) =>
      window.fetch("/w/a/api/record", {
        body: JSON.stringify({
          payload: {
            events: [
              {
                type: "umami:rrweb-event-fragment",
                data: { id: "full-snapshot", index, total: 2, value },
              },
            ],
          },
        }),
      });

    await sendFragment(0, fullSnapshot.slice(0, middle));
    await sendFragment(1, fullSnapshot.slice(middle));
    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [{ type: 3, data: { source: 0, texts: [{ id: 4, value: roomTitle }] } }],
        },
      }),
    });

    const mutation = JSON.parse(String(calls.at(-1)?.init?.body));
    expect(mutation.payload.events[0].data.texts).toEqual([{ id: 4, value: "Together" }]);
  });

  it("removes a room title from a full-snapshot head node", async () => {
    const calls: Array<{ init?: { body?: string } }> = [];
    const window = {
      location: { origin: "https://together.example" },
      localStorage: { getItem: () => "replay" },
      doNotTrack: "0",
      fetch: async (_input: unknown, init?: { body?: string }) => {
        calls.push({ init });
        return new Response();
      },
    };
    const source = readFileSync(
      new URL("../../public/umami-recorder-sanitizer.js", import.meta.url),
      "utf8",
    );
    vm.runInNewContext(source, {
      Map,
      Promise,
      Response,
      URL,
      JSON,
      Object,
      String,
      Number,
      navigator: { doNotTrack: "0" },
      window,
    });

    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [
            {
              type: 2,
              data: {
                node: {
                  type: 1,
                  tagName: "head",
                  childNodes: [
                    {
                      type: 1,
                      tagName: "title",
                      childNodes: [{ type: 3, textContent: "Private room — secret-room" }],
                    },
                    {
                      type: 1,
                      id: 10,
                      tagName: "meta",
                      attributes: {
                        content:
                          "Listen together in Private room — secret-room. https://together.example/r/secret-room",
                        property: "og:description",
                      },
                    },
                    {
                      type: 1,
                      tagName: "meta",
                      attributes: {
                        content:
                          "width=device-width, initial-scale=1, interactive-widget=resizes-content",
                        name: "viewport",
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      }),
    });

    const egress = JSON.stringify(calls);
    expect(egress).not.toContain("secret-room");
    expect(egress).not.toContain("https://together.example/r/secret-room");
    expect(egress).toContain("interactive-widget=resizes-content");
    expect(egress).toContain("Together");

    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [
            {
              type: 3,
              data: {
                source: 0,
                attributes: [{ id: 10, attributes: { content: "updated-secret" } }],
              },
            },
          ],
        },
      }),
    });
    expect(JSON.stringify(calls)).not.toContain("updated-secret");

    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [
            {
              type: 2,
              data: {
                node: {
                  type: 1,
                  tagName: "head",
                  childNodes: [
                    {
                      type: 1,
                      id: 10,
                      tagName: "meta",
                      attributes: {
                        content: "width=device-width, interactive-widget=resizes-content",
                        name: "viewport",
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      }),
    });
    expect(String(calls.at(-1)?.init?.body)).toContain("interactive-widget=resizes-content");

    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [
            {
              type: 3,
              data: {
                source: 0,
                attributes: [
                  {
                    id: 10,
                    attributes: {
                      content: "private-room-secret",
                      name: null,
                      property: "og:description",
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
    });
    expect(String(calls.at(-1)?.init?.body)).not.toContain("private-room-secret");

    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [
            {
              type: 2,
              data: {
                node: {
                  type: 1,
                  tagName: "head",
                  childNodes: [
                    {
                      type: 1,
                      id: 10,
                      tagName: "meta",
                      attributes: { content: "private-room-secret", name: "description" },
                    },
                  ],
                },
              },
            },
          ],
        },
      }),
    });
    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [
            {
              type: 3,
              data: {
                source: 0,
                removes: [{ id: 10 }],
                adds: [
                  {
                    parentId: 0,
                    node: {
                      type: 1,
                      id: 10,
                      tagName: "meta",
                      attributes: { content: "width=device-width", name: "viewport" },
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
    });
    expect(String(calls.at(-1)?.init?.body)).toContain("width=device-width");
  });

  it("removes title text mutations after the title node appeared in a full snapshot", async () => {
    const roomTitle = "Private room — secret-room";
    const calls: Array<{ init?: { body?: string } }> = [];
    const window = {
      location: { origin: "https://together.example" },
      localStorage: { getItem: () => "replay" },
      doNotTrack: "0",
      fetch: async (_input: unknown, init?: { body?: string }) => {
        calls.push({ init });
        return new Response();
      },
    };
    const source = readFileSync(
      new URL("../../public/umami-recorder-sanitizer.js", import.meta.url),
      "utf8",
    );
    vm.runInNewContext(source, {
      Map,
      Promise,
      Response,
      URL,
      JSON,
      Object,
      String,
      Number,
      navigator: { doNotTrack: "0" },
      window,
    });

    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [
            {
              type: 2,
              data: {
                node: {
                  type: 0,
                  childNodes: [
                    {
                      type: 1,
                      id: 2,
                      tagName: "head",
                      childNodes: [
                        {
                          type: 1,
                          id: 3,
                          tagName: "title",
                          childNodes: [{ type: 3, id: 4, textContent: roomTitle }],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        },
      }),
    });
    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [
            {
              type: 3,
              data: {
                source: 0,
                texts: [
                  { id: 4, value: roomTitle },
                  { id: 99, value: "Public page heading" },
                ],
              },
            },
          ],
        },
      }),
    });

    const incremental = JSON.parse(String(calls[1].init?.body));
    expect(JSON.stringify(incremental)).not.toContain("secret-room");
    expect(incremental.payload.events[0].data.texts).toEqual([
      { id: 4, value: "Together" },
      { id: 99, value: "Public page heading" },
    ]);
  });

  it("preserves unrelated text when a title mutation is coalesced with topology changes", async () => {
    const roomTitle = "Private room — secret-room";
    const publicText = "Public playback status";
    const calls: Array<{ init?: { body?: string } }> = [];
    const window = {
      location: { origin: "https://together.example" },
      localStorage: { getItem: () => "replay" },
      doNotTrack: "0",
      fetch: async (_input: unknown, init?: { body?: string }) => {
        calls.push({ init });
        return new Response();
      },
    };
    const source = readFileSync(
      new URL("../../public/umami-recorder-sanitizer.js", import.meta.url),
      "utf8",
    );
    vm.runInNewContext(source, {
      Map,
      Promise,
      Response,
      URL,
      JSON,
      Object,
      String,
      Number,
      navigator: { doNotTrack: "0" },
      window,
    });

    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [
            {
              type: 2,
              data: {
                node: {
                  type: 0,
                  childNodes: [
                    {
                      type: 1,
                      id: 3,
                      tagName: "title",
                      childNodes: [{ type: 3, id: 4, textContent: roomTitle }],
                    },
                    { type: 1, id: 99, tagName: "div", childNodes: [{ type: 3, id: 100 }] },
                  ],
                },
              },
            },
          ],
        },
      }),
    });
    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [
            {
              type: 3,
              data: {
                source: 0,
                removes: [{ parentId: 99, id: 100 }],
                adds: [{ parentId: 99, node: { type: 3, id: 101, textContent: "Now playing" } }],
                texts: [
                  { id: 4, value: roomTitle },
                  { id: 100, value: publicText },
                ],
              },
            },
          ],
        },
      }),
    });

    const mutation = JSON.parse(String(calls[1].init?.body));
    expect(JSON.stringify(mutation)).not.toContain("secret-room");
    expect(mutation.payload.events[0].data.texts).toEqual([
      { id: 4, value: "Together" },
      { id: 100, value: publicText },
    ]);
  });

  it("sanitizes title mutations before a later event in the same record request reparents them", async () => {
    const roomTitle = "Private room — secret-room";
    const calls: Array<{ init?: { body?: string } }> = [];
    const window = {
      location: { origin: "https://together.example" },
      localStorage: { getItem: () => "replay" },
      doNotTrack: "0",
      fetch: async (_input: unknown, init?: { body?: string }) => {
        calls.push({ init });
        return new Response();
      },
    };
    const source = readFileSync(
      new URL("../../public/umami-recorder-sanitizer.js", import.meta.url),
      "utf8",
    );
    vm.runInNewContext(source, {
      Map,
      Promise,
      Response,
      URL,
      JSON,
      Object,
      String,
      Number,
      navigator: { doNotTrack: "0" },
      window,
    });

    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [
            {
              type: 2,
              data: {
                node: {
                  type: 0,
                  childNodes: [
                    {
                      type: 1,
                      id: 2,
                      tagName: "head",
                      childNodes: [
                        {
                          type: 1,
                          id: 3,
                          tagName: "title",
                          childNodes: [{ type: 3, id: 4, textContent: roomTitle }],
                        },
                      ],
                    },
                    { type: 1, id: 99, tagName: "div" },
                  ],
                },
              },
            },
          ],
        },
      }),
    });
    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [
            { type: 3, data: { source: 0, texts: [{ id: 4, value: roomTitle }] } },
            {
              type: 3,
              data: {
                source: 0,
                removes: [{ parentId: 3, id: 4 }],
                adds: [
                  { parentId: 99, node: { type: 3, id: 4, textContent: "Public page heading" } },
                ],
              },
            },
          ],
        },
      }),
    });

    const batched = JSON.parse(String(calls[1].init?.body));
    expect(batched.payload.events[0].data.texts).toEqual([{ id: 4, value: "Together" }]);
    expect(JSON.stringify(batched)).not.toContain("secret-room");
  });

  it("fails closed when a title descendant is reparented with a text mutation", async () => {
    const roomTitle = "Private room — secret-room";
    const calls: Array<{ init?: { body?: string } }> = [];
    const window = {
      location: { origin: "https://together.example" },
      localStorage: { getItem: () => "replay" },
      doNotTrack: "0",
      fetch: async (_input: unknown, init?: { body?: string }) => {
        calls.push({ init });
        return new Response();
      },
    };
    const source = readFileSync(
      new URL("../../public/umami-recorder-sanitizer.js", import.meta.url),
      "utf8",
    );
    vm.runInNewContext(source, {
      Map,
      Promise,
      Response,
      URL,
      JSON,
      Object,
      String,
      Number,
      navigator: { doNotTrack: "0" },
      window,
    });

    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [
            {
              type: 2,
              data: {
                node: {
                  type: 0,
                  childNodes: [
                    { type: 1, id: 2, tagName: "head" },
                    { type: 1, id: 99, tagName: "div" },
                  ],
                },
              },
            },
          ],
        },
      }),
    });
    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [
            {
              type: 3,
              data: {
                source: 0,
                adds: [
                  {
                    parentId: 2,
                    node: {
                      type: 1,
                      id: 3,
                      tagName: "title",
                      childNodes: [{ type: 3, id: 4, textContent: roomTitle }],
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
    });
    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [{ type: 3, data: { source: 0, texts: [{ id: 4, value: roomTitle }] } }],
        },
      }),
    });
    await window.fetch("/w/a/api/record", {
      body: JSON.stringify({
        payload: {
          events: [
            {
              type: 3,
              data: {
                source: 0,
                removes: [{ parentId: 3, id: 4 }],
                adds: [
                  { parentId: 99, node: { type: 3, id: 4, textContent: "Public page heading" } },
                ],
                texts: [{ id: 4, value: "Public page heading" }],
              },
            },
          ],
        },
      }),
    });

    const addedTitle = JSON.parse(String(calls[1].init?.body));
    const titleMutation = JSON.parse(String(calls[2].init?.body));
    const reparentedText = JSON.parse(String(calls[3].init?.body));
    expect(JSON.stringify(addedTitle)).not.toContain("secret-room");
    expect(titleMutation.payload.events[0].data.texts).toEqual([{ id: 4, value: "Together" }]);
    expect(reparentedText.payload.events[0].data.texts).toEqual([{ id: 4, value: "Together" }]);
  });

  it("preserves each fragment's recorder timestamps when re-emitting it", async () => {
    const serialized = JSON.stringify({
      action: "https://together.example/r/canary-room?token=canary",
    });
    const middle = Math.floor(serialized.length / 2);
    const calls: Array<{
      input: unknown;
      init?: { body?: string; headers?: Record<string, string> };
    }> = [];
    const window = {
      location: { origin: "https://together.example" },
      localStorage: { getItem: () => "replay" },
      doNotTrack: "0",
      fetch: async (input: unknown, init?: { body?: string; headers?: Record<string, string> }) => {
        calls.push({ input, init });
        return new Response();
      },
    };
    const source = readFileSync(
      new URL("../../public/umami-recorder-sanitizer.js", import.meta.url),
      "utf8",
    );
    vm.runInNewContext(source, {
      Map,
      Promise,
      Response,
      URL,
      JSON,
      Object,
      String,
      Number,
      navigator: { doNotTrack: "0" },
      window,
    });

    const sendFragment = (
      index: number,
      value: string,
      payloadTimestamp: number,
      eventTimestamp: number,
    ) =>
      window.fetch("/w/a/api/record", {
        body: JSON.stringify({
          payload: {
            timestamp: payloadTimestamp,
            events: [
              {
                type: "umami:rrweb-event-fragment",
                timestamp: eventTimestamp,
                data: { id: "canary", index, total: 2, value },
              },
            ],
          },
        }),
        headers: { "x-fragment": String(index) },
      });

    await sendFragment(0, serialized.slice(0, middle), 100, 1_000);
    await sendFragment(1, serialized.slice(middle), 200, 2_000);

    expect(calls).toHaveLength(2);
    expect(calls.map(({ init }) => init?.headers?.["x-fragment"])).toEqual(["0", "1"]);
    const reEmitted = calls.map(({ init }) => JSON.parse(String(init?.body)));
    expect(reEmitted.map((body) => body.payload.timestamp)).toEqual([100, 200]);
    expect(reEmitted.map((body) => body.payload.events[0].timestamp)).toEqual([1_000, 2_000]);
  });
});
