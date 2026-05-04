import { RootProvider } from "fumadocs-ui/provider/next";
import { Space_Grotesk } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./global.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
});

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={spaceGrotesk.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
      <GoogleAnalytics gaId="G-Z7HCYBLX8N" />
    </html>
  );
}
