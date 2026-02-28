import type { Metadata } from "next";
import "./globals.css";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { MobileBackButton } from "@/components/ui/MobileBackButton";
import { ThemeInitializer } from "@/components/ui/ThemeInitializer";

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
      <body className="antialiased pt-12 pb-20 lg:pt-0 lg:pb-0">
        <ThemeInitializer />
        <DashboardNav />
        <MobileBackButton />
        {children}
      </body>
    </html>
  );
}
