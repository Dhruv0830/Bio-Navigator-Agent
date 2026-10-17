import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bio-Pathway Navigator",
  description:
    "Multi-agent biomedical graph navigation platform powered by FalkorDB Cloud.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white flex h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
