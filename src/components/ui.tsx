import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, type LucideIcon } from "lucide-react";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-title-row"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="page-title">{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <div className="page-title-action">{action}</div>}</div>;
}

export function Button({ children, variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger" }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function Notice({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" | "info" }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return <div className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}><Icon size={17} aria-hidden="true" /><span>{children}</span></div>;
}

export function LoadingState({ label = "Loading your workspace…" }: { label?: string }) {
  return <div className="loading-state"><LoaderCircle className="spin" size={22} aria-hidden="true" /><span>{label}</span></div>;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={24} aria-hidden="true" /></div><h3>{title}</h3><p>{description}</p>{action && <div className="empty-action">{action}</div>}</div>;
}
