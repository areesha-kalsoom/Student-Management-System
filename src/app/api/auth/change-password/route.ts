import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { createSession, getAuthenticatedUser } from "@/lib/server/auth";
import { ensureSameOrigin, jsonError, safeServerError } from "@/lib/server/http";
import { changePasswordSchema } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!ensureSameOrigin(request)) return jsonError("Request origin is not allowed.", 403);
  try {
    const authenticated = await getAuthenticatedUser(request);
    if (!authenticated) return jsonError("Please sign in to continue.", 401);
    const parsed = changePasswordSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Check the password fields.", 400);
    const [account] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, authenticated.id)).limit(1);
    if (!account || !(await bcrypt.compare(parsed.data.currentPassword, account.passwordHash))) return jsonError("Current password is incorrect.", 400);
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, authenticated.id));
    await db.delete(sessions).where(eq(sessions.userId, authenticated.id));
    const session = await createSession(authenticated.id);
    return Response.json({ ok: true, message: "Password updated. Other sessions were signed out." }, { headers: { "Set-Cookie": session.cookie } });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Request body must be valid JSON.", 400);
    return safeServerError(error);
  }
}
