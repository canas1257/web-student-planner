export function buildEmailRedirectUrl(currentUrl, baseUrl) {
  return new URL(baseUrl, currentUrl).href
}
