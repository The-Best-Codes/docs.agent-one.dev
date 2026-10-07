import { readFileSync } from "node:fs";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();
const legacyDocsRedirects = JSON.parse(
  readFileSync(new URL("./lib/docs-redirects.json", import.meta.url), "utf8"),
);

/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ["@takumi-rs/image-response"],
  reactStrictMode: true,
  async redirects() {
    return legacyDocsRedirects;
  },
  async rewrites() {
    return [
      {
        source: "/docs/:path*.mdx",
        destination: "/llms.mdx/docs/:path*",
      },
    ];
  },
};

export default withMDX(config);
