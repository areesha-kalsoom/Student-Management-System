"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight, FilterX, Plus, Search, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StudentCard } from "@/components/student-card";
import { Button, EmptyState, LoadingState, Notice, Panel } from "@/components/ui";
import { apiRequest, fieldMessage } from "@/lib/client/api";
import type { CustomField, Student } from "@/lib/types";

type ListResponse = { students: Student[]; page: number; limit: number; total: number; pages: number; classOptions: string[]; departmentOptions: string[]; genderOptions: string[] };
const initialFilters = { status: "", className: "", department: "", gender: "", from: "", to: "", sort: "createdAt", direction: "desc" };

export default function StudentsPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [customFilters, setCustomFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const customKey = useMemo(() => JSON.stringify(customFilters), [customFilters]);
  const load = useCallback(async (signalState?: { cancelled: boolean }) => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(page), limit: "12", sort: filters.sort, direction: filters.direction });
    if (search.trim()) params.set("search", search.trim());
    if (filters.status) params.set("status", filters.status);
    if (filters.className) params.set("class", filters.className);
    if (filters.department) params.set("department", filters.department);
    if (filters.gender) params.set("gender", filters.gender);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    for (const [id, value] of Object.entries(customFilters)) if (value) params.set(`custom_${id}`, value);
    try {
      const result = await apiRequest<ListResponse>(`/api/students?${params}`, { cache: "no-store" });
      if (!signalState?.cancelled) setData(result);
    } catch (caught) { if (!signalState?.cancelled) setError(fieldMessage(caught)); }
    finally { if (!signalState?.cancelled) setLoading(false); }
  }, [page, search, filters, customFilters]);
  useEffect(() => { const state = { cancelled: false }; const timeout = window.setTimeout(() => void load(state), 220); return () => { state.cancelled = true; window.clearTimeout(timeout); }; }, [load, customKey]);
  useEffect(() => { apiRequest<{ fields: CustomField[] }>("/api/custom-fields", { cache: "no-store" }).then((result) => setFields(result.fields.filter((field) => !field.archived))).catch(() => undefined); }, []);
  const changeFilter = (key: keyof typeof filters, value: string) => { setPage(1); setFilters((current) => ({ ...current, [key]: value })); };
  function resetFilters() { setPage(1); setSearch(""); setFilters(initialFilters); setCustomFilters({}); }
  async function deleteStudent(student: Student) {
    if (!window.confirm(`Delete ${student.name} (${student.rollNumber})? This cannot be undone.`)) return;
    try { await apiRequest(`/api/students/${student.id}`, { method: "DELETE" }); setNotice(`${student.name} was deleted.`); void load(); }
    catch (caught) { setError(fieldMessage(caught)); }
  }
  const hasFilters = Boolean(search || filters.status || filters.className || filters.department || filters.gender || filters.from || filters.to || Object.values(customFilters).some(Boolean));
  const filterable = fields.filter((field) => field.filterable);
  return <AppShell title="Student directory" description="Search, filter, and manage the student profiles in your workspace." action={<Link className="button button-primary" href="/students/new"><Plus size={16} />Add student</Link>}>
    {notice && <div className="notice-space"><Notice tone="success">{notice}</Notice></div>}{error && <div className="notice-space"><Notice>{error}</Notice></div>}
    <Panel className="search-panel"><label className="input-wrap search-input-wrap"><span className="input-label">Search students</span><span className="search-icon"><Search size={15} /></span><input className="text-input" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Name, roll number, class, email…" /></label><label className="input-wrap"><span className="input-label">Status</span><select className="select-input" value={filters.status} onChange={(event) => changeFilter("status", event.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label><label className="input-wrap"><span className="input-label">Class</span><select className="select-input" value={filters.className} onChange={(event) => changeFilter("className", event.target.value)}><option value="">All classes</option>{(data?.classOptions ?? []).map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="input-wrap"><span className="input-label">Department</span><select className="select-input" value={filters.department} onChange={(event) => changeFilter("department", event.target.value)}><option value="">All departments</option>{(data?.departmentOptions ?? []).map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="input-wrap"><span className="input-label">Gender</span><select className="select-input" value={filters.gender} onChange={(event) => changeFilter("gender", event.target.value)}><option value="">All values</option>{(data?.genderOptions ?? []).map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="input-wrap"><span className="input-label">Enrolled from</span><input className="text-input" type="date" value={filters.from} onChange={(event) => changeFilter("from", event.target.value)} /></label><label className="input-wrap"><span className="input-label">Enrolled to</span><input className="text-input" type="date" value={filters.to} onChange={(event) => changeFilter("to", event.target.value)} /></label><label className="input-wrap"><span className="input-label"><ArrowDownUp size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />Sort by</span><select className="select-input" value={`${filters.sort}:${filters.direction}`} onChange={(event) => { const [sort, direction] = event.target.value.split(":"); setPage(1); setFilters((current) => ({ ...current, sort, direction })); }}><option value="createdAt:desc">Recently added</option><option value="createdAt:asc">Oldest added</option><option value="name:asc">Name A–Z</option><option value="name:desc">Name Z–A</option><option value="rollNumber:asc">Roll number</option><option value="enrollmentDate:desc">Enrollment date</option></select></label>{filterable.map((field) => <label className="input-wrap" key={field.id}><span className="input-label">{field.label}</span>{field.options.length ? <select className="select-input" value={customFilters[field.id] ?? ""} onChange={(event) => { setPage(1); setCustomFilters((current) => ({ ...current, [field.id]: event.target.value })); }}><option value="">Any value</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input className="text-input" value={customFilters[field.id] ?? ""} onChange={(event) => { setPage(1); setCustomFilters((current) => ({ ...current, [field.id]: event.target.value })); }} placeholder={`Filter ${field.label.toLowerCase()}`} />}</label>)}<Button variant="quiet" className="filters-reset" onClick={resetFilters} disabled={!hasFilters}><FilterX size={15} />Reset filters</Button></Panel>
    <div className="directory-meta"><span>{loading ? "Updating results…" : `${data?.total ?? 0} ${data?.total === 1 ? "student" : "students"} found`}</span><span>Card view · private to your account</span></div>
    {loading && !data ? <Panel><LoadingState label="Loading your student directory…" /></Panel> : data?.students.length ? <><div className={`student-grid ${loading ? "student-grid-loading" : ""}`}>{data.students.map((student) => <StudentCard key={student.id} student={student} onDelete={deleteStudent} fields={fields} />)}</div><div className="pagination"><span>Showing {Math.min((page - 1) * (data?.limit ?? 12) + 1, data?.total ?? 0)}–{Math.min(page * (data?.limit ?? 12), data?.total ?? 0)} of {data?.total ?? 0}</span><div className="pagination-actions"><Button variant="secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}><ChevronLeft size={14} />Previous</Button><span className="page-count">Page {data?.page ?? page} of {Math.max(data?.pages ?? 1, 1)}</span><Button variant="secondary" onClick={() => setPage((current) => Math.min(data?.pages ?? current, current + 1))} disabled={page >= (data?.pages ?? 1) || loading}>Next<ChevronRight size={14} /></Button></div></div></> : <Panel><EmptyState icon={Users} title={hasFilters ? "No matching students" : "Your directory is ready"} description={hasFilters ? "Try adjusting your search or clearing the filters to find what you need." : "Add your first student to start building your private directory."} action={hasFilters ? <Button variant="secondary" onClick={resetFilters}>Clear filters</Button> : <Link className="button button-primary" href="/students/new"><Plus size={15} />Add student</Link>} /></Panel>}
  </AppShell>;
}
