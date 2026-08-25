import type { Metadata } from "next";
import {
  DM_Sans,
  IBM_Plex_Sans,
  Inter,
  Manrope,
  Nunito,
  Outfit,
  Source_Sans_3,
  Space_Grotesk,
} from "next/font/google";
import { AppToaster } from "../components/AppToaster";
import { AuthProvider } from "../components/AuthProvider";
import { ScrollbarEnhancer } from "../components/ScrollbarEnhancer";
import { ThemeProvider } from "../components/ThemeProvider";
import { ThemeScript } from "../components/ThemeScript";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-sans",
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-ibm-plex",
});

const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
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
    <html
      lang="en"
      className={`${inter.variable} ${dmSans.variable} ${sourceSans.variable} ${ibmPlex.variable} ${nunito.variable} ${outfit.variable} ${manrope.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="bg-pos-bg font-sans text-pos-ink antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ScrollbarEnhancer />
            <AppToaster />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
