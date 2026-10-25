"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Mars, Plus, UserCheck, UserMinus, UserPlus, Users, Venus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, LoadingState, Notice, Panel } from "@/components/ui";
import { StudentMini } from "@/components/student-card";
import { apiRequest, fieldMessage } from "@/lib/client/api";
import type { Student } from "@/lib/types";

 type StatsResponse = {
  stats: { total: number; active: number; inactive: number; recentlyAdded: number; female: number; male: number };
  byClass: { className: string; count: number }[];
  recent: Student[];
};

export default function DashboardPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setError(""); setLoading(true);
    try { setData(await apiRequest<StatsResponse>("/api/dashboard/stats", { cache: "no-store" })); }
    catch (caught) { setError(fieldMessage(caught)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const stats = data?.stats;
  const cards = [
    { label: "Total students", value: stats?.total ?? 0, icon: Users, tone: "sage", foot: "In your workspace" },
    { label: "Active students", value: stats?.active ?? 0, icon: UserCheck, tone: "", foot: "Currently enrolled" },
    { label: "Inactive students", value: stats?.inactive ?? 0, icon: UserMinus, tone: "apricot", foot: "Not currently active" },
    { label: "Added recently", value: stats?.recentlyAdded ?? 0, icon: UserPlus, tone: "blue", foot: "In the last 30 days" },
    { label: "Female students", value: stats?.female ?? 0, icon: Venus, tone: "apricot", foot: "Self-reported gender" },
    { label: "Male students", value: stats?.male ?? 0, icon: Mars, tone: "blue", foot: "Self-reported gender" },
  ];
  return <AppShell title="Overview" description="A clear view of the students in your private workspace." action={<Link className="button button-primary" href="/students/new"><Plus size={16} />Add student</Link>}>
    <section className="dashboard-hero"><div className="dashboard-hero-copy"><p className="eyebrow">YOUR WORKSPACE, AT A GLANCE</p><h2>Every student, thoughtfully organized.</h2><p>Keep your records easy to find and your workspace tailored to the way you work.</p></div><div className="hero-actions"><Link className="button button-secondary" href="/students">Browse directory<ArrowRight size={15} /></Link></div></section>
    {error && <div className="dashboard-error"><Notice>{error}</Notice><button className="button button-secondary" onClick={() => void load()}>Try again</button></div>}
    {loading && !data ? <LoadingState label="Loading your student statistics…" /> : <>
      <section className="stats-grid" aria-label="Student summary statistics">{cards.map(({ label, value, icon: Icon, tone, foot }) => <article className="stat-card" key={label}><span className={`stat-icon ${tone}`}><Icon size={19} aria-hidden="true" /></span><div className="stat-copy"><strong className="stat-value">{value}</strong><span className="stat-label">{label}</span><span className="stat-trend">{foot}</span></div></article>)}</section>
      <div className="dashboard-columns"><Panel><div className="panel-heading"><div><h2>Students by class</h2><p>How your records are distributed</p></div><Link className="panel-link" href="/students">Directory <ArrowUpRight size={14} /></Link></div>{data?.byClass.length ? <div className="class-bars">{data.byClass.map((item) => { const max = Math.max(...data.byClass.map((entry) => entry.count), 1); return <div key={item.className}><div className="class-bar-label"><strong>{item.className}</strong><span>{item.count} {item.count === 1 ? "student" : "students"}</span></div><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max((item.count / max) * 100, 4)}%` }} /></div></div>; })}</div> : <EmptyState icon={Users} title="No class data yet" description="Add students to see your class distribution here." action={<Link className="panel-link" href="/students/new">Add your first student <ArrowRight size={14} /></Link>} />}</Panel>
        <Panel><div className="panel-heading"><div><h2>Recently added</h2><p>Your latest student profiles</p></div><Link className="panel-link" href="/students">View all <ArrowUpRight size={14} /></Link></div>{data?.recent.length ? <div className="recent-list">{data.recent.map((student) => <StudentMini student={student} key={student.id} />)}</div> : <EmptyState icon={UserPlus} title="A fresh start" description="Your workspace is ready. Add your first student to begin building your directory." action={<Link className="button button-primary" href="/students/new"><Plus size={15} />Add student</Link>} />}</Panel></div>
      {data && data.stats.total === 0 && <div className="dashboard-empty-note"><span>Your dashboard statistics update automatically as you add student records.</span><Link href="/students/new">Create your first profile <ArrowRight size={14} /></Link></div>}
    </>}
  </AppShell>;
}
