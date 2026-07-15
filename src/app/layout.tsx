import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider, themeScript } from "@/components/theme/theme-provider";
import { sidebarScript } from "@/components/shell/sidebar-context";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Prinodia CyberLab",
    template: "%s · Prinodia CyberLab",
  },
  description:
    "A professional cybersecurity learning workspace for notes, code, diagrams, labs, and reports.",
  applicationName: "Prinodia CyberLab",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${plexSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: sidebarScript }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
