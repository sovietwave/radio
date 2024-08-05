# SWR capacitor application wrapper

Soviet Wave Radio application

## Setup

Be sure your current path location is `./cap/` directory.

Install dependencies first:

```shell
npm i
```

## Build app first

Build web app mobile variant from primary project to be wrapper into the final mobile apps

```shell
# go to app/ folder from the root
cd app
npm i
npm run build
# this will provide all app content in `app/dist` folder, which will be included in all mobile apps
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