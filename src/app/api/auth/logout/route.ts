import { removeSession } from "@/lib/server/auth";
import { ensureSameOrigin, jsonError, safeServerError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!ensureSameOrigin(request)) return jsonError("Request origin is not allowed.", 403);
  try {
    const cookie = await removeSession(request);
    return Response.json({ ok: true }, { headers: { "Set-Cookie": cookie } });
  } catch (error) {
    return safeServerError(error);
  }
}
