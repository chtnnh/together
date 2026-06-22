import { cookies } from "next/headers";
import { verifyRoomToken } from "./utils";

const COOKIE_PREFIX = "together_access_";
const PASSWORD_COOKIE_PREFIX = "together_pwd_";

export function roomAccessCookieName(slug: string) {
  return `${COOKIE_PREFIX}${slug}`;
}

export function roomPasswordCookieName(slug: string) {
  return `${PASSWORD_COOKIE_PREFIX}${slug}`;
}

export const cookieOptions = (path: string) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path,
  maxAge: 60 * 60 * 24 * 30,
});

export async function getRoomAccessToken(slug: string): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(roomAccessCookieName(slug))?.value ?? null;
}

export async function verifyRoomAccess(slug: string): Promise<boolean> {
  const token = await getRoomAccessToken(slug);
  if (!token) return false;
  const verified = await verifyRoomToken(token);
  return verified?.slug === slug;
}

export async function hasPasswordCookie(slug: string): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(roomPasswordCookieName(slug))?.value === "1";
}
