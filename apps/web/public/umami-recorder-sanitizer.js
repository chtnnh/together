/* Runs before Umami. The recorder lacks a URL transform, so sanitize its egress. */
(() => {
  const roomPath = /^\/r\/[^/]+(?=\/|$)/;
  const urlKey = /(?:url|href|src|action|referrer)$/i;
  const fragmentBuffers = new Map();
  const titleNodeIds = new Set();
  const sensitiveMetaNodeIds = new Set();
  const nodeParentIds = new Map();
  const nodeChildIds = new Map();
  const nativeFetch = window.fetch.bind(window);
  const credentialQueryKeys = new Set([
    "password",
    "token",
    "code",
    "state",
    "access_token",
    "refresh_token",
    "email",
  ]);
  const utmQueryKeys = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ]);
  const retainUtmQuery = (query) =>
    String(query)
      .split("&")
      .filter((part) => {
        const key = part.split("=", 1)[0];
        try {
          return utmQueryKeys.has(decodeURIComponent(key).toLowerCase());
        } catch {
          return false;
        }
      })
      .join("&");
  const genericTitle = "Together";
  const forward = (input, init) => nativeFetch(input, { ...init, referrerPolicy: "no-referrer" });
  const isAdminRoute = () => /^\/admin(?:\/|$)/.test(window.location.pathname);
  const currentUrl = () =>
    new URL(
      window.location.href ||
        `${window.location.origin}${window.location.pathname || "/"}${window.location.search || ""}${window.location.hash || ""}`,
      window.location.origin,
    );
  const hasCredentialQuery = () => {
    try {
      const url = currentUrl();
      const hasCredentialKey = (params) =>
        [...params.keys()].some((key) => credentialQueryKeys.has(key.toLowerCase()));
      const hashQuery = url.hash.slice(1).replace(/^\?/, "");
      return hasCredentialKey(url.searchParams) || hasCredentialKey(new URLSearchParams(hashQuery));
    } catch {
      return false;
    }
  };
  let hasVisitedAdmin = isAdminRoute();
  let hasVisitedCredential = hasCredentialQuery();
  const noteSensitiveVisit = () => {
    if (isAdminRoute()) hasVisitedAdmin = true;
    if (hasCredentialQuery()) hasVisitedCredential = true;
  };
  for (const method of ["pushState", "replaceState"]) {
    const nativeMethod = window.history?.[method];
    if (typeof nativeMethod !== "function") continue;
    window.history[method] = function togetherRecorderHistoryGuard(...args) {
      const result = nativeMethod.apply(this, args);
      noteSensitiveVisit();
      return result;
    };
  }
  window.addEventListener?.("popstate", noteSensitiveVisit);
  const isDoNotTrackEnabled = () =>
    [
      typeof navigator === "undefined" ? undefined : navigator.doNotTrack,
      typeof navigator === "undefined" ? undefined : navigator.msDoNotTrack,
      window.doNotTrack,
    ].some((value) => value === "1" || value?.toLowerCase() === "yes");
  const canTrack = () => {
    if (hasVisitedAdmin || hasVisitedCredential || isAdminRoute() || hasCredentialQuery())
      return false;
    if (isDoNotTrackEnabled()) return false;
    try {
      const consent = window.localStorage.getItem("together.umami-consent");
      return (
        consent === null || consent === "essential" || consent === "basic" || consent === "replay"
      );
    } catch {
      return false;
    }
  };
  const canRecord = () => {
    if (!canTrack()) return false;
    try {
      return window.localStorage.getItem("together.umami-consent") === "replay";
    } catch {
      return false;
    }
  };
  const sanitizeUrl = (value) => {
    if (!String(value).trim()) return value;
    try {
      const url = new URL(value, window.location.origin);
      url.search = retainUtmQuery(url.search.slice(1));
      url.hash = "";
      url.pathname = url.pathname.replace(roomPath, "/r/[room]");
      return url.toString();
    } catch {
      const [pathAndQuery] = String(value).split("#", 1);
      const [path, query = ""] = pathAndQuery.split("?", 2);
      const retained = retainUtmQuery(query.split("#", 1)[0]);
      const sanitizedPath = path.replace(/\/r\/[^/?#]+(?=\/|$)/, "/r/[room]");
      return retained ? `${sanitizedPath}?${retained}` : sanitizedPath;
    }
  };
  const detachNode = (nodeId) => {
    const parentId = nodeParentIds.get(nodeId);
    if (parentId !== undefined) nodeChildIds.get(parentId)?.delete(nodeId);
    nodeParentIds.delete(nodeId);
  };
  const removeNode = (nodeId) => {
    if (!Number.isInteger(nodeId)) return;
    nodeChildIds.get(nodeId)?.forEach(removeNode);
    nodeChildIds.delete(nodeId);
    titleNodeIds.delete(nodeId);
    sensitiveMetaNodeIds.delete(nodeId);
    detachNode(nodeId);
  };
  const classifyMetaNode = (node) => {
    if (!Number.isInteger(node?.id) || String(node.tagName).toLowerCase() !== "meta") return;
    if (String(node.attributes?.name).toLowerCase() === "viewport") {
      sensitiveMetaNodeIds.delete(node.id);
    } else {
      sensitiveMetaNodeIds.add(node.id);
    }
  };
  const trackSerializedNode = (node, parentId) => {
    if (Array.isArray(node)) {
      node.forEach((item) => trackSerializedNode(item, parentId));
      return;
    }
    if (!node || typeof node !== "object") return;
    const nodeId = node.id;
    if (Number.isInteger(nodeId)) {
      if (Number.isInteger(parentId)) {
        detachNode(nodeId);
        nodeParentIds.set(nodeId, parentId);
        const children = nodeChildIds.get(parentId) || new Set();
        children.add(nodeId);
        nodeChildIds.set(parentId, children);
      }
      if (String(node.tagName).toLowerCase() === "title") titleNodeIds.add(nodeId);
      classifyMetaNode(node);
    }
    node.childNodes?.forEach((child) => trackSerializedNode(child, nodeId));
  };
  const trackRrwebNodeState = (value) => {
    if (Array.isArray(value)) {
      value.forEach(trackRrwebNodeState);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (value.type === 2 && value.data?.node) {
      titleNodeIds.clear();
      sensitiveMetaNodeIds.clear();
      nodeParentIds.clear();
      nodeChildIds.clear();
      trackSerializedNode(value.data.node);
    }
    if (value.type === 3 && value.data?.source === 0) {
      value.data.removes?.forEach(({ id }) => removeNode(id));
      value.data.adds?.forEach(({ parentId, node }) => trackSerializedNode(node, parentId));
    }
    Object.values(value).forEach(trackRrwebNodeState);
  };
  const isTitleNodeOrDescendant = (nodeId) => {
    const visited = new Set();
    while (Number.isInteger(nodeId) && !visited.has(nodeId)) {
      if (titleNodeIds.has(nodeId)) return true;
      visited.add(nodeId);
      nodeId = nodeParentIds.get(nodeId);
    }
    return false;
  };
  const collectTitleNodeIds = (node, insideTitle, nodeIds) => {
    if (Array.isArray(node)) {
      node.forEach((item) => collectTitleNodeIds(item, insideTitle, nodeIds));
      return;
    }
    if (!node || typeof node !== "object") return;
    const isTitleNode = insideTitle || String(node.tagName).toLowerCase() === "title";
    if (isTitleNode && Number.isInteger(node.id)) nodeIds.add(node.id);
    node.childNodes?.forEach((child) => collectTitleNodeIds(child, isTitleNode, nodeIds));
  };
  const titleMutationNodeIds = (event) => {
    const nodeIds = new Set();
    if (event?.type !== 3 || event.data?.source !== 0) return nodeIds;
    event.data.texts?.forEach(({ id }) => {
      if (isTitleNodeOrDescendant(id)) nodeIds.add(id);
    });
    event.data.adds?.forEach(({ parentId, node }) =>
      collectTitleNodeIds(node, isTitleNodeOrDescendant(parentId), nodeIds),
    );
    return nodeIds;
  };
  const updateSensitiveMetaClassifications = (event) => {
    if (event?.type !== 3 || event.data?.source !== 0) return;
    event.data.removes?.forEach(({ id }) => sensitiveMetaNodeIds.delete(id));
    const classifyAddedNode = (node) => {
      if (!node || typeof node !== "object") return;
      classifyMetaNode(node);
      node.childNodes?.forEach(classifyAddedNode);
    };
    event.data.adds?.forEach(({ node }) => classifyAddedNode(node));
    event.data.attributes?.forEach(({ id, attributes }) => {
      if (
        !attributes ||
        (!Object.hasOwn(attributes, "name") && !Object.hasOwn(attributes, "property"))
      )
        return;
      if (attributes.name === "viewport") sensitiveMetaNodeIds.delete(id);
      else sensitiveMetaNodeIds.add(id);
    });
  };
  const sanitizeAndTrackRrwebEvent = (event) => {
    if (event?.type === 2) {
      trackRrwebNodeState(event);
      return sanitize(event, undefined, false, titleMutationNodeIds(event));
    }
    updateSensitiveMetaClassifications(event);
    const sanitizedEvent = sanitize(event, undefined, false, titleMutationNodeIds(event));
    trackRrwebNodeState(event);
    return sanitizedEvent;
  };
  const sanitizeRecordPayload = (value) => {
    if (!Array.isArray(value?.payload?.events)) return sanitize(value);
    const sanitized = sanitize(value);
    sanitized.payload.events = value.payload.events.map(sanitizeAndTrackRrwebEvent);
    return sanitized;
  };
  const sanitize = (value, key, insideTitle, titleMutationIds, insideMeta) => {
    if (typeof value === "string") {
      if (key?.toLowerCase() === "title" || (insideTitle && key === "textContent"))
        return genericTitle;
      if (key === "srcset") {
        return value
          .split(",")
          .map((candidate) => {
            const [url, ...descriptor] = candidate.trim().split(/\s+/);
            return url ? [sanitizeUrl(url), ...descriptor].join(" ") : candidate;
          })
          .join(", ");
      }
      return urlKey.test(key || "") ? sanitizeUrl(value) : value;
    }
    if (Array.isArray(value))
      return value.map((item) =>
        sanitize(item, undefined, insideTitle, titleMutationIds, insideMeta),
      );
    if (!value || typeof value !== "object") return value;
    const isTitleNode = String(value.tagName).toLowerCase() === "title";
    const isMetaNode = String(value.tagName).toLowerCase() === "meta";
    const isSensitiveMetaNode =
      isMetaNode && String(value.attributes?.name).toLowerCase() !== "viewport";
    const isSensitiveMetaMutation = sensitiveMetaNodeIds.has(value.id);
    const isTitleTextMutation = isTitleNodeOrDescendant(value.id);
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [
        name,
        (isTitleTextMutation || titleMutationIds?.has(value.id)) &&
        (name === "value" || name === "textContent")
          ? genericTitle
          : insideMeta && name === "content"
            ? genericTitle
            : sanitize(
                item,
                name,
                insideTitle || isTitleNode,
                titleMutationIds,
                insideMeta || isSensitiveMetaNode || isSensitiveMetaMutation,
              ),
      ]),
    );
  };
  const isRecordEndpoint = (input) => {
    try {
      return new URL(
        typeof input === "string" ? input : input.url,
        window.location.origin,
      ).pathname.endsWith("/api/record");
    } catch {
      return false;
    }
  };
  const isUmamiEndpoint = (input) => {
    try {
      return new URL(
        typeof input === "string" ? input : input.url,
        window.location.origin,
      ).pathname.startsWith("/w/a/api/");
    } catch {
      return false;
    }
  };
  window.fetch = function togetherSanitizedUmamiFetch(input, init) {
    noteSensitiveVisit();
    if (isUmamiEndpoint(input) && !canTrack()) return Promise.resolve(new Response());
    if (isRecordEndpoint(input) && !canRecord()) return Promise.resolve(new Response());
    if (!isRecordEndpoint(input) || typeof init?.body !== "string") return forward(input, init);
    let body;
    try {
      body = JSON.parse(init.body);
    } catch {
      return forward(input, init);
    }
    const event = body?.payload?.events?.[0];
    const fragment = event?.data;
    if (
      (event?.type === 2 || event?.type === "umami:rrweb-event-fragment") &&
      fragment?.value &&
      Number.isInteger(fragment.index) &&
      fragment.total > 1
    ) {
      const key = fragment.id;
      const entry = fragmentBuffers.get(key) || { fragments: [] };
      entry.fragments[fragment.index] = { fragment, input, init, body, event };
      fragmentBuffers.set(key, entry);
      if (entry.fragments.filter(Boolean).length !== fragment.total)
        return Promise.resolve(new Response());
      fragmentBuffers.delete(key);
      let serialized;
      try {
        serialized = JSON.stringify(
          sanitizeAndTrackRrwebEvent(
            JSON.parse(entry.fragments.map((part) => part.fragment.value).join("")),
          ),
        );
      } catch {
        return Promise.resolve(new Response());
      }
      const sizes = entry.fragments.map((part) => part.fragment.value.length);
      let offset = 0;
      return Promise.all(
        entry.fragments.map((part, index) => {
          const next = index === sizes.length - 1 ? serialized.length : offset + sizes[index];
          const value = serialized.slice(offset, next);
          offset = next;
          return forward(part.input, {
            ...part.init,
            body: JSON.stringify({
              ...part.body,
              payload: {
                ...part.body.payload,
                events: [{ ...part.event, data: { ...part.fragment, value } }],
              },
            }),
          });
        }),
      ).then(() => new Response());
    }
    return forward(input, { ...init, body: JSON.stringify(sanitizeRecordPayload(body)) });
  };
})();
