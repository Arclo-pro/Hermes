/**
 * URL utility functions for the technical crawler.
 * Handles normalization, resolution, and internal URL detection.
 */

export function normalizeUrl(urlString: string, baseDomain: string): string | null {
  try {
    const url = new URL(urlString);

    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.hash = "";

    if ((url.protocol === "http:" && url.port === "80") ||
        (url.protocol === "https:" && url.port === "443")) {
      url.port = "";
    }

    // Sort query params, drop tracking params
    const params = new URLSearchParams(url.search);
    const sortedParams = new URLSearchParams();
    const keys = Array.from(params.keys()).sort();

    for (const key of keys) {
      if (key.startsWith("utm_") || key === "gclid" || key === "fbclid" || key === "ref") {
        continue;
      }
      sortedParams.set(key, params.get(key) || "");
    }

    url.search = sortedParams.toString();

    // Normalize trailing slash (remove except for root)
    let pathname = url.pathname;
    if (pathname !== "/" && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    url.pathname = pathname;

    return url.toString();
  } catch {
    return null;
  }
}

export function isInternalUrl(urlString: string, baseDomain: string): boolean {
  try {
    const url = new URL(urlString);
    const domain = url.hostname.toLowerCase();
    const baseLower = baseDomain.toLowerCase();

    return domain === baseLower ||
           domain === `www.${baseLower}` ||
           domain.endsWith(`.${baseLower}`);
  } catch {
    return false;
  }
}

export function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

export function getDomain(urlString: string): string | null {
  try {
    return new URL(urlString).hostname.toLowerCase();
  } catch {
    return null;
  }
}
