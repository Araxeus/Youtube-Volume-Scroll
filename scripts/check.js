#!/usr/bin/env bun

import { rm } from 'node:fs/promises';
import { $ } from 'bun';
import { copyToDist } from './build.js';
import { makeFirefoxManifest } from './edit-manifest.js';
import { paths } from './provider.js';

$.cwd(paths.PKG);

async function checkInternal(quiet = false) {
    try {
        if (!process.env.CI) {
            const { exitCode } = await $`biome check --colors=force`
                .nothrow()
                .quiet(quiet);
            if (exitCode !== 0) throw new Error('biome check failed');
        }
        await $`web-ext lint -w --ignore-files "./popup/vendors/*"`.quiet(
            quiet,
        );
    } catch (_) {
        console.error(
            'Errors found during checks. Cleaning up dist/ directory.',
        );
        await deleteDist();
        process.exit(1);
    }
}

export async function deleteDist() {
    await rm(paths.DIST, { recursive: true, force: true });
}

export async function check(quiet) {
    await copyToDist();
    await makeFirefoxManifest();
    await checkInternal(quiet);
}

if (import.meta.main) {
    const quiet = process.argv.includes('--quiet');
    await check(quiet);
    await deleteDist();
}
