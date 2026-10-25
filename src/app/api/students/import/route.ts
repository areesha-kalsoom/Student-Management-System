import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { students } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { ensureSameOrigin, isDuplicateKeyError, jsonError, safeServerError } from "@/lib/server/http";
import { activeFieldsForOwner } from "@/lib/server/students";
import { studentInputSchema, validateCustomValues } from "@/lib/server/validation";
import { z } from "zod";

export const runtime = "nodejs";
const importSchema = z.object({ rows: z.array(z.record(z.string(), z.unknown())).min(1).max(500), dryRun: z.boolean() }).strict();

function normalizeRow(row: Record<string, unknown>, fields: Awaited<ReturnType<typeof activeFieldsForOwner>>) {
  const rawCustom = row.customValues && typeof row.customValues === "object" && !Array.isArray(row.customValues) ? row.customValues as Record<string, unknown> : {};
  const customValues: Record<string, unknown> = { ...rawCustom };
  for (const field of fields) {
    const value = customValues[field.id];
    if (typeof value !== "string" || value === "") continue;
    if (field.type === "number") customValues[field.id] = Number(value);
    else if (field.type === "yes_no") {
      const normalized = value.trim().toLowerCase();
      customValues[field.id] = ["yes", "true", "1"].includes(normalized) ? true : ["no", "false", "0"].includes(normalized) ? false : value;
    } else if (field.type === "multi_select") customValues[field.id] = value.split(";").map((part) => part.trim()).filter(Boolean);
  }
  const status = typeof row.status === "string" ? row.status.toLowerCase() : row.status;
  return { ...row, status, customValues };
}

export async function POST(request: Request) {
  if (!ensureSameOrigin(request)) return jsonError("Request origin is not allowed.", 403);
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return jsonError("Please sign in to continue.", 401);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 1_500_000) return jsonError("The import request is too large. Use a smaller CSV file.", 413);
    const parsedRequest = importSchema.safeParse(await request.json());
    if (!parsedRequest.success) return jsonError("Choose a valid CSV with no more than 500 rows.", 400);
    const fields = await activeFieldsForOwner(user.id);
    const current = await db.select({ rollNumber: students.rollNumber, email: students.email }).from(students).where(eq(students.ownerId, user.id));
    const seenRolls = new Set(current.map((student) => student.rollNumber.toLowerCase()));
    const seenEmails = new Set(current.map((student) => student.email?.toLowerCase()).filter((value): value is string => Boolean(value)));
    const candidates: Array<{ row: number; data: ReturnType<typeof studentInputSchema.parse> }> = [];
    const rowErrors: Array<{ row: number; errors: string[] }> = [];

    for (const [index, raw] of parsedRequest.data.rows.entries()) {
      const rowNumber = index + 2;
      const normalized = normalizeRow(raw, fields);
      const student = studentInputSchema.safeParse(normalized);
      if (!student.success) {
        rowErrors.push({ row: rowNumber, errors: student.error.issues.slice(0, 5).map((issue) => issue.message) });
        continue;
      }
      const custom = validateCustomValues(fields, student.data.customValues);
      if (Object.keys(custom.errors).length) {
        rowErrors.push({ row: rowNumber, errors: Object.values(custom.errors).slice(0, 5) });
        continue;
      }
      const rollKey = student.data.rollNumber.toLowerCase();
      const emailKey = student.data.email.toLowerCase();
      if (seenRolls.has(rollKey)) {
        rowErrors.push({ row: rowNumber, errors: ["Roll number already exists in your workspace or this CSV."] });
        continue;
      }
      if (emailKey && seenEmails.has(emailKey)) {
        rowErrors.push({ row: rowNumber, errors: ["Email already exists in your workspace or this CSV."] });
        continue;
      }
      seenRolls.add(rollKey);
      if (emailKey) seenEmails.add(emailKey);
      candidates.push({ row: rowNumber, data: { ...student.data, customValues: custom.clean } });
    }

    if (parsedRequest.data.dryRun) return Response.json({ ok: true, dryRun: true, valid: candidates.length, failed: rowErrors.length, rowErrors });
    let imported = 0;
    for (const candidate of candidates) {
      try {
        await db.insert(students).values({
          ownerId: user.id,
          ...candidate.data,
          dateOfBirth: candidate.data.dateOfBirth || null,
          email: candidate.data.email.toLowerCase() || null,
          customValues: candidate.data.customValues,
        });
        imported += 1;
      } catch (error) {
        if (isDuplicateKeyError(error)) rowErrors.push({ row: candidate.row, errors: ["A matching roll number or email was added at the same time."] });
        else throw error;
      }
    }
    return Response.json({ ok: true, dryRun: false, imported, failed: rowErrors.length, rowErrors });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Request body must be valid JSON.", 400);
    return safeServerError(error);
  }
}
