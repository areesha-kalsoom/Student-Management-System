"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, ContactRound, Edit3, FileText, GraduationCap, Trash2, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, LoadingState, Notice, Panel } from "@/components/ui";
import { apiRequest, fieldMessage } from "@/lib/client/api";
import { formatDate, initials } from "@/lib/client/format";
import type { CustomField, Student } from "@/lib/types";

function Detail({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={`detail-item ${full ? "detail-full" : ""}`}><small>{label}</small><span>{children || "Not provided"}</span></div>;
}
function customValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ") || "Not provided";
  return typeof value === "object" ? "Not provided" : String(value);
}

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [student, setStudent] = useState<Student | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all([apiRequest<{ student: Student }>(`/api/students/${id}`, { cache: "no-store" }), apiRequest<{ fields: CustomField[] }>("/api/custom-fields", { cache: "no-store" })])
      .then(([profile, fieldResponse]) => { if (!cancelled) { setStudent(profile.student); setFields(fieldResponse.fields); } })
      .catch((caught) => { if (!cancelled) setError(fieldMessage(caught)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);
  async function deleteStudent() {
    if (!student || !window.confirm(`Delete ${student.name} (${student.rollNumber})? This cannot be undone.`)) return;
    setBusy(true);
    try { await apiRequest(`/api/students/${student.id}`, { method: "DELETE" }); router.replace("/students"); }
    catch (caught) { setError(fieldMessage(caught)); setBusy(false); }
  }
  const visibleFields = fields.filter((field) => !field.archived && student && student.customValues[field.id] !== undefined);
  return <AppShell title="Student profile" description="A private view of this student’s information." action={<Link className="button button-secondary" href="/students"><ArrowLeft size={15} />Directory</Link>}>
    {error && <div className="notice-space"><Notice>{error}</Notice></div>}
    {loading ? <Panel><LoadingState label="Loading student profile…" /></Panel> : student ? <>
      <Panel className="profile-header"><span className="avatar">{initials(student.name)}</span><div className="profile-heading-copy"><div className="profile-badges"><span className={`badge ${student.status === "inactive" ? "badge-inactive" : ""}`}>{student.status}</span><span className="badge badge-neutral">Roll no. {student.rollNumber}</span></div><h2>{student.name}</h2><p>{student.className}{student.department ? ` · ${student.department}` : ""}</p></div><div className="profile-actions"><Link className="button button-secondary" href={`/students/${student.id}/edit`}><Edit3 size={15} />Edit profile</Link><button className="button button-danger" onClick={deleteStudent} disabled={busy}><Trash2 size={15} />{busy ? "Deleting…" : "Delete"}</button></div></Panel>
      <div className="profile-sections"><Panel><div className="panel-heading"><h2><UserRound size={15} /> Personal information</h2></div><div className="detail-grid"><Detail label="Full name">{student.name}</Detail><Detail label="Roll number">{student.rollNumber}</Detail><Detail label="Date of birth">{student.dateOfBirth ? formatDate(student.dateOfBirth) : "Not provided"}</Detail><Detail label="Gender">{student.gender}</Detail></div></Panel><Panel><div className="panel-heading"><h2><ContactRound size={15} /> Contact information</h2></div><div className="detail-grid"><Detail label="Email address">{student.email ? <a className="detail-link" href={`mailto:${student.email}`}>{student.email}</a> : "Not provided"}</Detail><Detail label="Phone number">{student.phone ? <a className="detail-link" href={`tel:${student.phone}`}>{student.phone}</a> : "Not provided"}</Detail><Detail label="Address" full>{student.address}</Detail></div></Panel><Panel><div className="panel-heading"><h2><GraduationCap size={15} /> Academic information</h2></div><div className="detail-grid"><Detail label="Class">{student.className}</Detail><Detail label="Department">{student.department}</Detail></div></Panel><Panel><div className="panel-heading"><h2><CalendarDays size={15} /> Enrollment information</h2></div><div className="detail-grid"><Detail label="Status"><span className={`badge ${student.status === "inactive" ? "badge-inactive" : ""}`}>{student.status}</span></Detail><Detail label="Enrollment date">{formatDate(student.enrollmentDate)}</Detail><Detail label="Profile created">{formatDate(student.createdAt)}</Detail><Detail label="Last updated">{formatDate(student.updatedAt)}</Detail></div></Panel>{visibleFields.length > 0 && <Panel className="profile-custom-fields"><div className="panel-heading"><h2><FileText size={15} /> Custom fields</h2></div><div className="detail-grid">{visibleFields.map((field) => <Detail key={field.id} label={field.label}>{customValue(student.customValues[field.id])}</Detail>)}</div></Panel>}{student.notes && <Panel className="profile-notes"><div className="panel-heading"><h2><FileText size={15} /> Notes</h2></div><div className="notes-block">{student.notes}</div></Panel>}</div>
    </> : <Panel><EmptyState icon={UserRound} title="Student not found" description="This profile is unavailable or may have been removed from your workspace." action={<Link className="button button-secondary" href="/students"><ArrowLeft size={14} />Back to directory</Link>} /></Panel>}
  </AppShell>;
}
