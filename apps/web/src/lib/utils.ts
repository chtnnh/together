import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.ROOM_TOKEN_SECRET ?? "dev-secret-change-me",
);

export async function signRoomToken(roomId: string, slug: string): Promise<string> {
  return new SignJWT({ roomId, slug })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyRoomToken(
  token: string,
): Promise<{ roomId: string; slug: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      roomId: payload.roomId as string,
      slug: payload.slug as string,
    };
  } catch {
    return null;
  }
}

export function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function getAnonId(): string {
  if (typeof window === "undefined") return "";
  const key = "together_anon_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function getDisplayName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("together_display_name") ?? "";
}

export function setDisplayName(name: string) {
  localStorage.setItem("together_display_name", name);
}

export function getRealtimeUrl(roomId: string): string {
  let base = process.env.NEXT_PUBLIC_REALTIME_URL ?? "ws://127.0.0.1:8787";
  if (base.startsWith("https://")) {
    base = `wss://${base.slice("https://".length)}`;
  } else if (base.startsWith("http://")) {
    base = `ws://${base.slice("http://".length)}`;
  }
  return `${base.replace(/\/$/, "")}/room/${roomId}`;
}
