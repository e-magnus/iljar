import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
