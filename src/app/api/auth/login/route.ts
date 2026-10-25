import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/server/auth";
import { ensureSameOrigin, jsonError, safeServerError } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { loginSchema } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!ensureSameOrigin(request)) return jsonError("Request origin is not allowed.", 403);
  const limit = checkRateLimit(request, "login", 10, 15 * 60 * 1000);
  if (limit.limited) return Response.json({ ok: false, error: "Too many login attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Email or password is incorrect.", 401);
    const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return jsonError("Email or password is incorrect.", 401);
    const session = await createSession(user.id);
    return Response.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } }, { headers: { "Set-Cookie": session.cookie } });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Request body must be valid JSON.", 400);
    return safeServerError(error);
  }
}
