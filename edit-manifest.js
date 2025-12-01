import {
    copyFile,
    readFile,
    realpath,
    unlink,
    writeFile,
} from 'node:fs/promises';

import path from 'node:path';
import detectIndent from 'detect-indent';

const MANIFEST_FILE = './dist/manifest.json';

const args = process.argv.slice(2);
if (args.length < 1 || (args[0] !== 'firefox' && args[0] !== 'chromium')) {
    console.error('Please provide a browser type: "firefox" or "chromium"');
    process.exit(1);
}
const browserType = args[0];

const manifestPath = path.resolve(await realpath(MANIFEST_FILE));

const manifestContent = await readFile(manifestPath, 'utf-8');

const indent = detectIndent(manifestContent).indent || 2;
const manifest = JSON.parse(manifestContent);

if (browserType === 'firefox') {
    // add browser_specific_settings
    manifest.browser_specific_settings = {
        gecko: {
            id: 'youtube-volume-scroll@github.com',
            data_collection_permissions: {
                required: ['none'],
            },
        },
    };
    // add background script
    manifest.background = {
        scripts: ['background-script.js'],
    };
    await copyFile(
        './unpacked/background-script.js',
        './dist/background-script.js',
    );
} else if (browserType === 'chromium') {
    delete manifest.browser_specific_settings;
    delete manifest.background;
    await unlink('./dist/background-script.js');
}

await writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, indent), 'utf-8');
console.log(`Manifest updated for ${browserType} successfully.`);
