import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import detectIndent from 'detect-indent';

const PKG = resolve(import.meta.dir, '..');

export const paths = {
    PKG,
    PKG_JSON: resolve(PKG, 'package.json'),
    DIST: resolve(PKG, 'dist'),
    UNPACKED: resolve(PKG, 'unpacked'),
    DIST_MANIFEST: resolve(PKG, 'dist', 'manifest.json'),
    UNPACKED_MANIFEST: resolve(PKG, 'unpacked', 'manifest.json'),
    CHROMIUM_UPDATER: resolve(PKG, 'versions', 'chromium_version.xml'),
    FIREFOX_UPDATER: resolve(PKG, 'versions', 'firefox_versions.json'),
    UNPACKED_BG_SCRIPT: resolve(PKG, 'unpacked', 'background-script.js'),
    DIST_BG_SCRIPT: resolve(PKG, 'dist', 'background-script.js'),
};

export const firefoxExtensionID = 'youtube-volume-scroll@github.com';
export const chromiumExtensionID = 'agadcopafaojndinhloilcanpfpbonbk';

export async function getFile(path) {
    const raw = await readFile(path, 'utf-8');
    return {
        raw,
        data: JSON.parse(raw),
        indent: detectIndent(raw).indent || 2,
    };
}
