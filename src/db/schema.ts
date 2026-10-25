import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "sms_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: varchar("password_hash", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("sms_users_email_unique").on(table.email)],
);

export const sessions = pgTable(
  "sms_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("sms_sessions_token_hash_unique").on(table.tokenHash), index("sms_sessions_user_idx").on(table.userId)],
);

export const students = pgTable(
  "sms_students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    rollNumber: varchar("roll_number", { length: 64 }).notNull(),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    gender: varchar("gender", { length: 40 }).notNull().default(""),
    email: varchar("email", { length: 254 }),
    phone: varchar("phone", { length: 40 }).notNull().default(""),
    address: varchar("address", { length: 500 }).notNull().default(""),
    className: varchar("class_name", { length: 80 }).notNull(),
    department: varchar("department", { length: 100 }).notNull().default(""),
    enrollmentDate: date("enrollment_date", { mode: "string" }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    notes: text("notes").notNull().default(""),
    customValues: jsonb("custom_values").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sms_students_owner_roll_unique").on(table.ownerId, table.rollNumber),
    uniqueIndex("sms_students_owner_email_unique").on(table.ownerId, table.email).where(sql`${table.email} IS NOT NULL`),
    index("sms_students_owner_created_idx").on(table.ownerId, table.createdAt),
    index("sms_students_owner_status_idx").on(table.ownerId, table.status),
    check("sms_students_status_check", sql`${table.status} IN ('active', 'inactive')`),
  ],
);

export const customFieldDefinitions = pgTable(
  "sms_custom_field_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 80 }).notNull(),
    key: varchar("key", { length: 64 }).notNull(),
    type: varchar("type", { length: 24 }).notNull(),
    required: boolean("required").notNull().default(false),
    options: jsonb("options").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    position: integer("position").notNull().default(0),
    showOnCard: boolean("show_on_card").notNull().default(false),
    searchable: boolean("searchable").notNull().default(false),
    filterable: boolean("filterable").notNull().default(false),
    exportable: boolean("exportable").notNull().default(true),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sms_custom_fields_owner_key_unique").on(table.ownerId, table.key),
    index("sms_custom_fields_owner_position_idx").on(table.ownerId, table.position),
    check("sms_custom_fields_type_check", sql`${table.type} IN ('short_text', 'long_text', 'number', 'date', 'yes_no', 'single_select', 'multi_select', 'email', 'phone', 'url')`),
  ],
);
