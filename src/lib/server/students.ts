import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customFieldDefinitions, students } from "@/db/schema";
import { validateCustomValues, type FieldDefinition } from "@/lib/server/validation";

export async function activeFieldsForOwner(ownerId: string): Promise<FieldDefinition[]> {
  return db.select().from(customFieldDefinitions).where(and(eq(customFieldDefinitions.ownerId, ownerId), eq(customFieldDefinitions.archived, false))).orderBy(customFieldDefinitions.position);
}

export async function validateStudentPayload(ownerId: string, customValues: Record<string, unknown>) {
  const fields = await activeFieldsForOwner(ownerId);
  if (fields.length > 30) return { errors: { _form: "The custom field limit has been reached." }, clean: {} as Record<string, unknown>, fields };
  const result = validateCustomValues(fields, customValues);
  return { ...result, fields };
}

export async function readOwnedStudent(ownerId: string, id: string) {
  const [student] = await db.select().from(students).where(and(eq(students.id, id), eq(students.ownerId, ownerId))).limit(1);
  return student ?? null;
}
