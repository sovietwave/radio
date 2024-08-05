# SWR capacitor application wrapper

Soviet Wave Radio application

## Setup

Be sure your current path location is `./cap/` directory.

Install dependencies first:

```shell
npm i
```

## Android

- Android Studio is required to be installed and configured (PATH, java, etc)

```bash
npx cap sync android
npx cap open android
```

## iOS

```bash
npx cap sync ios
npx cap open ios
```


## TODO
- [ ] Выводить в шторке информацию о проигрываемом треке и кнопку play/pause (по возможности отключить все остальные кнопки управления и ползунок перемотки)
- [ ] Поправить название приложения — "Sovietwave Radio" (сейчас устанавливается как Soviet Radio)