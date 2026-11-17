import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Amiri } from "next/font/google";
import "./globals.css";
import { asset } from "@/lib/base";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400", "500", "600", "700", "800"] });
const amiri = Amiri({ subsets: ["arabic"], variable: "--font-amiri", weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Mutabaah Capaian Santri · Nurul Islam Tengaran",
  description: "Pencatatan tahsin, ziyadah, dan murajaah santri Pesantren Nurul Islam Tengaran.",
  applicationName: "Mutabaah",
  manifest: asset("/manifest.webmanifest"),
  icons: { icon: [{ url: asset("/icons/icon-192.png"), sizes: "192x192", type: "image/png" }], apple: [{ url: asset("/apple-touch-icon.png"), sizes: "180x180" }] },
  appleWebApp: { capable: true, title: "Mutabaah", statusBarStyle: "default" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#082E1A" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${jakarta.variable} ${amiri.variable}`}>
      <body>{children}</body>
    </html>
  );
}
