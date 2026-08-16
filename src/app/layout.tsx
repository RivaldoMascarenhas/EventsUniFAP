import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "UniFAP Sorteios — Sistema Institucional de Sorteios",
  description: "Plataforma oficial e institucional para gerenciamento e execução de sorteios em eventos do Centro Universitário Paraíso — UniFAP.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/branding/unifap-logo-square.svg", type: "image/svg+xml" },
      { url: "/branding/unifap-logo-square.png", type: "image/png" },
    ],
    shortcut: ["/favicon.png", "/branding/unifap-logo-square.png"],
    apple: [
      { url: "/branding/unifap-logo-square.png", sizes: "180x180", type: "image/png" },
    ],
  },
  authors: [{ name: "Centro Universitário Paraíso - UniFAP" }],
  keywords: ["UniFAP", "Sorteios", "Eventos", "Centro Universitário Paraíso", "Juazeiro do Norte", "Auditório"],
};

export const viewport: Viewport = {
  themeColor: "#002B49",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-unifap-gold selection:text-unifap-navy">
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
