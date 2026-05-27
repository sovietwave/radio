# Production feed deployment

Milestone 7 assumes the radio app is served by Nginx as a static Vite build.
The public feed index is updated on the server without rebuilding the app, while
feed media is served from a separate mirror.

## Paths

Use these production placeholders:

```text
SITE_ROOT=<absolute path to deployed Vite build>
FEED_MEDIA_ROOT=<absolute path to the mirrored Posts directory>
```

The feed export must write only the public index:

```bat
set "PUBLIC_FEED_OUT=%SITE_ROOT%\feed"
set "PUBLIC_FEED_MEDIA_BASE_URL=/feed/media"
cd /d F:\Dev\Sovietwave\sovietwave-studio\backend
npm run export:public-feed
```

The media mirror must preserve the URL structure from `index.json`:

```text
/feed/media/2026/post-folder/file.mp3
%FEED_MEDIA_ROOT%\2026\post-folder\file.mp3
```

The export script does not copy media and must not clean `FEED_MEDIA_ROOT`.
Old mp3 and image files should remain available after new feed exports.

## Deploy order

1. Build the app:

   ```bat
   cd /d F:\Dev\Sovietwave\sovietwave-radio\radio\app
   npm run build
   ```

2. Deploy `dist` to `SITE_ROOT`.
3. Export the public feed to `%SITE_ROOT%\feed`.
4. Sync or mount the media mirror at `FEED_MEDIA_ROOT`.
5. Reload Nginx after config changes:

   ```bash
   nginx -t && systemctl reload nginx
   ```

## Nginx behavior

Use `deploy/nginx-feed.conf.example` as the production template. The important
ordering is:

1. Serve `/feed/index.json` as a real JSON file.
2. Serve `/feed/media/*` from `FEED_MEDIA_ROOT`.
3. Serve real app files and Vite assets.
4. Fallback clean routes `/radio`, `/feed`, `/feed/page/*`, `/feed/*` to
   `/index.html`.

Do not fallback missing `/feed/media/*` to `index.html`; missing media must
return `404`.

## Cache policy

- `index.html`, service worker files and `/feed/index.json`: revalidate on every
  request or use a very short cache.
- Hashed Vite assets: `public, max-age=31536000, immutable`.
- `/feed/media/*`: long cache is acceptable when files are immutable. If files
  can be replaced without a URL change, use revalidation instead of `immutable`.
- `/feed/index.json` and `/feed/media/*` should not be added to the PWA
  precache.

## Production checks

```bash
curl -I https://example.com/feed/index.json
curl -I https://example.com/feed/media/2026/post-folder/file.mp3
curl -H "Range: bytes=0-15" -I https://example.com/feed/media/2026/post-folder/file.mp3
curl -I https://example.com/feed/media/missing.mp3
curl -I https://example.com/feed/2070
```

Expected results:

- `/feed/index.json` returns `200` and `application/json`.
- Existing mp3 returns `200` or `206` and `audio/mpeg`.
- Missing media returns `404`, not HTML.
- Direct clean feed routes return the app shell and render inside the SPA.
