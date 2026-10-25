import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/server/auth";
import { ensureSameOrigin, isDuplicateKeyError, jsonError, jsonOk, safeServerError } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { registrationSchema } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!ensureSameOrigin(request)) return jsonError("Request origin is not allowed.", 403);
  const limit = checkRateLimit(request, "register", 6, 15 * 60 * 1000);
  if (limit.limited) return Response.json({ ok: false, error: "Too many registration attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  try {
    const parsed = registrationSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Check your registration details.", 400);
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const [user] = await db.insert(users).values({ name: parsed.data.name, email: parsed.data.email, passwordHash }).returning({ id: users.id, name: users.name, email: users.email });
    const session = await createSession(user.id);
    return Response.json({ ok: true, user }, { status: 201, headers: { "Set-Cookie": session.cookie } });
  } catch (error) {
    if (isDuplicateKeyError(error)) return jsonError("An account with this email already exists.", 409);
    if (error instanceof SyntaxError) return jsonError("Request body must be valid JSON.", 400);
    return safeServerError(error);
  }
}
