import { RootProvider } from "fumadocs-ui/provider/next";
import { Banner } from "fumadocs-ui/components/banner";
import { Inter } from "next/font/google";
import "./global.css";
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
});

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Banner>
          These docs are under construction. AgentOne is currently available as
          a private beta.
          <Link
            className="text-fd-info ml-1"
            href="https://go.bestcodes.dev/discord"
          >
            Join the Discord
          </Link>
        </Banner>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
