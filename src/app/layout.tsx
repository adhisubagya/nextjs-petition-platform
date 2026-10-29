import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <Providers>{children}</Providers>
        <footer className="mx-auto max-w-2xl border-t border-neutral-200 px-4 py-6 text-center text-sm text-neutral-500">
          © 2026 DAWN. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
