const params = new URLSearchParams(location.search);
const mode = params.get('mode') || "night";
globalThis.SITE_MODE = mode;

globalThis.localStorageAvailable = globalThis.isLSAvailable();