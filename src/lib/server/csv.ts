import { escapeCsvCell } from "@/lib/server/http";
import type { FieldDefinition } from "@/lib/server/validation";
import type { Student } from "@/lib/types";

const standardColumns: Array<{ key: keyof Student; label: string }> = [
  { key: "name", label: "Name" }, { key: "rollNumber", label: "Roll Number" },
  { key: "dateOfBirth", label: "Date of Birth" }, { key: "gender", label: "Gender" },
  { key: "email", label: "Email" }, { key: "phone", label: "Phone" },
  { key: "address", label: "Address" }, { key: "className", label: "Class" },
  { key: "department", label: "Department" }, { key: "enrollmentDate", label: "Enrollment Date" },
  { key: "status", label: "Status" }, { key: "notes", label: "Notes" },
];

export function buildStudentCsv(records: Student[], fields: FieldDefinition[]) {
  const exportFields = fields.filter((field) => !field.archived && field.exportable);
  const headers = [...standardColumns.map((column) => column.label), ...exportFields.map((field) => field.label)];
  const rows = records.map((student) => [
    ...standardColumns.map((column) => student[column.key] ?? ""),
    ...exportFields.map((field) => {
      const value = student.customValues[field.id];
      return Array.isArray(value) ? value.join("; ") : typeof value === "boolean" ? (value ? "Yes" : "No") : value ?? "";
    }),
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}
