import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { students } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { jsonError, safeServerError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const ownerFilter = eq(students.ownerId, user.id);
    const [summaryRows, classRows, recent] = await Promise.all([
      db.select({
        total: count(),
        active: sql<number>`count(*) filter (where ${students.status} = 'active')`,
        inactive: sql<number>`count(*) filter (where ${students.status} = 'inactive')`,
        recentlyAdded: sql<number>`count(*) filter (where ${students.createdAt} >= ${monthAgo})`,
        female: sql<number>`count(*) filter (where lower(${students.gender}) = 'female')`,
        male: sql<number>`count(*) filter (where lower(${students.gender}) = 'male')`,
      }).from(students).where(ownerFilter),
      db.select({ className: students.className, count: count() }).from(students).where(and(ownerFilter, sql`${students.className} <> ''`)).groupBy(students.className).orderBy(desc(count())).limit(5),
      db.select({ id: students.id, name: students.name, rollNumber: students.rollNumber, className: students.className, department: students.department, status: students.status, enrollmentDate: students.enrollmentDate, createdAt: students.createdAt, customValues: students.customValues }).from(students).where(ownerFilter).orderBy(desc(students.createdAt)).limit(5),
    ]);
    const summary = summaryRows[0];
    return Response.json({
      ok: true,
      stats: { total: Number(summary?.total ?? 0), active: Number(summary?.active ?? 0), inactive: Number(summary?.inactive ?? 0), recentlyAdded: Number(summary?.recentlyAdded ?? 0), female: Number(summary?.female ?? 0), male: Number(summary?.male ?? 0) },
      byClass: classRows.map((row) => ({ ...row, count: Number(row.count) })),
      recent,
    });
  } catch (error) { return safeServerError(error); }
}
