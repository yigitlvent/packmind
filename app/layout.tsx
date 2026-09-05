import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthRoutes } from "@/components/AuthRoutes";
import { MigrationNotice } from "@/components/MigrationNotice";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PackMind — Never realize what you forgot after it’s too late.",
  description:
    "A pre-departure mistake catcher for travelers. Build a packing list, then catch the gaps before you leave.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-US"
      className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-sand text-ink">
        <AuthProvider>
          <SiteHeader />
          <MigrationNotice />
          <AuthRoutes>{children}</AuthRoutes>
        </AuthProvider>
      </body>
    </html>
  );
}
