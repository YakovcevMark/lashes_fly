/** Reads one required server setting without disclosing its value in errors. */
export function requireSetting(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

/** Rejects fractions, negative values and numbers outside the supported range. */
export function integerSetting(name: string, defaultValue: number, max: number): number {
  const value = Number(process.env[name] ?? defaultValue);
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`Invalid environment variable: ${name}`);
  }
  return value;
}

/** Telegram redirects to the public panel root, including the GitHub Pages project path. */
export function adminUrl(): URL {
  const url = new URL(requireSetting('ADMIN_URL'));
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
    url.username ||
    url.password ||
    url.hash ||
    url.search
  ) {
    throw new Error('ADMIN_URL must be an HTTPS callback URL or a local development URL.');
  }
  return url;
}
