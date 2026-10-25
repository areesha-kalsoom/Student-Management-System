"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StudentForm } from "@/components/student-form";
import { LoadingState, Notice, Panel } from "@/components/ui";
import { apiRequest, fieldMessage } from "@/lib/client/api";
import type { Student } from "@/lib/types";

export default function EditStudentPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    apiRequest<{ student: Student }>(`/api/students/${id}`, { cache: "no-store" }).then((result) => { if (!cancelled) setStudent(result.student); }).catch((caught) => { if (!cancelled) setError(fieldMessage(caught)); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);
  return <AppShell title="Edit student" description="Update this student’s profile in your private workspace." action={<Link className="button button-secondary" href={`/students/${id}`}><ArrowLeft size={15} />Student profile</Link>}>
    {error && <div className="notice-space"><Notice>{error}</Notice></div>}{loading ? <Panel><LoadingState label="Loading student details…" /></Panel> : student ? <StudentForm key={student.id} student={student} mode="edit" /> : <Panel><div className="empty-state"><h3>Student not found</h3><p>This student may have been removed or is not available in your workspace.</p><Link className="button button-secondary" href="/students">Back to directory</Link></div></Panel>}
  </AppShell>;
}
