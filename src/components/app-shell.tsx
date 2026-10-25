"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, ArrowUpRight, Database, GraduationCap, LayoutDashboard, LogOut, Menu, Settings2, Users, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { initials } from "@/lib/client/format";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/fields", label: "Custom fields", icon: Settings2 },
  { href: "/data", label: "Import & export", icon: Database },
  { href: "/settings", label: "Account settings", icon: Activity },
];

export function AppShell({ children, title, description, action }: { children: ReactNode; title?: string; description?: string; action?: ReactNode }) {
  const { user, ready, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [currentName, setCurrentName] = useState(user?.name ?? "");

  useEffect(() => { setCurrentName(user?.name ?? ""); }, [user?.name]);
  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
  }, [ready, user, router, pathname]);

  async function logout() {
    setSigningOut(true);
    try { await signOut(); } finally { router.replace("/login"); }
  }

  if (!ready || !user) return <div className="auth-loading"><div className="brand-mark"><GraduationCap size={22} /></div><span>Opening your private workspace…</span></div>;
  const displayName = currentName || user.name;
  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
  const links = <>{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`nav-link ${isActive(href) ? "nav-link-active" : ""}`}><Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>{href === "/students" && <ArrowUpRight className="nav-hint" size={14} aria-hidden="true" />}</Link>)}</>;

  return <div className="app-frame">
    <aside className="sidebar">
      <Link className="brand" href="/dashboard"><span className="brand-mark"><GraduationCap size={22} strokeWidth={2.1} /></span><span className="brand-copy"><strong>Forma</strong><small>STUDENT RECORDS</small></span></Link>
      <div className="workspace-tag"><span className="workspace-dot" /> PRIVATE WORKSPACE</div>
      <p className="nav-section-label">WORKSPACE</p>
      <nav className="main-nav" aria-label="Main navigation">{links}</nav>
      <div className="sidebar-spacer" />
      <div className="privacy-card"><div className="privacy-icon"><Activity size={16} /></div><strong>Your data stays yours</strong><p>Only you can access records in this workspace.</p></div>
      <div className="sidebar-user"><span className="avatar avatar-small">{initials(displayName)}</span><div className="sidebar-user-copy"><strong>{displayName}</strong><span>{user.email}</span></div><button className="icon-button logout-icon" onClick={logout} title="Sign out" aria-label="Sign out" disabled={signingOut}><LogOut size={17} /></button></div>
    </aside>
    <div className="mobile-header"><Link className="brand" href="/dashboard"><span className="brand-mark"><GraduationCap size={20} /></span><span className="brand-copy"><strong>Forma</strong><small>STUDENT RECORDS</small></span></Link><button className="icon-button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
    {menuOpen && <div className="mobile-menu"><nav aria-label="Mobile navigation">{links}</nav><button className="nav-link mobile-logout" onClick={logout}><LogOut size={18} />Sign out</button></div>}
    <main className="main-area"><div className="content-wrap">{title && <div className="page-title-row shell-title"><div><h1 className="page-title">{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <div className="page-title-action">{action}</div>}</div>}{children}</div><footer className="app-footer"><span>Forma · Student workspace</span><span>Private by default <span className="footer-dot">●</span></span></footer></main>
  </div>;
}
