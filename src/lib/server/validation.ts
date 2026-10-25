import { z } from "zod";
import type { InferSelectModel } from "drizzle-orm";
import { customFieldDefinitions } from "@/db/schema";

function isValidDate(value: string) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

const dateString = z.string().refine((value) => !value || isValidDate(value), "Enter a valid date.");

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().max(254).email("Enter a valid email address.").transform((value) => value.toLowerCase()),
  password: z.string().min(12, "Use at least 12 characters.").max(128),
  termsAccepted: z.literal(true, { error: "Accept the terms to create an account." }),
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().max(254).email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
}).strict();

export const studentInputSchema = z.object({
  name: z.string().trim().min(1, "Student name is required.").max(120),
  rollNumber: z.string().trim().min(1, "Roll number is required.").max(64).transform((value) => value.toUpperCase()),
  dateOfBirth: dateString.optional().default(""),
  gender: z.string().trim().max(40).optional().default(""),
  email: z.union([z.literal(""), z.string().trim().max(254).email("Enter a valid student email.")]).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  address: z.string().trim().max(500).optional().default(""),
  className: z.string().trim().min(1, "Class is required.").max(80),
  department: z.string().trim().max(100).optional().default(""),
  enrollmentDate: dateString.refine((value) => value.length > 0, "Enrollment date is required."),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().trim().max(3000).optional().default(""),
  customValues: z.record(z.string(), z.unknown()).optional().default({}),
}).strict();

export const customFieldSchema = z.object({
  label: z.string().trim().min(1).max(80),
  type: z.enum(["short_text", "long_text", "number", "date", "yes_no", "single_select", "multi_select", "email", "phone", "url"]),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  showOnCard: z.boolean().default(false),
  searchable: z.boolean().default(false),
  filterable: z.boolean().default(false),
  exportable: z.boolean().default(true),
}).strict().superRefine((field, context) => {
  if (["single_select", "multi_select"].includes(field.type) && field.options.length === 0) {
    context.addIssue({ code: "custom", message: "Add at least one option for a selection field.", path: ["options"] });
  }
  if (new Set(field.options).size !== field.options.length) {
    context.addIssue({ code: "custom", message: "Options must be unique.", path: ["options"] });
  }
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
}).strict();

export type FieldDefinition = InferSelectModel<typeof customFieldDefinitions>;

export function validateCustomValues(definitions: FieldDefinition[], values: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const clean: Record<string, unknown> = {};
  const byId = new Map(definitions.filter((field) => !field.archived).map((field) => [field.id, field]));

  for (const id of Object.keys(values)) {
    if (!byId.has(id)) errors[id] = "This field is no longer available.";
  }

  for (const field of byId.values()) {
    const value = values[field.id];
    const empty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
    if (empty) {
      if (field.required) errors[field.id] = `${field.label} is required.`;
      continue;
    }
    const invalid = (message: string) => { errors[field.id] = message; };
    switch (field.type) {
      case "yes_no":
        if (typeof value !== "boolean") invalid(`${field.label} must be yes or no.`);
        else clean[field.id] = value;
        break;
      case "number":
        if (typeof value !== "number" || !Number.isFinite(value)) invalid(`${field.label} must be a valid number.`);
        else clean[field.id] = value;
        break;
      case "multi_select":
        if (!Array.isArray(value) || value.length > field.options.length || value.some((item) => typeof item !== "string" || !field.options.includes(item))) {
          invalid(`Choose valid options for ${field.label}.`);
        } else clean[field.id] = value;
        break;
      case "single_select":
        if (typeof value !== "string" || !field.options.includes(value)) invalid(`Choose a valid option for ${field.label}.`);
        else clean[field.id] = value;
        break;
      case "date":
        if (typeof value !== "string" || !isValidDate(value)) invalid(`${field.label} must be a valid date.`);
        else clean[field.id] = value;
        break;
      default: {
        if (typeof value !== "string" || value.length > (field.type === "long_text" ? 2000 : 255)) {
          invalid(`${field.label} is too long or has an invalid value.`);
          break;
        }
        if (field.type === "email" && value && !z.string().email().safeParse(value).success) {
          invalid(`${field.label} must be a valid email address.`);
          break;
        }
        if (field.type === "url" && value) {
          try {
            const url = new URL(value);
            if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Unsupported protocol");
          } catch {
            invalid(`${field.label} must be a valid http or https URL.`);
            break;
          }
        }
        clean[field.id] = value;
      }
    }
  }
  return { errors, clean };
}
