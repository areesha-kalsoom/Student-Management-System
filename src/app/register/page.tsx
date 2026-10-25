"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Check, GraduationCap, LockKeyhole } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Notice } from "@/components/ui";
import { apiRequest, fieldMessage } from "@/lib/client/api";
import type { User } from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const { user, ready, setUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (ready && user) router.replace("/dashboard"); }, [ready, user, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 12) { setError("Choose a password with at least 12 characters."); return; }
    if (!accepted) { setError("Please accept the terms and privacy information to continue."); return; }
    setBusy(true);
    try {
      const result = await apiRequest<{ user: User }>("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password, termsAccepted: accepted }) });
      setUser(result.user); router.replace("/dashboard");
    } catch (caught) { setError(fieldMessage(caught)); }
    finally { setBusy(false); }
  }
  return <main className="auth-layout"><section className="auth-story"><Link href="/" className="brand"><span className="brand-mark"><GraduationCap size={22} /></span><span className="brand-copy"><strong>Forma</strong><small>STUDENT RECORDS</small></span></Link><div className="auth-story-body"><p className="eyebrow">A WORKSPACE OF YOUR OWN</p><h1>Start with a clean slate. Grow at your pace.</h1><p>Create your account and shape a student workspace around your own records, classes, and custom fields.</p><div className="auth-feature-list"><div className="auth-feature"><Check size={16} />A private workspace for your records</div><div className="auth-feature"><Check size={16} />Your own custom student fields</div><div className="auth-feature"><Check size={16} />No shared data between accounts</div></div></div><div className="auth-story-foot"><span>Forma · Student management</span><span>Private by default</span></div></section><section className="auth-panel"><div className="auth-form-wrap"><Link href="/" className="brand auth-mobile-brand"><span className="brand-mark"><GraduationCap size={22} /></span><span className="brand-copy"><strong>Forma</strong><small>STUDENT RECORDS</small></span></Link><p className="eyebrow">CREATE YOUR WORKSPACE</p><h2>Make Forma yours</h2><p className="auth-form-intro">One account, one private student workspace.</p>{error && <div className="form-error-gap"><Notice>{error}</Notice></div>}<form className="auth-form" onSubmit={submit}><label className="input-wrap"><span className="input-label">Full name</span><input className="text-input" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required minLength={2} maxLength={120} /></label><label className="input-wrap"><span className="input-label">Email address</span><input className="text-input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required maxLength={254} /></label><label className="input-wrap"><span className="input-label">Password</span><input className="text-input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 12 characters" required minLength={12} maxLength={128} /></label><label className="input-wrap"><span className="input-label">Confirm password</span><input className="text-input" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Type your password again" required minLength={12} maxLength={128} /></label><p className="auth-password-hint">Use 12 or more characters for a stronger password.</p><label className="form-check"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required /><span>I agree to the <Link href="/terms" target="_blank">terms</Link> and have read the <Link href="/privacy" target="_blank">privacy information</Link>.</span></label><button className="button button-primary auth-submit" disabled={busy}>{busy ? "Creating workspace…" : "Create account"}</button></form><p className="auth-footnote">Already have a workspace? <Link href="/login">Sign in</Link></p><div className="auth-privacy"><LockKeyhole size={16} />We only store the account and student details you choose to add.</div></div></section></main>;
}
