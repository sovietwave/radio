# Feed QA checklist

Use this checklist after feed, router, player, export or production config
changes. The goal is to catch regressions across the radio app, public feed,
static export and Nginx fallback.

## Builds

```powershell
cd f:\Dev\Sovietwave\sovietwave-studio\backend
npm run build

cd f:\Dev\Sovietwave\sovietwave-radio\radio\app
npm run build
```

## Export smoke

Run export into a temporary directory, not into the production app directory:

```powershell
$env:PUBLIC_FEED_OUT = "$env:TEMP\sovietwave-feed-export"
$env:PUBLIC_FEED_MEDIA_BASE_URL = "/feed/media"
cd f:\Dev\Sovietwave\sovietwave-studio\backend
npm run export:public-feed
```

Verify:

- `index.json` exists in `$env:PUBLIC_FEED_OUT`.
- No media directory is created by the exporter.
- JSON does not contain `D:\`, `F:\`, `absPath`, `folderPath`, `noteFile`.
- Every image and mp3 URL starts with `/feed/media/`.

## Local app routes

Start the app:

```powershell
cd f:\Dev\Sovietwave\sovietwave-radio\radio\app
npm start
```

Check:

- `/` opens the radio screen.
- `/radio` opens the same radio screen.
- `/feed` opens the first feed page.
- `/feed/page/2` opens directly and survives refresh.
- `/feed/:slug` opens directly and survives refresh.
- `/feed/page/0`, `/feed/page/test` and unknown paths show the in-app 404.
- Back and Forward switch between radio, feed list, post and 404 without a full
  reload.

## Feed interactions

Check:

- A click on a track row in `/feed` starts that mp3 and keeps the current feed
  URL.
- A click outside track rows opens `/feed/:slug`.
- When no radio or feed mp3 is playing, a click outside track rows starts the
  first mp3 from the opened post.
- When radio or a feed mp3 is playing, opening a post from `/feed` does not
  replace the current player.
- A click on a track row in `/feed/:slug` starts that exact track.
- The dot marker is visible only on the currently playing track.
- Paused, errored or selected-but-not-playing tracks do not show the dot marker.
- Rectangular covers remain rectangular; feed cover widths stay aligned.
- Missing images use the neutral placeholder and do not break layout.
- Posts without mp3 show the non-playable empty state and do not alter the
  current player.

## Audio

Check:

- Starting a feed mp3 stops the radio stream.
- Starting radio playback stops the feed mp3.
- Feed player play/pause, previous, next and seek work.
- Track end advances to the next track in the same post.
- The last track stops at the end.
- The shared volume slider affects both radio and feed mp3.
- Missing or bad mp3 URLs show a compact error and do not crash the app.

## Layout

Check these viewports:

- mobile narrow viewport;
- desktop `1920x1080`;
- wide desktop `2048x1152`.

Verify:

- Feed content does not go under the bottom player.
- Post detail cover fits the visible area without cropping.
- Track lists can stretch posts vertically without overlapping meta.
- City, tags and external links remain readable and aligned.
- The feed scrollbar remains usable.

## Production or staging

After applying `deploy/nginx-feed.conf.example`, run:

```bash
nginx -t
curl -I https://example.com/feed/index.json
curl -I https://example.com/feed/media/2026/post-folder/file.mp3
curl -H "Range: bytes=0-15" -I https://example.com/feed/media/2026/post-folder/file.mp3
curl -I https://example.com/feed/media/missing.mp3
curl -I https://example.com/feed/2070
```

Expected:

- `/feed/index.json` returns `200 application/json`, not HTML.
- Existing mp3 returns `200` or `206` with `audio/mpeg`.
- Missing media returns `404`, not the app shell.
- `/feed/:slug` returns the app shell and renders the post in the SPA.
- A new feed export updates `index.json` without rebuilding the Vite app.
