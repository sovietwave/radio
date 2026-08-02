# web application

```shell
# install
npm i

# dev-server
npm start

# build and preview `dist/` folder
npm run preview

# build `dist/` folder
npm run build

```

## TODO

- [ ] Настроить Progressive Web Application
- [ ] download all `fonts/stereonic` variants

## Radio fallback noise

`public/assets/sfx/radio-static.wav` is a temporary, procedurally generated
radio-noise loop. It contains no third-party recordings and can be replaced
without changing the application code.

Recommended replacement format: mono WAV, 8–30 seconds, without speech, music,
clipping, or a noticeable loop seam. For a third-party replacement, record the
source URL, author, download date, license, and any edits in this section.

Useful libraries:

- [Freesound](https://freesound.org/search/?q=radio+tuning) — filter results by
  CC0 and verify the license on the individual sound page.
- [OpenGameArt](https://opengameart.org/) — select Sound Effects and CC0.
- [Mixkit Radio SFX](https://mixkit.co/free-sound-effects/radio/) — free under
  the Mixkit license; not CC0.
- [Pixabay Radio Tuning](https://pixabay.com/sound-effects/search/radio-tuning/)
  — free under the Pixabay Content License; not CC0.

