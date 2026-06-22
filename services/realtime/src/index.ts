import { RoomDurableObject, type Env } from "./room-do";

export { RoomDurableObject };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "together-realtime" });
    }

    const roomMatch = url.pathname.match(/^\/room\/([^/]+)/);
    if (!roomMatch) {
      return new Response("Not found", { status: 404 });
    }

    const roomId = roomMatch[1]!;
    const id = env.ROOM.idFromName(roomId);
    const stub = env.ROOM.get(id);

    const doUrl = new URL(request.url);
    doUrl.pathname = url.pathname.replace(`/room/${roomId}`, "") || "/";

    return stub.fetch(new Request(doUrl.toString(), request));
  },
};
