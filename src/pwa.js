export function getAppScopeUrl(currentUrl, baseUrl) {
  return new URL(baseUrl, currentUrl).href
}

export function getServiceWorkerUrl(currentUrl, baseUrl) {
  return new URL('firebase-messaging-sw.js', getAppScopeUrl(currentUrl, baseUrl)).href
}

export function registerAppServiceWorker(serviceWorkerContainer, currentUrl, baseUrl) {
  if (!serviceWorkerContainer?.register) return Promise.resolve(null)
  const scope = getAppScopeUrl(currentUrl, baseUrl)
  return serviceWorkerContainer.register(getServiceWorkerUrl(currentUrl, baseUrl), { scope })
}

export function isAppStandalone(matchMedia = globalThis.matchMedia, navigatorLike = globalThis.navigator) {
  return Boolean(matchMedia?.('(display-mode: standalone)').matches || navigatorLike?.standalone)
}
