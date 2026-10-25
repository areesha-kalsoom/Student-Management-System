import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { customFieldDefinitions, students } from "@/db/schema";

export class InvalidStudentQuery extends Error {}
const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

export async function buildStudentQuery(ownerId: string, params: URLSearchParams) {
  const filters: SQL[] = [eq(students.ownerId, ownerId)];
  const search = (params.get("search") ?? "").trim();
  if (search.length > 100) throw new InvalidStudentQuery("Search text must be 100 characters or fewer.");
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    const searchableFields = await db.select({ id: customFieldDefinitions.id }).from(customFieldDefinitions).where(and(eq(customFieldDefinitions.ownerId, ownerId), eq(customFieldDefinitions.searchable, true), eq(customFieldDefinitions.archived, false)));
    const searchParts: SQL[] = [
      ilike(students.name, pattern), ilike(students.rollNumber, pattern), ilike(students.className, pattern),
      ilike(students.department, pattern), ilike(students.email, pattern),
    ];
    for (const field of searchableFields) searchParts.push(sql`${students.customValues} ->> ${field.id} ILIKE ${pattern}`);
    filters.push(or(...searchParts)!);
  }
  const status = params.get("status");
  if (status && !["active", "inactive"].includes(status)) throw new InvalidStudentQuery("Status must be active or inactive.");
  if (status) filters.push(eq(students.status, status));
  const gender = params.get("gender")?.trim() ?? "";
  if (gender.length > 40) throw new InvalidStudentQuery("Gender filter must be 40 characters or fewer.");
  if (gender) filters.push(eq(students.gender, gender));
  const className = params.get("class")?.trim() ?? "";
  if (className.length > 80) throw new InvalidStudentQuery("Class filter must be 80 characters or fewer.");
  if (className) filters.push(eq(students.className, className));
  const department = params.get("department")?.trim() ?? "";
  if (department.length > 100) throw new InvalidStudentQuery("Department filter must be 100 characters or fewer.");
  if (department) filters.push(eq(students.department, department));
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (from && !validDate(from) || to && !validDate(to)) throw new InvalidStudentQuery("Enrollment dates must use YYYY-MM-DD.");
  if (from && to && from > to) throw new InvalidStudentQuery("The start date must not be later than the end date.");
  if (from) filters.push(gte(students.enrollmentDate, from));
  if (to) filters.push(lte(students.enrollmentDate, to));
  for (const [key, value] of params.entries()) {
    if (key.startsWith("custom_") && value.length > 255) throw new InvalidStudentQuery("Custom field filters must be 255 characters or fewer.");
  }
  const definitions = await db.select({ id: customFieldDefinitions.id }).from(customFieldDefinitions).where(and(eq(customFieldDefinitions.ownerId, ownerId), eq(customFieldDefinitions.archived, false), eq(customFieldDefinitions.filterable, true)));
  for (const field of definitions) {
    const value = params.get(`custom_${field.id}`);
    if (value !== null) filters.push(sql`${students.customValues} ->> ${field.id} = ${value}`);
  }
  const sortKey = params.get("sort") ?? "createdAt";
  const sortColumns = { name: students.name, rollNumber: students.rollNumber, enrollmentDate: students.enrollmentDate, createdAt: students.createdAt };
  if (!(sortKey in sortColumns)) throw new InvalidStudentQuery("Choose a supported sort field.");
  const sortColumn = sortColumns[sortKey as keyof typeof sortColumns];
  const sortDirection = params.get("direction") ?? "desc";
  if (!["asc", "desc"].includes(sortDirection)) throw new InvalidStudentQuery("Sort direction must be asc or desc.");
  const direction = sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn);
  const where = and(...filters);
  return { where, direction };
}

export function pageParameters(params: URLSearchParams) {
  const pageValue = params.get("page") ?? "1";
  const limitValue = params.get("limit") ?? "12";
  const rawPage = Number(pageValue);
  const rawLimit = Number(limitValue);
  if (!/^\d+$/.test(pageValue) || !Number.isInteger(rawPage) || rawPage < 1 || rawPage > 100000) throw new InvalidStudentQuery("Page must be a positive integer.");
  if (!/^\d+$/.test(limitValue) || !Number.isInteger(rawLimit) || rawLimit < 1) throw new InvalidStudentQuery("Page size must be a positive integer.");
  return { page: rawPage, limit: Math.min(rawLimit, 50) };
}
