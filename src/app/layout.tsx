import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forma — Student Management",
  description: "A secure, private workspace to organize student records, custom fields, and enrollment data.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
