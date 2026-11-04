// Also loaded by next-sitemap.config.js through Node's native type stripping,
// so keep this file to erasable TypeScript syntax only (no enums, namespaces,
// or parameter properties) and avoid path aliases.

const FALLBACK_URL = "https://docs.agent-one.dev";

/** Turns "example.com" or "https://example.com/" into "https://example.com". */
function normalize(value: string | undefined): string | undefined {
  // Coolify can list several comma-separated domains; use the first one.
  const first = value?.split(",")[0]?.trim();
  if (!first) return undefined;
  const withScheme = /^https?:\/\//.test(first) ? first : `https://${first}`;
  return withScheme.replace(/\/+$/, "");
}

/**
 * The public URL of the site, in priority order:
 * 1. NEXT_PUBLIC_APP_URL (set this explicitly to override everything)
 * 2. Vercel: the production domain in production, else the deployment URL
 * 3. Coolify: COOLIFY_URL, then COOLIFY_FQDN
 * 4. https://docs.agent-one.dev
 */
export function getSiteUrl(): string {
  const env = process.env;
  const candidates = [
    env.NEXT_PUBLIC_APP_URL,
    env.VERCEL_ENV === "production"
      ? env.VERCEL_PROJECT_PRODUCTION_URL
      : undefined,
    env.VERCEL_BRANCH_URL,
    env.VERCEL_URL,
    env.COOLIFY_URL,
    env.COOLIFY_FQDN,
  ];

  for (const candidate of candidates) {
    const url = normalize(candidate);
    if (url) return url;
  }
  return FALLBACK_URL;
}
