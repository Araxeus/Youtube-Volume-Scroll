import { copyFile, unlink, writeFile } from 'node:fs/promises';
import { FIREFOX_EXTENSION_ID, getFile, paths } from './provider.js';

if (import.meta.main) {
    const args = process.argv.slice(2);
    if (args.length < 1 || (args[0] !== 'firefox' && args[0] !== 'chromium')) {
        console.error('Please provide a browser type: "firefox" or "chromium"');
        process.exit(1);
    }
    const browserType = args[0];

    if (browserType === 'firefox') await makeFirefoxManifest();
    else if (browserType === 'chromium') await makeChromiumManifest();

    console.log(`Manifest updated for ${browserType} successfully.`);
}

async function getManifest() {
    const manifest = await getFile(paths.DIST_MANIFEST);
    return {
        data: manifest.data,
        save: async () => {
            await writeFile(
                paths.DIST_MANIFEST,
                JSON.stringify(manifest.data, null, manifest.indent),
                'utf-8',
            );
        },
    };
}

export async function makeFirefoxManifest() {
    const manifest = await getManifest();
    manifest.data.browser_specific_settings = {
        gecko: {
            id: FIREFOX_EXTENSION_ID,
            data_collection_permissions: {
                required: ['none'],
            },
        },
    };

    manifest.data.background = {
        scripts: ['background-script.js'],
    };
    await copyFile(paths.UNPACKED_BG_SCRIPT, paths.DIST_BG_SCRIPT);
    await manifest.save();
}

export async function makeChromiumManifest() {
    const manifest = await getManifest();
    delete manifest.data.browser_specific_settings;
    delete manifest.data.background;
    await unlink(paths.DIST_BG_SCRIPT).catch();
    await manifest.save();
}
