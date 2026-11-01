// Cloudflare's always-pass test key when unset; production must set a real site key.
export const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";
