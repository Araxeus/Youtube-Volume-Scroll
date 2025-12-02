The version files in this folder can be used for automatic updates in Chromium-based and Firefox browsers.

### [chromium instructions](https://developer.chrome.com/docs/extensions/how-to/distribute/host-on-linux#update_url)

```json
"update_url": "https://raw.githubusercontent.com/Araxeus/Youtube-Volume-Scroll/refs/heads/main/versions/chromium_version.xml"
```

### [firefox instructions](https://extensionworkshop.com/documentation/manage/updating-your-extension)

```json
"browser_specific_settings": {
  "gecko": {
    "update_url": "https://raw.githubusercontent.com/Araxeus/Youtube-Volume-Scroll/refs/heads/main/versions/firefox_versions.json"
  }
}
```

The version files are automatically updated on every new release via the [`scripts/bumper.js`](../scripts/bumper.js) script.

The `update_url` fields in the extension manifests are currently not included by default because the extensions are distributed via the Chrome Web Store and Firefox Add-ons Marketplace, which handle updates automatically.

Please remember to include these fields if you plan to distribute the extensions outside of these stores.
