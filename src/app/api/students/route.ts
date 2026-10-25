import { and, asc, count, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { students } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { ensureSameOrigin, isDuplicateKeyError, jsonError, safeServerError, uniqueConstraintName } from "@/lib/server/http";
import { buildStudentQuery, InvalidStudentQuery, pageParameters } from "@/lib/server/student-query";
import { validateStudentPayload } from "@/lib/server/students";
import { studentInputSchema } from "@/lib/server/validation";

export const runtime = "nodejs";

function publicStudent<T extends { ownerId?: string }>(record: T) {
  const { ownerId: _ownerId, ...student } = record;
  return student;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    const params = new URL(request.url).searchParams;
    const query = await buildStudentQuery(user.id, params);
    const { page, limit } = pageParameters(params);
    const ownerFilter = eq(students.ownerId, user.id);
    const [rows, totals, classes, departments, genders] = await Promise.all([
      db.select().from(students).where(query.where).orderBy(query.direction, desc(students.id)).limit(limit).offset((page - 1) * limit),
      db.select({ total: count() }).from(students).where(query.where),
      db.selectDistinct({ value: students.className }).from(students).where(and(ownerFilter, ne(students.className, ""))).orderBy(asc(students.className)).limit(100),
      db.selectDistinct({ value: students.department }).from(students).where(and(ownerFilter, ne(students.department, ""))).orderBy(asc(students.department)).limit(100),
      db.selectDistinct({ value: students.gender }).from(students).where(and(ownerFilter, ne(students.gender, ""))).orderBy(asc(students.gender)).limit(100),
    ]);
    const total = Number(totals[0]?.total ?? 0);
    return Response.json({ ok: true, students: rows.map(publicStudent), page, limit, total, pages: Math.ceil(total / limit), classOptions: classes.map((item) => item.value), departmentOptions: departments.map((item) => item.value), genderOptions: genders.map((item) => item.value) });
  } catch (error) {
    if (error instanceof InvalidStudentQuery) return jsonError(error.message, 400);
    return safeServerError(error);
  }
}

export async function POST(request: Request) {
  if (!ensureSameOrigin(request)) return jsonError("Request origin is not allowed.", 403);
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    const parsed = studentInputSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Check the student details.", 400);
    const custom = await validateStudentPayload(user.id, parsed.data.customValues);
    if (Object.keys(custom.errors).length) return jsonError("Check the custom field values.", 400, custom.errors);
    const [student] = await db.insert(students).values({
      ownerId: user.id,
      ...parsed.data,
      dateOfBirth: parsed.data.dateOfBirth || null,
      email: parsed.data.email.toLowerCase() || null,
      customValues: custom.clean,
    }).returning();
    return Response.json({ ok: true, student: publicStudent(student) }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const constraint = uniqueConstraintName(error);
      return jsonError(constraint.includes("email") ? "A student with this email already exists in your workspace." : "That roll number is already in your workspace.", 409);
    }
    if (error instanceof SyntaxError) return jsonError("Request body must be valid JSON.", 400);
    return safeServerError(error);
  }
}
