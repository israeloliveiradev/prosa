const HOSTS = new Set([
  "news.google.com",
  "feeds.bbci.co.uk",
  "www.tagesschau.de",
  "www.ansa.it",
  "www.nhk.or.jp",
  "www.theverge.com",
]);

export function isAllowedNewsUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return url.protocol === "https:" && !url.username && !url.password && HOSTS.has(url.hostname);
}

export function assertAllowedNewsUrl(raw: string): string {
  if (!isAllowedNewsUrl(raw)) {
    throw new Error("News feed host is not allowed");
  }
  return raw;
}
