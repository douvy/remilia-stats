import type { Metadata } from "next";
import "./globals.css";
import "@awesome.me/kit-7effd19d5a/icons/css/all.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL('https://remiliastats.com'),
  title: "Remilia Stats",
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: "Remilia Stats",
    images: ['/assets/img/avatar.jpg'],
  },
  twitter: {
    card: 'summary',
    title: "Remilia Stats",
    images: ['/assets/img/avatar.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
