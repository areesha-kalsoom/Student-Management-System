"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, CalendarDays, ContactRound, FileText, LoaderCircle, UserRound } from "lucide-react";
import { Notice } from "@/components/ui";
import { apiRequest, fieldMessage } from "@/lib/client/api";
import type { CustomField, Student } from "@/lib/types";

export type StudentFormValue = {
  name: string; rollNumber: string; dateOfBirth: string; gender: string; email: string; phone: string; address: string;
  className: string; department: string; enrollmentDate: string; status: string; notes: string; customValues: Record<string, unknown>;
};
const today = () => new Date().toISOString().slice(0, 10);
const blankValues = (): StudentFormValue => ({ name: "", rollNumber: "", dateOfBirth: "", gender: "", email: "", phone: "", address: "", className: "", department: "", enrollmentDate: today(), status: "active", notes: "", customValues: {} });
function studentValues(student?: Student): StudentFormValue {
  if (!student) return blankValues();
  return { name: student.name, rollNumber: student.rollNumber, dateOfBirth: student.dateOfBirth ?? "", gender: student.gender ?? "", email: student.email ?? "", phone: student.phone ?? "", address: student.address ?? "", className: student.className, department: student.department ?? "", enrollmentDate: student.enrollmentDate, status: student.status, notes: student.notes ?? "", customValues: student.customValues ?? {} };
}

function CustomControl({ field, value, onChange }: { field: CustomField; value: unknown; onChange: (value: unknown) => void }) {
  const textValue = typeof value === "string" || typeof value === "number" ? String(value) : "";
  if (field.type === "long_text") return <textarea className="textarea-input" aria-label={field.label} value={textValue} maxLength={2000} required={field.required} onChange={(event) => onChange(event.target.value)} placeholder={`Enter ${field.label.toLowerCase()}`} />;
  if (field.type === "yes_no") return <select className="select-input" aria-label={field.label} value={value === true ? "yes" : value === false ? "no" : ""} required={field.required} onChange={(event) => onChange(event.target.value === "" ? "" : event.target.value === "yes")}><option value="">Choose an answer</option><option value="yes">Yes</option><option value="no">No</option></select>;
  if (field.type === "single_select") return <select className="select-input" aria-label={field.label} value={textValue} required={field.required} onChange={(event) => onChange(event.target.value)}><option value="">Choose an option</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  if (field.type === "multi_select") {
    const selected = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    return <div className="custom-controls" role="group" aria-label={field.label}>{field.options.map((option) => <label className="checkbox-option" key={option}><input type="checkbox" checked={selected.includes(option)} onChange={(event) => onChange(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} />{option}</label>)}</div>;
  }
  const type = field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : field.type === "url" ? "url" : field.type === "phone" ? "tel" : "text";
  return <input className="text-input" type={type} aria-label={field.label} value={textValue} maxLength={255} required={field.required} onChange={(event) => onChange(field.type === "number" ? event.target.value === "" ? "" : Number(event.target.value) : event.target.value)} placeholder={`Enter ${field.label.toLowerCase()}`} />;
}

export function StudentForm({ student, mode }: { student?: Student; mode: "create" | "edit" }) {
  const [values, setValues] = useState<StudentFormValue>(() => studentValues(student));
  const [fields, setFields] = useState<CustomField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    apiRequest<{ fields: CustomField[] }>("/api/custom-fields", { cache: "no-store" }).then((result) => setFields(result.fields.filter((field) => !field.archived))).catch((caught) => setError(fieldMessage(caught))).finally(() => setFieldsLoading(false));
  }, []);
  const set = (key: keyof Omit<StudentFormValue, "customValues">, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const setCustom = (id: string, value: unknown) => setValues((current) => ({ ...current, customValues: { ...current.customValues, [id]: value } }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const activeValues = Object.fromEntries(fields.filter((field) => values.customValues[field.id] !== undefined).map((field) => [field.id, values.customValues[field.id]]));
      const payload = { ...values, customValues: activeValues };
      const result = await apiRequest<{ student: Student }>(mode === "create" ? "/api/students" : `/api/students/${student?.id}`, { method: mode === "create" ? "POST" : "PUT", body: JSON.stringify(payload) });
      window.location.assign(`/students/${result.student.id}`);
    } catch (caught) { setError(fieldMessage(caught)); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit}>
    {error && <div className="form-error-gap"><Notice>{error}</Notice></div>}
    <section className="panel form-section"><h2 className="form-section-heading"><UserRound size={16} />Personal information</h2><div className="form-grid"><label className="input-wrap"><span className="input-label">Full name <span className="required-mark">*</span></span><input className="text-input" value={values.name} onChange={(event) => set("name", event.target.value)} required maxLength={120} autoComplete="name" placeholder="Student’s full name" /></label><label className="input-wrap"><span className="input-label">Roll number <span className="required-mark">*</span></span><input className="text-input" value={values.rollNumber} onChange={(event) => set("rollNumber", event.target.value)} required maxLength={64} placeholder="e.g. 2024-018" /></label><label className="input-wrap"><span className="input-label">Date of birth</span><input className="text-input" type="date" value={values.dateOfBirth} onChange={(event) => set("dateOfBirth", event.target.value)} /></label><label className="input-wrap"><span className="input-label">Gender <span className="optional-mark">Optional</span></span><input className="text-input" value={values.gender} onChange={(event) => set("gender", event.target.value)} maxLength={40} placeholder="Enter a value or leave blank" /></label></div></section>
    <section className="panel form-section"><h2 className="form-section-heading"><ContactRound size={16} />Contact information</h2><div className="form-grid"><label className="input-wrap"><span className="input-label">Email address</span><input className="text-input" type="email" value={values.email} onChange={(event) => set("email", event.target.value)} maxLength={254} autoComplete="email" placeholder="student@example.com" /></label><label className="input-wrap"><span className="input-label">Phone number</span><input className="text-input" type="tel" value={values.phone} onChange={(event) => set("phone", event.target.value)} maxLength={40} placeholder="Phone number" /></label><label className="input-wrap detail-full"><span className="input-label">Address</span><textarea className="textarea-input" value={values.address} onChange={(event) => set("address", event.target.value)} maxLength={500} placeholder="Street, city, region" /></label></div></section>
    <section className="panel form-section"><h2 className="form-section-heading"><BookOpen size={16} />Academic & enrollment information</h2><div className="form-grid"><label className="input-wrap"><span className="input-label">Class <span className="required-mark">*</span></span><input className="text-input" value={values.className} onChange={(event) => set("className", event.target.value)} required maxLength={80} placeholder="e.g. Grade 10" /></label><label className="input-wrap"><span className="input-label">Department</span><input className="text-input" value={values.department} onChange={(event) => set("department", event.target.value)} maxLength={100} placeholder="e.g. Science" /></label><label className="input-wrap"><span className="input-label">Enrollment date <span className="required-mark">*</span></span><input className="text-input" type="date" value={values.enrollmentDate} onChange={(event) => set("enrollmentDate", event.target.value)} required /></label><label className="input-wrap"><span className="input-label">Student status</span><select className="select-input" value={values.status} onChange={(event) => set("status", event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div></section>
    {fieldsLoading ? <section className="panel form-section"><div className="loading-state"><LoaderCircle size={18} className="spin" />Loading your custom fields…</div></section> : fields.length > 0 && <section className="panel form-section"><h2 className="form-section-heading"><CalendarDays size={16} />Your custom fields</h2><div className="form-grid">{fields.map((field) => <div className="input-wrap" key={field.id}><span className="input-label">{field.label} {field.required && <span className="required-mark">*</span>}</span><CustomControl field={field} value={values.customValues[field.id]} onChange={(value) => setCustom(field.id, value)} /></div>)}</div></section>}
    <section className="panel form-section"><h2 className="form-section-heading"><FileText size={16} />Additional notes</h2><label className="input-wrap"><span className="input-label">Notes <span className="optional-mark">Optional</span></span><textarea className="textarea-input" value={values.notes} onChange={(event) => set("notes", event.target.value)} maxLength={3000} placeholder="Add a helpful note about this student…" /></label></section>
    <div className="form-actions"><Link className="button button-secondary" href={mode === "edit" && student ? `/students/${student.id}` : "/students"}>Cancel</Link><button className="button button-primary" disabled={busy || fieldsLoading}>{busy ? <><LoaderCircle size={15} className="spin" />Saving…</> : mode === "create" ? "Create student profile" : "Save changes"}</button></div>
  </form>;
}
