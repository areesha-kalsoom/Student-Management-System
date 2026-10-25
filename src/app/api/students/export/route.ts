import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customFieldDefinitions, students } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { buildStudentCsv } from "@/lib/server/csv";
import { jsonError, safeServerError } from "@/lib/server/http";
import { buildStudentQuery, InvalidStudentQuery } from "@/lib/server/student-query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    const params = new URL(request.url).searchParams;
    const query = await buildStudentQuery(user.id, params);
    const [records, fields] = await Promise.all([
      db.select().from(students).where(query.where).orderBy(query.direction, desc(students.id)),
      db.select().from(customFieldDefinitions).where(and(eq(customFieldDefinitions.ownerId, user.id), eq(customFieldDefinitions.archived, false))),
    ]);
    const csv = buildStudentCsv(records, fields);
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=students-export.csv", "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof InvalidStudentQuery) return jsonError(error.message, 400);
    return safeServerError(error);
  }
}
