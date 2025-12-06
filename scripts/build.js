#!/usr/bin/env bun

import { cp } from 'node:fs/promises';
import { $ } from 'bun';
import { version } from '../package.json' with { type: 'json' };
import { check, deleteDist } from './check.js';
import { makeChromiumManifest } from './edit-manifest.js';
import { paths } from './provider.js';

$.cwd(paths.PKG);

export async function copyToDist() {
    await $`bun sass --update unpacked/popup`;
    await cp(paths.UNPACKED, paths.DIST, { recursive: true });
}

async function build() {
    await check();
    await $`web-ext build --filename="youtube-volume-scroll_${version}_firefox.xpi"`;
    await makeChromiumManifest();
    await $`web-ext build --filename="youtube-volume-scroll_${version}_chromium.zip"`;
    await deleteDist();
}

if (import.meta.main) {
    await build();
}
