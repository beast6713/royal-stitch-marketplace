import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Cormorant_Garamond, Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SiteHeader } from "@/components/site-header";
import { ToastCenter } from "@/components/toast-center";
import { MARKETPLACE_NAME } from "@/lib/constants";
import { isClerkConfigured } from "@/lib/env";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: MARKETPLACE_NAME,
  description:
    "Discover warm, handmade crochet and knitting pieces from independent artisans at Royal Stitch Market."
};

const clerkConfigured = isClerkConfigured();

function AppChrome({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="font-body">
        <div className="relative min-h-screen">
          <ToastCenter />
          <SiteHeader clerkConfigured={clerkConfigured} />
          {children}
          <MobileBottomNav />
        </div>
      </body>
    </html>
  );
}

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  if (!clerkConfigured) {
    return <AppChrome>{children}</AppChrome>;
  }

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#102542",
          colorBackground: "#fbf4ea",
          colorText: "#1f1c23",
          colorInputBackground: "#fffdf9",
          colorInputText: "#1f1c23",
          borderRadius: "1rem"
        }
      }}
    >
      <AppChrome>{children}</AppChrome>
    </ClerkProvider>
  );
}
