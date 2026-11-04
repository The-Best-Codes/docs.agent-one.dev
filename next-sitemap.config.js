const { getSiteUrl } = require("./lib/site-url.ts");

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: getSiteUrl(),
  generateRobotsTxt: true,
  exclude: ["/llms.txt", "/llms-full.txt", "/llms.mdx/*", "/og/*", "/api/*"],
};
