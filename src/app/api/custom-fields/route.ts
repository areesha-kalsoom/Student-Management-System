import { and, count, eq, max } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { customFieldDefinitions } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { ensureSameOrigin, isDuplicateKeyError, jsonError, safeServerError } from "@/lib/server/http";
import { customFieldSchema } from "@/lib/server/validation";

export const runtime = "nodejs";
const fieldView = {
  id: customFieldDefinitions.id, label: customFieldDefinitions.label, type: customFieldDefinitions.type,
  required: customFieldDefinitions.required, options: customFieldDefinitions.options, position: customFieldDefinitions.position,
  showOnCard: customFieldDefinitions.showOnCard, searchable: customFieldDefinitions.searchable,
  filterable: customFieldDefinitions.filterable, exportable: customFieldDefinitions.exportable,
  archived: customFieldDefinitions.archived, createdAt: customFieldDefinitions.createdAt,
};

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    const fields = await db.select(fieldView).from(customFieldDefinitions).where(eq(customFieldDefinitions.ownerId, user.id)).orderBy(customFieldDefinitions.position);
    return Response.json({ ok: true, fields, limit: 30 });
  } catch (error) { return safeServerError(error); }
}

export async function POST(request: Request) {
  if (!ensureSameOrigin(request)) return jsonError("Request origin is not allowed.", 403);
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    const parsed = customFieldSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Check the field definition.", 400);
    const [currentCount] = await db.select({ count: count() }).from(customFieldDefinitions).where(eq(customFieldDefinitions.ownerId, user.id));
    if (Number(currentCount?.count ?? 0) >= 30) return jsonError("You can create up to 30 custom fields.", 409);
    const [last] = await db.select({ position: max(customFieldDefinitions.position) }).from(customFieldDefinitions).where(and(eq(customFieldDefinitions.ownerId, user.id), eq(customFieldDefinitions.archived, false)));
    const [field] = await db.insert(customFieldDefinitions).values({
      ownerId: user.id,
      key: `field_${randomBytes(12).toString("hex")}`,
      ...parsed.data,
      position: Number(last?.position ?? -1) + 1,
    }).returning(fieldView);
    return Response.json({ ok: true, field }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) return jsonError("A similar field definition already exists.", 409);
    if (error instanceof SyntaxError) return jsonError("Request body must be valid JSON.", 400);
    return safeServerError(error);
  }
}
