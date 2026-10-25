import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { customFieldDefinitions, students } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { ensureSameOrigin, jsonError, safeServerError } from "@/lib/server/http";
import { customFieldSchema } from "@/lib/server/validation";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
const fieldView = {
  id: customFieldDefinitions.id, label: customFieldDefinitions.label, type: customFieldDefinitions.type,
  required: customFieldDefinitions.required, options: customFieldDefinitions.options, position: customFieldDefinitions.position,
  showOnCard: customFieldDefinitions.showOnCard, searchable: customFieldDefinitions.searchable,
  filterable: customFieldDefinitions.filterable, exportable: customFieldDefinitions.exportable,
  archived: customFieldDefinitions.archived, createdAt: customFieldDefinitions.createdAt,
};

export async function PUT(request: Request, context: Context) {
  if (!ensureSameOrigin(request)) return jsonError("Request origin is not allowed.", 403);
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    const { id } = await context.params;
    if (!validId(id)) return jsonError("Custom field not found.", 404);
    const [current] = await db.select().from(customFieldDefinitions).where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.ownerId, user.id))).limit(1);
    if (!current) return jsonError("Custom field not found.", 404);
    const parsed = customFieldSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Check the field definition.", 400);
    const hasSavedValues = await db.select({ id: students.id }).from(students).where(and(eq(students.ownerId, user.id), sql`${students.customValues} ? ${id}`)).limit(1);
    if (hasSavedValues.length && (current.type !== parsed.data.type || JSON.stringify(current.options) !== JSON.stringify(parsed.data.options))) {
      return jsonError("This field has saved student values. Clear those values before changing its type or options.", 409);
    }
    const [updated] = await db.update(customFieldDefinitions).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.ownerId, user.id))).returning(fieldView);
    if (!updated) return jsonError("Custom field not found.", 404);
    return Response.json({ ok: true, field: updated });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Request body must be valid JSON.", 400);
    return safeServerError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  if (!ensureSameOrigin(request)) return jsonError("Request origin is not allowed.", 403);
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    const { id } = await context.params;
    if (!validId(id)) return jsonError("Custom field not found.", 404);
    const body = await request.json();
    if (typeof body !== "object" || body === null || typeof (body as { archived?: unknown }).archived !== "boolean" || Object.keys(body).length !== 1) return jsonError("Choose whether to archive this field.", 400);
    const [updated] = await db.update(customFieldDefinitions).set({ archived: (body as { archived: boolean }).archived, updatedAt: new Date() }).where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.ownerId, user.id))).returning(fieldView);
    if (!updated) return jsonError("Custom field not found.", 404);
    return Response.json({ ok: true, field: updated });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Request body must be valid JSON.", 400);
    return safeServerError(error);
  }
}
