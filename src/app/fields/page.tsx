"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Archive, Check, Eye, FilePlus2, Filter, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button, EmptyState, LoadingState, Notice, Panel } from "@/components/ui";
import { apiRequest, fieldMessage } from "@/lib/client/api";
import type { CustomField } from "@/lib/types";

type FieldType = CustomField["type"];
type FieldDraft = { label: string; type: FieldType; required: boolean; optionsText: string; showOnCard: boolean; searchable: boolean; filterable: boolean; exportable: boolean };
const freshDraft = (): FieldDraft => ({ label: "", type: "short_text", required: false, optionsText: "", showOnCard: false, searchable: false, filterable: false, exportable: true });
const typeLabels: Record<FieldType, string> = { short_text: "Short text", long_text: "Long text", number: "Number", date: "Date", yes_no: "Yes / No", single_select: "Single select", multi_select: "Multi-select", email: "Email", phone: "Phone number", url: "URL" };
const selectTypes: FieldType[] = ["single_select", "multi_select"];

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [draft, setDraft] = useState<FieldDraft>(freshDraft());
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    setError("");
    try { const result = await apiRequest<{ fields: CustomField[] }>("/api/custom-fields", { cache: "no-store" }); setFields(result.fields); }
    catch (caught) { setError(fieldMessage(caught)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  function startEdit(field: CustomField) {
    setEditing(field);
    setDraft({ label: field.label, type: field.type, required: field.required, optionsText: field.options.join(", "), showOnCard: field.showOnCard, searchable: field.searchable, filterable: field.filterable, exportable: field.exportable });
    setError(""); setNotice("");
  }
  function resetForm() { setEditing(null); setDraft(freshDraft()); setError(""); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice(""); setBusy(true);
    const options = selectTypes.includes(draft.type) ? draft.optionsText.split(",").map((option) => option.trim()).filter(Boolean) : [];
    const body = { label: draft.label, type: draft.type, required: draft.required, options, showOnCard: draft.showOnCard, searchable: draft.searchable, filterable: draft.filterable, exportable: draft.exportable };
    try {
      await apiRequest(editing ? `/api/custom-fields/${editing.id}` : "/api/custom-fields", { method: editing ? "PUT" : "POST", body: JSON.stringify(body) });
      setNotice(editing ? "Custom field updated." : "Custom field created."); resetForm(); await load();
    } catch (caught) { setError(fieldMessage(caught)); }
    finally { setBusy(false); }
  }
  async function toggleArchive(field: CustomField) {
    const next = !field.archived;
    const message = next ? `Archive “${field.label}”? Its values will stay on student records, but the field will no longer appear in forms or filters.` : `Restore “${field.label}” to active student forms?`;
    if (!window.confirm(message)) return;
    try { await apiRequest(`/api/custom-fields/${field.id}`, { method: "PATCH", body: JSON.stringify({ archived: next }) }); setNotice(next ? "Field archived; student values were preserved." : "Field restored."); await load(); }
    catch (caught) { setError(fieldMessage(caught)); }
  }
  async function move(field: CustomField, offset: number) {
    const active = fields.filter((item) => !item.archived).sort((a, b) => a.position - b.position);
    const index = active.findIndex((item) => item.id === field.id);
    const target = index + offset;
    if (target < 0 || target >= active.length) return;
    [active[index], active[target]] = [active[target], active[index]];
    try { await apiRequest("/api/custom-fields/reorder", { method: "PUT", body: JSON.stringify({ ids: active.map((item) => item.id) }) }); await load(); }
    catch (caught) { setError(fieldMessage(caught)); }
  }
  const ordered = [...fields].sort((a, b) => a.position - b.position);
  return <AppShell title="Custom field builder" description="Shape your student form around the details that matter to you.">
    {error && <div className="notice-space"><Notice>{error}</Notice></div>}{notice && <div className="notice-space"><Notice tone="success">{notice}</Notice></div>}
    <div className="field-builder-layout"><div className="fields-column"><Panel><div className="panel-heading"><div><h2>Your fields</h2><p>{fields.length} of 30 definitions · private to this workspace</p></div><span className="field-count"><FilePlus2 size={15} />{fields.filter((field) => !field.archived).length} active</span></div>{loading ? <LoadingState label="Loading your field definitions…" /> : ordered.length ? <div className="field-list">{ordered.map((field) => <article key={field.id} className={`field-card ${field.archived ? "field-card-archived" : ""}`}><span className="field-drag" aria-hidden="true">⠿</span><div className="field-card-copy"><strong>{field.label}{field.required && <span className="required-mark"> *</span>}</strong><div className="field-card-meta"><span className="field-chip">{typeLabels[field.type]}</span>{field.archived ? <span className="field-chip">Archived</span> : <>{field.showOnCard && <span className="field-chip">Card</span>}{field.searchable && <span className="field-chip">Search</span>}{field.filterable && <span className="field-chip">Filter</span>}{field.exportable && <span className="field-chip">Export</span>}</>}</div></div><div className="field-card-actions">{!field.archived && <><button className="icon-button" aria-label={`Move ${field.label} up`} title="Move up" disabled={fields.filter((item) => !item.archived).sort((a, b) => a.position - b.position)[0]?.id === field.id} onClick={() => void move(field, -1)}><ArrowUp size={15} /></button><button className="icon-button" aria-label={`Move ${field.label} down`} title="Move down" disabled={fields.filter((item) => !item.archived).sort((a, b) => a.position - b.position).at(-1)?.id === field.id} onClick={() => void move(field, 1)}><ArrowDown size={15} /></button><button className="icon-button" aria-label={`Edit ${field.label}`} title="Edit field" onClick={() => startEdit(field)}><Pencil size={14} /></button></>}<button className="icon-button" aria-label={field.archived ? `Restore ${field.label}` : `Archive ${field.label}`} title={field.archived ? "Restore field" : "Archive field"} onClick={() => void toggleArchive(field)}>{field.archived ? <Check size={15} /> : <Archive size={14} />}</button></div></article>)}</div> : <EmptyState icon={FilePlus2} title="Make the form yours" description="Create fields for the student information that matters to you. Your definitions never affect another workspace." />}</Panel><Panel className="builder-guidance"><h3>About archived fields</h3><p>Archiving removes a field from new forms and filters. Existing student values are preserved and return if you restore the field. Type or option changes are blocked while student values are saved, protecting your data.</p></Panel></div>
      <div className="builder-side"><Panel><div className="panel-heading"><div><h2>{editing ? "Edit field" : "Create a field"}</h2><p>Student forms update automatically.</p></div></div><form className="field-form" onSubmit={save}><label className="input-wrap"><span className="input-label">Field label <span className="required-mark">*</span></span><input className="text-input" value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} maxLength={80} required placeholder="e.g. Previous school" /></label><label className="input-wrap"><span className="input-label">Field type</span><select className="select-input" value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as FieldType }))}>{Object.entries(typeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>{selectTypes.includes(draft.type) && <label className="input-wrap"><span className="input-label">Options <span className="required-mark">*</span></span><textarea className="textarea-input options-textarea" value={draft.optionsText} onChange={(event) => setDraft((current) => ({ ...current, optionsText: event.target.value }))} placeholder="One option per line or separate with commas" required /> <span className="field-help">Separate choices with commas. Up to 30 options.</span></label>}
        <div className="switch-list"><div className="switch-row"><span>Required on student form</span><button type="button" role="switch" aria-checked={draft.required} className="switch-control" onClick={() => setDraft((current) => ({ ...current, required: !current.required }))} /></div><div className="switch-row"><span>Show on profile cards</span><button type="button" role="switch" aria-checked={draft.showOnCard} className="switch-control" onClick={() => setDraft((current) => ({ ...current, showOnCard: !current.showOnCard }))} /></div><div className="switch-row"><span>Include in directory search</span><button type="button" role="switch" aria-checked={draft.searchable} className="switch-control" onClick={() => setDraft((current) => ({ ...current, searchable: !current.searchable }))} /></div><div className="switch-row"><span>Show as a directory filter</span><button type="button" role="switch" aria-checked={draft.filterable} className="switch-control" onClick={() => setDraft((current) => ({ ...current, filterable: !current.filterable }))} /></div><div className="switch-row"><span>Include in CSV export</span><button type="button" role="switch" aria-checked={draft.exportable} className="switch-control" onClick={() => setDraft((current) => ({ ...current, exportable: !current.exportable }))} /></div></div><div className="form-actions"><Button type="button" variant="secondary" onClick={resetForm} disabled={busy}>{editing ? "Cancel" : "Clear"}</Button><Button type="submit" disabled={busy || loading || (fields.length >= 30 && !editing)}><Plus size={14} />{busy ? "Saving…" : editing ? "Save changes" : "Add field"}</Button></div></form></Panel><Panel className="form-preview"><div className="panel-heading"><div><h2><Eye size={15} /> Form preview</h2><p>Preview uses your current field setup.</p></div></div><label className="preview-field"><span className="preview-label">{draft.label || "Your field label"}{draft.required && <span className="required-mark"> *</span>}</span>{selectTypes.includes(draft.type) ? <select className="select-input" disabled><option>{draft.optionsText.split(",")[0]?.trim() || "Choose an option"}</option></select> : draft.type === "long_text" ? <textarea className="textarea-input" disabled placeholder="Your student value" /> : <input className="text-input" disabled type={draft.type === "date" ? "date" : draft.type === "number" ? "number" : draft.type === "email" ? "email" : draft.type === "phone" ? "tel" : draft.type === "url" ? "url" : "text"} placeholder={draft.type === "yes_no" ? "Yes / No" : "Your student value"} />}</label><div className="preview-meta"><span><Search size={12} /> Searchable</span><span><Filter size={12} /> Filterable</span></div></Panel></div></div>
  </AppShell>;
}
