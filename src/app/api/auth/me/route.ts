import { getAuthenticatedUser } from "@/lib/server/auth";
import { jsonError, safeServerError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    return Response.json({ ok: true, user });
  } catch (error) {
    return safeServerError(error);
  }
}
