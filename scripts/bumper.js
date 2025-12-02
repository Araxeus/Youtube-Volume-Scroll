#!/usr/bin/env bun

import { writeFile } from 'node:fs/promises';
import { select } from '@inquirer/prompts';
import { $ } from 'bun';
import semver from 'semver';

import {
    chromiumExtensionID,
    firefoxExtensionID,
    getFile,
    paths,
} from './provider.js';

const packageJson = await getFile(paths.PKG_JSON);
const manifestJson = await getFile(paths.UNPACKED_MANIFEST);

if (packageJson.data.version !== manifestJson.data.version) {
    console.error(
        `Version mismatch: package.json (${packageJson.data.version}) vs manifest.json (${manifestJson.data.version})`,
    );
    process.exit(1);
}

// check that git working directory is clean
const gitStatus = await $`git status --porcelain`.text();
if (gitStatus !== '') {
    console.error(
        'Git working directory is not clean. Please commit changes before bumping version.',
    );
    process.exit(1);
}

const versions = {
    patch: semver.inc(packageJson.data.version, 'patch'),
    minor: semver.inc(packageJson.data.version, 'minor'),
    major: semver.inc(packageJson.data.version, 'major'),
};
const bumpType = await select({
    message: `current: ${packageJson.data.version} bump to:`,
    choices: [
        {
            name: `Patch - (${versions.patch})`,
            value: 'patch',
            description: 'x.y.Z',
        },
        {
            name: `Minor - (${versions.minor})`,
            value: 'minor',
            description: 'x.Y.z',
        },
        {
            name: `Major - (${versions.major})`,
            value: 'major',
            description: 'X.y.z',
        },
    ],
}).catch(() => process.exit(1));

const newVersion = versions[bumpType];
if (!newVersion) {
    console.error('Failed to increment version.');
    process.exit(1);
}

// Update package.json
packageJson.data.version = newVersion;
await writeFile(
    paths.PKG_JSON,
    JSON.stringify(packageJson.data, null, packageJson.indent),
    'utf-8',
);
console.log(`Updated package.json to version ${newVersion}`);

// Update unpacked/manifest.json
manifestJson.data.version = newVersion;
await writeFile(
    paths.UNPACKED_MANIFEST,
    JSON.stringify(manifestJson.data, null, manifestJson.indent),
    'utf-8',
);
console.log(`Updated manifest.json to version ${newVersion}`);

const DOWNLOAD_LINK_PT1 = `https://github.com/Araxeus/Youtube-Volume-Scroll/releases/download/v${newVersion}/youtube-volume-scroll_${newVersion}`;

// Update versions/chromium_version.xml
const chromiumXML = `\
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
    <app appid='${chromiumExtensionID}'>
        <updatecheck
            codebase='${DOWNLOAD_LINK_PT1}_chromium.crx'
            version='${newVersion}'
        />
    </app>
</gupdate>`;

await writeFile(paths.CHROMIUM_UPDATER, chromiumXML, 'utf-8');
console.log(`Updated chromium_version.xml to version ${newVersion}`);

// Update versions/firefox_versions.json
const firefoxUpdater = await getFile(paths.FIREFOX_UPDATER);

if (
    firefoxUpdater.data.addons[firefoxExtensionID].updates[0].version !==
    newVersion
) {
    firefoxUpdater.data.addons[firefoxExtensionID].updates.unshift({
        version: newVersion,
        update_link: `${DOWNLOAD_LINK_PT1}_firefox.xpi`,
    });

    await writeFile(
        paths.FIREFOX_UPDATER,
        JSON.stringify(firefoxUpdater.data, null, firefoxUpdater.indent),
        'utf-8',
    );
    console.log(`Updated firefox_versions.json to version ${newVersion}`);
} else {
    console.warn(
        `firefox_versions.json is already up to date with version ${newVersion}`,
    );
}

await $`bun format`.quiet();
