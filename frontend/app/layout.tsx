import type { Metadata } from "next";
import "./globals.css";
import GermCursor from "@/components/GermCursor";

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
      <body className="bg-black text-white antialiased selection:bg-white selection:text-black flex h-screen overflow-hidden">
        <GermCursor />
        {children}
      </body>
    </html>
  );
}
