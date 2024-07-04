const params = new URLSearchParams(location.search);
const mode = params.get('mode') || "";
globalThis.SITE_MODE = mode;

globalThis.localStorageAvailable = globalThis.isLSAvailable();