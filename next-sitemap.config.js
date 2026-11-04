/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || "https://docs.agent-one.dev",
  generateRobotsTxt: true,
  exclude: ["/llms.txt", "/llms-full.txt", "/llms.mdx/*", "/og/*", "/api/*"],
};
