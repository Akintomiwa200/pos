import type { Metadata } from "next";
import { AuthProvider } from "../components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS Console",
  description: "HQ back office for supermarket, hotel, and restaurant POS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
