# radio wrapper investigation

Application wrapper for [Soviet Wave Radio](sovietwave.su) site ([source-code](https://github.com/sovietwave))

- `cap` for Capacitor approach
- `tau` for Tauri approach (v2 beta)


## CSP

```typescript
const hosts = [
    "https://sovietwave.su/",
    "https://static.nay.su/",
    "https://mc.yandex.com/",
    "https://mc.yandex.ru/",
    "https://station.waveradio.org/",
    "https://core.waveradio.org/",
];
const srcHosts = hosts.join(" ");
callback({
    responseHeaders: {
    ...details.responseHeaders,
    'Content-Security-Policy': [
        electronIsDev
        ? `default-src ${srcHosts} ${customScheme}://* 'unsafe-inline' devtools://* 'unsafe-eval' data:`
        : `default-src ${srcHosts} ${customScheme}://* 'unsafe-inline' data:`,
    ],
    },
});
```