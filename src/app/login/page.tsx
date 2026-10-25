"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Check, GraduationCap, LockKeyhole } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Notice } from "@/components/ui";
import { apiRequest, fieldMessage } from "@/lib/client/api";
import type { User } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (ready && user) router.replace("/dashboard"); }, [ready, user, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const result = await apiRequest<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setUser(result.user); router.replace("/dashboard");
    } catch (caught) { setError(fieldMessage(caught)); }
    finally { setBusy(false); }
  }
  return <main className="auth-layout"><section className="auth-story"><Link href="/" className="brand"><span className="brand-mark"><GraduationCap size={22} /></span><span className="brand-copy"><strong>Forma</strong><small>STUDENT RECORDS</small></span></Link><div className="auth-story-body"><p className="eyebrow">YOUR STUDENTS. YOUR SPACE.</p><h1>A little more clarity for every learner.</h1><p>Pick up where you left off. Your student records are waiting safely in your private workspace.</p><div className="auth-feature-list"><div className="auth-feature"><Check size={16} />Student profiles, all in one place</div><div className="auth-feature"><Check size={16} />Custom fields that fit your workflow</div><div className="auth-feature"><Check size={16} />Private data, scoped to your account</div></div></div><div className="auth-story-foot"><span>Forma · Student management</span><span>Private by default</span></div></section><section className="auth-panel"><div className="auth-form-wrap"><Link href="/" className="brand auth-mobile-brand"><span className="brand-mark"><GraduationCap size={22} /></span><span className="brand-copy"><strong>Forma</strong><small>STUDENT RECORDS</small></span></Link><p className="eyebrow">WELCOME BACK</p><h2>Sign in to Forma</h2><p className="auth-form-intro">Your workspace is just a few details away.</p>{error && <div className="form-error-gap"><Notice>{error}</Notice></div>}<form className="auth-form" onSubmit={submit}><label className="input-wrap"><span className="input-label">Email address</span><input className="text-input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required maxLength={254} /></label><label className="input-wrap"><span className="input-label">Password</span><input className="text-input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required maxLength={128} /></label><button className="button button-primary auth-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form><p className="auth-footnote">New to Forma? <Link href="/register">Create an account</Link></p><div className="auth-privacy"><LockKeyhole size={16} />Your account is private. Student records are only available to you.</div></div></section></main>;
}
