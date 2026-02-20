import type { Metadata } from "next";
import "./globals.css";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export const metadata: Metadata = {
  title: "iljar",
  description: "Rekstrarkerfi fyrir íslenskar fótaaðgerðarstofur",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="is">
      <body className="antialiased pb-20 lg:pb-0">
        <DashboardNav />
        {children}
      </body>
    </html>
  );
}
