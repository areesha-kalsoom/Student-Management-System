"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, KeyRound, LogOut, Mail, ShieldCheck, UserRound, UserX } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button, Notice, Panel } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { apiRequest, fieldMessage } from "@/lib/client/api";

export default function SettingsPage() {
  const { user, refreshUser, setUser, signOut } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice(""); setSavingProfile(true);
    try { await apiRequest("/api/account", { method: "PATCH", body: JSON.stringify({ name }) }); await refreshUser(); setNotice("Your profile was updated."); }
    catch (caught) { setError(fieldMessage(caught)); }
    finally { setSavingProfile(false); }
  }
  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (newPassword !== confirmPassword) { setError("Your new passwords do not match."); return; }
    if (newPassword.length < 12) { setError("Choose a password with at least 12 characters."); return; }
    setSavingPassword(true);
    try { await apiRequest("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setNotice("Password updated. Other sessions have been signed out."); }
    catch (caught) { setError(fieldMessage(caught)); }
    finally { setSavingPassword(false); }
  }
  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (deleteConfirmation !== "DELETE") { setError("Type DELETE exactly to confirm account removal."); return; }
    if (!window.confirm("Permanently delete your account and all of its student records, custom fields, and sessions? This cannot be undone.")) return;
    setDeleting(true);
    try { await apiRequest("/api/account", { method: "DELETE", body: JSON.stringify({ password: deletePassword, confirmation: deleteConfirmation }) }); setUser(null); router.replace("/"); }
    catch (caught) { setError(fieldMessage(caught)); setDeleting(false); }
  }
  async function logout() { try { await signOut(); } finally { router.replace("/login"); } }
  return <AppShell title="Account settings" description="Manage your profile and protect access to your workspace.">
    {error && <div className="notice-space"><Notice>{error}</Notice></div>}{notice && <div className="notice-space"><Notice tone="success">{notice}</Notice></div>}
    <div className="settings-grid"><div className="settings-stack"><Panel><div className="panel-heading"><div><h2><UserRound size={16} /> Profile information</h2><p>Update the name shown around your workspace.</p></div></div><form className="settings-form" onSubmit={saveProfile}><label className="input-wrap"><span className="input-label">Full name</span><input className="text-input" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={120} minLength={2} required /></label><label className="input-wrap"><span className="input-label">Email address</span><div className="read-only-value"><Mail size={15} />{user?.email ?? ""}<span className="read-only-tag">Sign-in email</span></div></label><div className="form-actions"><Button type="submit" disabled={savingProfile}>{savingProfile ? "Saving…" : "Save profile"}</Button></div></form></Panel>
      <Panel><div className="panel-heading"><div><h2><KeyRound size={16} /> Change password</h2><p>Changing your password signs out other sessions.</p></div></div><form className="settings-form" onSubmit={updatePassword}><label className="input-wrap"><span className="input-label">Current password</span><input className="text-input" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required maxLength={128} /></label><label className="input-wrap"><span className="input-label">New password</span><input className="text-input" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={12} maxLength={128} /></label><label className="input-wrap"><span className="input-label">Confirm new password</span><input className="text-input" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={12} maxLength={128} /></label><p className="field-help">Use at least 12 characters. Password recovery by email is not configured for this local project.</p><div className="form-actions"><Button type="submit" disabled={savingPassword}>{savingPassword ? "Updating…" : "Update password"}</Button></div></form></Panel></div>
      <div className="settings-stack"><Panel><div className="panel-heading"><div><h2><ShieldCheck size={16} /> Privacy & security</h2><p>How this local workspace handles your information.</p></div></div><ul className="security-list"><li><ShieldCheck size={16} /><span><strong>Private data scope</strong><small>Students, custom fields, dashboard data, and exports are scoped to your account.</small></span></li><li><KeyRound size={16} /><span><strong>Secure sign-in</strong><small>Your password is hashed; the session cookie is HTTP-only and expires after seven days.</small></span></li><li><Mail size={16} /><span><strong>No configured email service</strong><small>Email verification and password reset are not advertised as active features.</small></span></li></ul><div className="settings-link-row"><span>Review the <a href="/privacy">privacy information</a>.</span></div></Panel><Panel><div className="panel-heading"><div><h2><LogOut size={16} /> Sign out</h2><p>End this browser session.</p></div></div><Button variant="secondary" onClick={() => void logout()}><LogOut size={15} />Sign out of Forma</Button></Panel><Panel className="danger-zone"><div className="panel-heading"><div><h2><UserX size={16} /> Delete account</h2><p>Permanent removal of your workspace and its data.</p></div></div><div className="danger-copy"><AlertTriangle size={15} /><span>Deleting your account also removes its student records, custom fields, and login sessions from the database. This action cannot be undone.</span></div><form className="settings-form" onSubmit={deleteAccount}><label className="input-wrap"><span className="input-label">Confirm your password</span><input className="text-input" type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} autoComplete="current-password" required maxLength={128} /></label><label className="input-wrap"><span className="input-label">Type DELETE to confirm</span><input className="text-input" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" required /></label><Button variant="danger" type="submit" disabled={deleting || deleteConfirmation !== "DELETE"}>{deleting ? "Deleting account…" : "Permanently delete account"}</Button></form></Panel></div></div>
  </AppShell>;
}
