import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Remote PH — Freelance & VA Opportunities for Filipinos",
  description:
    "Self-updating directory of remote job opportunities and VA-friendly companies that hire Filipinos. Updated every 2 hours automatically.",
  openGraph: {
    title: "Remote PH",
    description: "Freelance & VA opportunities for Filipino remote workers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-zinc-100 flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
