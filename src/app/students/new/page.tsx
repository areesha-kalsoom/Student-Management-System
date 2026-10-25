import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui";
import { StudentForm } from "@/components/student-form";

export default function NewStudentPage() {
  return <AppShell title="Add a student" description="Create a new student profile in your private workspace." action={<Link className="button button-secondary" href="/students"><ArrowLeft size={15} />Directory</Link>}><div className="form-page-intro"><span className="form-step-icon"><UserPlus size={18} /></span><div><strong>A complete profile, made simple</strong><span>Fields marked with * are required. Student records are visible only to you.</span></div></div><StudentForm mode="create" /></AppShell>;
}
