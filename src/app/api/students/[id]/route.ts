import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { students } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { ensureSameOrigin, isDuplicateKeyError, jsonError, safeServerError, uniqueConstraintName } from "@/lib/server/http";
import { readOwnedStudent, validateStudentPayload } from "@/lib/server/students";
import { studentInputSchema } from "@/lib/server/validation";

export const runtime = "nodejs";
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
function publicStudent<T extends { ownerId?: string }>(record: T) { const { ownerId: _ownerId, ...student } = record; return student; }

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    const { id } = await context.params;
    if (!validId(id)) return jsonError("Student not found.", 404);
    const student = await readOwnedStudent(user.id, id);
    if (!student) return jsonError("Student not found.", 404);
    return Response.json({ ok: true, student: publicStudent(student) });
  } catch (error) { return safeServerError(error); }
}

export async function PUT(request: Request, context: Context) {
  if (!ensureSameOrigin(request)) return jsonError("Request origin is not allowed.", 403);
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    const { id } = await context.params;
    if (!validId(id)) return jsonError("Student not found.", 404);
    const current = await readOwnedStudent(user.id, id);
    if (!current) return jsonError("Student not found.", 404);
    const parsed = studentInputSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Check the student details.", 400);
    const custom = await validateStudentPayload(user.id, parsed.data.customValues);
    if (Object.keys(custom.errors).length) return jsonError("Check the custom field values.", 400, custom.errors);
    const activeIds = new Set(custom.fields.map((field) => field.id));
    const archivedValues = Object.fromEntries(Object.entries(current.customValues ?? {}).filter(([key]) => !activeIds.has(key)));
    const [updated] = await db.update(students).set({
      ...parsed.data,
      dateOfBirth: parsed.data.dateOfBirth || null,
      email: parsed.data.email.toLowerCase() || null,
      customValues: { ...archivedValues, ...custom.clean },
      updatedAt: new Date(),
    }).where(and(eq(students.id, id), eq(students.ownerId, user.id))).returning();
    if (!updated) return jsonError("Student not found.", 404);
    return Response.json({ ok: true, student: publicStudent(updated) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const constraint = uniqueConstraintName(error);
      return jsonError(constraint.includes("email") ? "A student with this email already exists in your workspace." : "That roll number is already in your workspace.", 409);
    }
    if (error instanceof SyntaxError) return jsonError("Request body must be valid JSON.", 400);
    return safeServerError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!ensureSameOrigin(request)) return jsonError("Request origin is not allowed.", 403);
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    const { id } = await context.params;
    if (!validId(id)) return jsonError("Student not found.", 404);
    const [deleted] = await db.delete(students).where(and(eq(students.id, id), eq(students.ownerId, user.id))).returning({ id: students.id });
    if (!deleted) return jsonError("Student not found.", 404);
    return Response.json({ ok: true, id: deleted.id });
  } catch (error) { return safeServerError(error); }
}
