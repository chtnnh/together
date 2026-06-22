import { RoomDurableObject, type Env } from "./room-do";

export { RoomDurableObject };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "together-realtime" });
    }

    const roomMatch = url.pathname.match(/^\/room\/([^/]+)(\/.*)?$/);
    if (!roomMatch) {
      return new Response("Not found", { status: 404 });
    }

    const roomId = roomMatch[1]!;
    const subPath = roomMatch[2] ?? "";
    const stub = env.ROOM.get(env.ROOM.idFromName(roomId));

    // WebSocket upgrades must be forwarded unchanged — rewrites break the handshake.
    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      return stub.fetch(request);
    }

    const doUrl = new URL(request.url);
    doUrl.pathname = subPath || "/";

    return stub.fetch(new Request(doUrl.toString(), request));
  },
};
