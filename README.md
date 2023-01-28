[link-chrome]: https://chrome.google.com/webstore/detail/youtube-volume-scroll/agadcopafaojndinhloilcanpfpbonbk "Version published on Chrome Web Store"

[link-firefox]: https://addons.mozilla.org/en-US/firefox/addon/youtube-volume-scroll "Version published on Mozilla Add-ons"

[link-edge]: https://microsoftedge.microsoft.com/addons/detail/kigkklogdpgeomdollklnlfgglnkgenb "Version published on Edge Add-ons"

[link-releases]: https://github.com/Araxeus/Youtube-Volume-Scroll/releases/latest "Latest release"

<h1 <img width="45" align="left" src="https://github.com/Araxeus/Youtube-Volume-Scroll/raw/main/unpacked/icons/icon32x32.png" /> Youtube Volume Scroll </h1>

[<img src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" alt="for Firefox" height="60px">][link-firefox] [<img src="https://user-images.githubusercontent.com/78568641/212470539-dd4d22a0-3af8-4fa7-9671-6df5b2e26a70.png" alt="for Firefox" height="60px">][link-edge] [<img src="https://storage.googleapis.com/chrome-gcs-uploader.appspot.com/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/HRs9MPufa1J1h5glNhut.png" alt="for Chrome" height="60px">][link-chrome]

> Browser Extension that enable scrolling mousewheel to control volume  on Youtube and Youtube Music

<p>
  <a href="https://github.com/Araxeus/Youtube-Volume-Scroll/releases" target="_blank">
    <img alt="Version" src="https://img.shields.io/github/release/Araxeus/Youtube-Volume-Scroll.svg" onerror='this.onerror=undefined; this.src="https://img.shields.io/badge/version-1.4.0-blue.svg?cacheSeconds=2592000"'/>
  </a>
  <a href="https://github.com/Araxeus/Youtube-Volume-Scroll/blob/main/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/github/license/Araxeus/Youtube-Volume-Scroll?color=yellow" />
  </a>
   <a href="https://github.com/Araxeus/Youtube-Volume-Scroll" target="_blank">
    <img alt="Maintenance" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" />
  </a>
</p>

## Features

★ Use mousewheel on the video to change the volume

★ Display the new volume for 1 second on the video when changing volume

★ Remember volume even in incognito mode

★ Works on [youtube.com](youtube.com) and [music.youtube.com](music.youtube.com)

★ Works in embedded videos

★ Clicking the extension [icon](https://user-images.githubusercontent.com/78568641/152661730-3b6be926-a163-47d8-a337-ddd929183317.png) allows Changing the volume scroll 'steps'

★ Automatically blocks the ["Continue watching?" popup](https://user-images.githubusercontent.com/61631665/129977894-01c60740-7ec6-4bf0-9a2c-25da24491b0e.png) that appears after some time

## Installation

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/chrome/chrome.svg" width="48" alt="Chrome" valign="middle">][link-chrome] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/agadcopafaojndinhloilcanpfpbonbk.svg?label=%20">][link-chrome] Chrome and other Chromium browsers

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/edge/edge.svg" width="48" alt="Chrome" valign="middle">][link-edge] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/agadcopafaojndinhloilcanpfpbonbk.svg?label=%20">][link-edge] Microsoft Edge

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/firefox/firefox.svg" width="48" alt="Firefox" valign="middle">][link-firefox] [<img valign="middle" src="https://img.shields.io/amo/v/youtube-volume-scroll.svg?label=%20">][link-firefox] Manifest V3 only

[<img src="https://www.iconsdb.com/icons/preview/white/github-11-xxl.png" width="48" alt="Firefox" valign="middle">][link-releases] [<img valign="middle" src="https://img.shields.io/github/release/Araxeus/Youtube-Volume-Scroll.svg?label=%20">][link-releases] Signed <kbd>.xpi</kbd> files

## Build it yourself

Requires [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/)

```sh
# Clone the repo and cd to it
git clone https://github.com/Araxeus/Youtube-Volume-Scroll.git

cd Youtube-Volume-Scroll

# Install build dependencies
npm install

# Build the extension
$ npm run build
```

The resulting unsigned xpi/zip file will be in the `web-ext-artifacts` folder.

## Known Issues

*   To work in incognito, permission needs to be explicitly set in the [extension settings](https://user-images.githubusercontent.com/78568641/155850125-4b98e01c-f55d-4747-89c5-25ecd792f025.png)

*   If you experience embedded videos in incognito mode not saving volume:<br />
    disable `Block third-party cookies in incognito` ([1](https://i.stack.imgur.com/mEidB.png)/[2](https://user-images.githubusercontent.com/78568641/155897465-08876dc9-48c2-4f7a-a95a-e39522e99f03.png))

## Author

👤 **Araxeus**

*   Github: [@Araxeus](https://github.com/Araxeus)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/Araxeus/Youtube-Volume-Scroll/issues).

## Show your support

Give a ⭐️ if this project helped you!
