import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppToaster } from "../components/AppToaster";
import { AuthProvider } from "../components/AuthProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "POS",
    template: "%s · POS",
  },
  description: "Till, HQ, and price check for supermarket, hotel, and restaurant POS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <AppToaster />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
