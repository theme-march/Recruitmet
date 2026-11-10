import type { Metadata, Viewport } from "next";
import {
  DM_Sans,
  Inter,
  JetBrains_Mono,
  Manrope,
} from "next/font/google";
import "./globals.css";
import "./components.css";
import "./mobile-design-system.css";
import "./dashboard-design.css";
import "./country-design.css";
import "./agents-design.css";
import "./works-design.css";
import "./payment-design.css";
import "./management-design.css";
import "./pipeline-design.css";
import "./country-pipeline-design.css";
import "./directory-design.css";
import "./interview-design.css";
import "./candidate-create-design.css";
import "./modal-design.css";
import "./agent-detail-design.css";
import "./action-buttons.css";
import "./agent-portal-design.css";
import "./cv-design.css";
import "./passport-handover-design.css";
import "./mofa-design.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/layout/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "Orbit Overseas | Recruitment OS",
    template: "%s | Orbit Overseas",
  },
  description: "Recruitment and overseas employment management system",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${manrope.variable} ${jetBrainsMono.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className={dmSans.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-center" closeButton duration={4000} />
      </body>
    </html>
  );
}
