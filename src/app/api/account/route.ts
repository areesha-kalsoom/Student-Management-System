import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthenticatedUser, serializeSessionCookie } from "@/lib/server/auth";
import { ensureSameOrigin, jsonError, safeServerError } from "@/lib/server/http";
import { z } from "zod";

export const runtime = "nodejs";
const profileSchema = z.object({ name: z.string().trim().min(2).max(120) }).strict();
const deleteSchema = z.object({ password: z.string().min(1).max(128), confirmation: z.literal("DELETE") }).strict();

export async function PATCH(request: Request) {
  if (!ensureSameOrigin(request)) return jsonError("Request origin is not allowed.", 403);
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    const parsed = profileSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Enter a name with at least two characters.", 400);
    const [updated] = await db.update(users).set({ name: parsed.data.name, updatedAt: new Date() }).where(eq(users.id, user.id)).returning({ id: users.id, name: users.name, email: users.email });
    return Response.json({ ok: true, user: updated });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Request body must be valid JSON.", 400);
    return safeServerError(error);
  }
}

export async function DELETE(request: Request) {
  if (!ensureSameOrigin(request)) return jsonError("Request origin is not allowed.", 403);
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    const parsed = deleteSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Enter your password and type DELETE to confirm.", 400);
    const [account] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
    if (!account || !(await bcrypt.compare(parsed.data.password, account.passwordHash))) return jsonError("Password is incorrect.", 400);
    await db.delete(users).where(eq(users.id, user.id));
    return Response.json({ ok: true }, { headers: { "Set-Cookie": serializeSessionCookie("", 0) } });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Request body must be valid JSON.", 400);
    return safeServerError(error);
  }
}
