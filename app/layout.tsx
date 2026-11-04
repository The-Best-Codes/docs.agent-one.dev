import { RootProvider } from "fumadocs-ui/provider/next";
import { Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import "./global.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
      <GoogleAnalytics gaId="G-Z7HCYBLX8N" />
    </html>
  );
}
