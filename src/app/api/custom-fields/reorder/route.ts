import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { customFieldDefinitions } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { ensureSameOrigin, jsonError, safeServerError } from "@/lib/server/http";

export const runtime = "nodejs";
const reorderSchema = z.object({ ids: z.array(z.string().uuid()).max(30) }).strict();

export async function PUT(request: Request) {
  if (!ensureSameOrigin(request)) return jsonError("Request origin is not allowed.", 403);
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    const parsed = reorderSchema.safeParse(await request.json());
    if (!parsed.success || new Set(parsed.data.ids).size !== parsed.data.ids.length) return jsonError("Field order is invalid.", 400);
    const ownFields = await db.select({ id: customFieldDefinitions.id }).from(customFieldDefinitions).where(and(eq(customFieldDefinitions.ownerId, user.id), eq(customFieldDefinitions.archived, false)));
    const existing = new Set(ownFields.map((field) => field.id));
    if (parsed.data.ids.length !== existing.size || parsed.data.ids.some((id) => !existing.has(id))) return jsonError("Field order must include only your active fields.", 400);
    await db.transaction(async (transaction) => {
      for (const [position, id] of parsed.data.ids.entries()) {
        await transaction.update(customFieldDefinitions).set({ position, updatedAt: new Date() }).where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.ownerId, user.id)));
      }
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Request body must be valid JSON.", 400);
    return safeServerError(error);
  }
}
