import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

const SESSION_COOKIE = "sms_session";
const SESSION_DAYS = 7;

type AuthenticatedUser = { id: string; name: string; email: string };

function sessionTokenFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const item = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return item ? item.slice(SESSION_COOKIE.length + 1) : null;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const token = sessionTokenFromRequest(request);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [record] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return record ?? null;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  return { token, cookie: serializeSessionCookie(token, SESSION_DAYS * 24 * 60 * 60) };
}

export async function removeSession(request: Request) {
  const token = sessionTokenFromRequest(request);
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  return serializeSessionCookie("", 0);
}

export function serializeSessionCookie(token: string, maxAge: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
