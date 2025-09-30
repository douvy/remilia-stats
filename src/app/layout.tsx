import type { Metadata } from "next";
import "./globals.css";
import "@awesome.me/kit-7effd19d5a/icons/css/all.css";

export const metadata: Metadata = {
  title: "Remilia Stats",
  description: "Track performance and compete with other users",
  icons: {
    icon: '/favicon.ico',
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
      </body>
    </html>
  );
}
