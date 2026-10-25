"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Check, Download, FileSpreadsheet, ShieldCheck, Upload, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button, Notice, Panel } from "@/components/ui";
import { parseCsv } from "@/lib/client/csv";
import { apiRequest, fieldMessage } from "@/lib/client/api";
import type { CustomField } from "@/lib/types";

type Sheet = { headers: string[]; rows: Record<string, string>[]; filename: string };
type ImportFeedback = { valid?: number; imported?: number; failed: number; rowErrors: Array<{ row: number; errors: string[] }> };
const standardTargets = [
  { key: "name", label: "Full name", required: true, aliases: ["name", "full name", "student name"] },
  { key: "rollNumber", label: "Roll number", required: true, aliases: ["roll number", "roll no", "rollnumber", "id"] },
  { key: "dateOfBirth", label: "Date of birth", aliases: ["date of birth", "dob", "birth date"] },
  { key: "gender", label: "Gender", aliases: ["gender"] },
  { key: "email", label: "Email address", aliases: ["email", "email address", "student email"] },
  { key: "phone", label: "Phone number", aliases: ["phone", "phone number", "mobile"] },
  { key: "address", label: "Address", aliases: ["address"] },
  { key: "className", label: "Class", required: true, aliases: ["class", "class name", "grade"] },
  { key: "department", label: "Department", aliases: ["department", "program"] },
  { key: "enrollmentDate", label: "Enrollment date", required: true, aliases: ["enrollment date", "enrolled", "enrollment"] },
  { key: "status", label: "Status", aliases: ["status", "student status"] },
  { key: "notes", label: "Notes", aliases: ["notes", "note"] },
];
const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export default function DataPage() {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<ImportFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [exportFilters, setExportFilters] = useState({ search: "", status: "", className: "", department: "", from: "", to: "" });
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState("");
  useEffect(() => {
    apiRequest<{ fields: CustomField[] }>("/api/custom-fields", { cache: "no-store" }).then((result) => setFields(result.fields.filter((field) => !field.archived))).catch(() => undefined);
  }, []);

  function guessMapping(headers: string[], customFields: CustomField[]) {
    const guesses: Record<string, string> = {};
    for (const target of standardTargets) {
      const match = headers.find((header) => target.aliases.includes(normalizeHeader(header)));
      if (match) guesses[target.key] = match;
    }
    for (const field of customFields) {
      const match = headers.find((header) => normalizeHeader(header) === normalizeHeader(field.label));
      if (match) guesses[field.id] = match;
    }
    return guesses;
  }
  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(""); setNotice(""); setFeedback(null); setSheet(null);
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") { setError("Choose a CSV file."); event.target.value = ""; return; }
    if (file.size > 1_400_000) { setError("This file is too large. Please keep CSV files below 1.4 MB."); event.target.value = ""; return; }
    try {
      const parsed = parseCsv(await file.text());
      if (parsed.rows.length > 500) throw new Error("The import is limited to 500 rows at a time. Split this file into smaller CSVs.");
      setSheet({ ...parsed, filename: file.name });
      setMapping(guessMapping(parsed.headers, fields));
    } catch (caught) { setError(fieldMessage(caught)); event.target.value = ""; }
  }
  const mappedRows = useMemo(() => {
    if (!sheet) return [];
    return sheet.rows.map((row) => {
      const data: Record<string, unknown> = {};
      for (const target of standardTargets) {
        const header = mapping[target.key];
        if (header) data[target.key] = row[header] ?? "";
      }
      const customValues: Record<string, unknown> = {};
      for (const field of fields) {
        const header = mapping[field.id];
        if (header) customValues[field.id] = row[header] ?? "";
      }
      data.customValues = customValues;
      return data;
    });
  }, [sheet, mapping, fields]);
  async function validateImport() {
    if (!sheet) return;
    setError(""); setNotice(""); setBusy(true);
    try { const result = await apiRequest<ImportFeedback>("/api/students/import", { method: "POST", body: JSON.stringify({ rows: mappedRows, dryRun: true }) }); setFeedback(result); }
    catch (caught) { setError(fieldMessage(caught)); }
    finally { setBusy(false); }
  }
  async function commitImport() {
    if (!sheet || !feedback || !feedback.valid) return;
    if (!window.confirm(`Import ${feedback.valid} validated student row${feedback.valid === 1 ? "" : "s"} into your private workspace?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await apiRequest<ImportFeedback & { imported: number }>("/api/students/import", { method: "POST", body: JSON.stringify({ rows: mappedRows, dryRun: false }) });
      setFeedback(result); setNotice(`${result.imported} student${result.imported === 1 ? "" : "s"} imported. ${result.failed} row${result.failed === 1 ? "" : "s"} skipped.`); setSheet(null); setMapping({});
    } catch (caught) { setError(fieldMessage(caught)); }
    finally { setBusy(false); }
  }
  async function exportCsv(filtered: boolean) {
    setExportBusy(true); setExportError("");
    try {
      const params = new URLSearchParams();
      if (filtered) {
        if (exportFilters.search.trim()) params.set("search", exportFilters.search.trim());
        if (exportFilters.status) params.set("status", exportFilters.status);
        if (exportFilters.className.trim()) params.set("class", exportFilters.className.trim());
        if (exportFilters.department.trim()) params.set("department", exportFilters.department.trim());
        if (exportFilters.from) params.set("from", exportFilters.from);
        if (exportFilters.to) params.set("to", exportFilters.to);
      }
      const response = await fetch(`/api/students/export?${params}`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error ?? `Export failed (${response.status}).`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = objectUrl; anchor.download = filtered ? "students-filtered-export.csv" : "students-export.csv"; anchor.click(); URL.revokeObjectURL(objectUrl);
    } catch (caught) { setExportError(fieldMessage(caught)); }
    finally { setExportBusy(false); }
  }
  const mappingTargets = [...standardTargets.map((target) => ({ key: target.key, label: target.label, required: Boolean(target.required) })), ...fields.filter((field) => !field.archived).map((field) => ({ key: field.id, label: field.label, required: field.required }))];
  return <AppShell title="Import & export" description="Move your records safely in and out of your private workspace.">
    {error && <div className="notice-space"><Notice>{error}</Notice></div>}{notice && <div className="notice-space"><Notice tone="success">{notice}</Notice></div>}
    <div className="data-layout"><Panel><div className="panel-heading"><div><h2><ArrowUpFromLine size={16} /> Import student records</h2><p>Preview, map columns, and validate before saving.</p></div><span className="data-limit">CSV · up to 500 rows</span></div><div className="drop-zone"><div><span className="drop-icon"><Upload size={21} /></span><strong>{sheet ? sheet.filename : "Choose a CSV file to get started"}</strong><span className="drop-help">CSV format only · maximum 1.4 MB · use fictional data</span><input type="file" accept=".csv,text/csv" aria-label="Choose a CSV file" onChange={chooseFile} /></div></div>{sheet && <><div className="import-summary"><FileSpreadsheet size={15} /><span>{sheet.rows.length} rows · {sheet.headers.length} columns</span><button className="icon-button" aria-label="Clear selected file" onClick={() => { setSheet(null); setFeedback(null); setMapping({}); }}><X size={15} /></button></div><h3 className="mapping-heading">Map your columns</h3><p className="field-help">Required: full name, roll number, class, and enrollment date. Unmapped optional fields stay blank.</p><div className="mapping-grid">{mappingTargets.map((target) => <label key={target.key} className="input-wrap"><span className="input-label">{target.label}{target.required && <span className="required-mark"> *</span>}</span><select className="select-input" value={mapping[target.key] ?? ""} onChange={(event) => { setMapping((current) => ({ ...current, [target.key]: event.target.value })); setFeedback(null); }}><option value="">Not mapped</option>{sheet.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>)}</div><div className="csv-preview"><table className="csv-table"><thead><tr>{sheet.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{sheet.rows.slice(0, 5).map((row, index) => <tr key={index}>{sheet.headers.map((header) => <td key={header}>{row[header]}</td>)}</tr>)}</tbody></table></div>{sheet.rows.length > 5 && <p className="field-help">Previewing 5 of {sheet.rows.length} rows.</p>}<div className="data-actions"><Button variant="secondary" onClick={() => void validateImport()} disabled={busy}>{busy ? "Validating…" : "Preview & validate"}</Button>{feedback && feedback.valid !== undefined && feedback.valid > 0 && <Button onClick={() => void commitImport()} disabled={busy}><Check size={15} />{busy ? "Importing…" : `Import ${feedback.valid} valid rows`}</Button>}</div>{feedback && <div className="validation-summary"><Notice tone={feedback.failed ? "info" : "success"}>{feedback.valid ?? feedback.imported ?? 0} valid row(s) · {feedback.failed} row(s) need attention. {feedback.imported !== undefined && `${feedback.imported} records saved.`}</Notice>{feedback.rowErrors.length > 0 && <ul className="row-errors">{feedback.rowErrors.map((item) => <li key={item.row}><strong>CSV row {item.row}:</strong> {item.errors.join(" · ")}</li>)}</ul>}</div>}</>}</Panel>
      <div className="export-stack"><Panel><div className="panel-heading"><div><h2><ArrowDownToLine size={16} /> Export records</h2><p>Only your own student records are included.</p></div><span className="export-shield"><ShieldCheck size={16} /></span></div><p className="export-copy">CSV exports include standard student information and any custom fields you marked as exportable. Internal IDs, owner identifiers, and session data are excluded. Spreadsheet formula-like values are safely escaped.</p><div className="data-actions"><Button onClick={() => void exportCsv(false)} disabled={exportBusy}><Download size={15} />{exportBusy ? "Preparing…" : "Export all students"}</Button></div></Panel><Panel><div className="panel-heading"><div><h2>Export a filtered set</h2><p>Use optional filters to narrow the CSV.</p></div></div>{exportError && <div className="notice-space"><Notice>{exportError}</Notice></div>}<div className="export-filter-grid"><label className="input-wrap"><span className="input-label">Search</span><input className="text-input" value={exportFilters.search} onChange={(event) => setExportFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Name, roll, class…" /></label><label className="input-wrap"><span className="input-label">Status</span><select className="select-input" value={exportFilters.status} onChange={(event) => setExportFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label><label className="input-wrap"><span className="input-label">Class</span><input className="text-input" value={exportFilters.className} onChange={(event) => setExportFilters((current) => ({ ...current, className: event.target.value }))} placeholder="Exact class" /></label><label className="input-wrap"><span className="input-label">Department</span><input className="text-input" value={exportFilters.department} onChange={(event) => setExportFilters((current) => ({ ...current, department: event.target.value }))} placeholder="Exact department" /></label><label className="input-wrap"><span className="input-label">Enrolled from</span><input className="text-input" type="date" value={exportFilters.from} onChange={(event) => setExportFilters((current) => ({ ...current, from: event.target.value }))} /></label><label className="input-wrap"><span className="input-label">Enrolled to</span><input className="text-input" type="date" value={exportFilters.to} onChange={(event) => setExportFilters((current) => ({ ...current, to: event.target.value }))} /></label></div><div className="data-actions"><Button variant="secondary" onClick={() => void exportCsv(true)} disabled={exportBusy}><Download size={15} />Export filtered results</Button><button className="button button-quiet" onClick={() => setExportFilters({ search: "", status: "", className: "", department: "", from: "", to: "" })}>Clear</button></div></Panel></div></div>
    <div className="data-safety-note"><ShieldCheck size={17} /><span>Import is validated by the server against your account’s student and custom-field rules. Duplicate roll numbers or email addresses are reported and skipped; other accounts are never queried.</span></div>
  </AppShell>;
}
