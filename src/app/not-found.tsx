import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";

export default function NotFound() {
  return <main className="not-found-page"><div className="not-found-card"><div className="brand-mark"><GraduationCap size={24} /></div><p className="eyebrow">404 · PAGE NOT FOUND</p><h1>This page isn’t in your workspace.</h1><p>It may have moved, or the link may be out of date. Your student data remains private and unchanged.</p><Link className="button button-primary" href="/dashboard"><ArrowLeft size={17} />Back to overview</Link></div></main>;
}
