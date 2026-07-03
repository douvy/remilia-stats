// The remilia API returns pfpUrl as either an absolute URL
// (https://pfp.remilia.net/...) or a relative /imgproxy/... path.
// Relative paths must be prefixed or they resolve against our domain and 404.
export function normalizePfpUrl(url: string | null | undefined): string {
  if (!url) return '';
  return url.startsWith('/') ? `https://www.remilia.net${url}` : url;
}
