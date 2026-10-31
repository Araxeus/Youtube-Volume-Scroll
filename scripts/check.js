#!/usr/bin/env bun

import { rm } from 'node:fs/promises';
import { styleText } from 'node:util';
import boxen from 'boxen';
import { $ } from 'bun';
import { copyToDist } from './build.js';
import { makeFirefoxManifest } from './edit-manifest.js';
import { paths } from './provider.js';

$.cwd(paths.PKG);

// Desktop-only add-on, so the Android minimum version doesn't apply

const IGNORED_WARNINGS = [
    'KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION',
    'KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION',
];

const BOX_COLORS = { error: 'red', warning: 'yellow', notice: 'cyan' };

function wrap(text, max) {
    const lines = [''];
    const words = String(text)
        .split(' ')
        .flatMap(word => word.match(new RegExp(`.{1,${max}}`, 'g')) ?? ['']);
    for (const word of words) {
        const last = lines.length - 1;
        if (lines[last] && lines[last].length + word.length >= max)
            lines.push(word);
        else lines[last] = lines[last] ? `${lines[last]} ${word}` : word;
    }
    return lines;
}

function lintBox({ _type, ...fields }) {
    // Fixed width so long descriptions wrap instead of overflowing the terminal

    const width = Math.min(process.stderr.columns || 80, 100);
    const keyWidth = Math.max(...Object.keys(fields).map(k => k.length)) + 2;

    // Border and padding take 8 columns

    const textWidth = width - 8 - keyWidth;
    const body = Object.entries(fields)
        .map(([key, value]) =>
            [
                styleText('bold', key.padEnd(keyWidth)),
                wrap(value, textWidth).join(`\n${' '.repeat(keyWidth)}`),
            ].join(''),
        )
        .join('\n');

    return boxen(body, {
        title: _type,
        padding: 1,
        borderStyle: 'round',
        borderColor: BOX_COLORS[_type],
        width,
    });
}

async function checkInternal(quiet = false) {
    try {
        if (!process.env.CI) {
            const { exitCode } = await $`biome check --colors=force`
                .nothrow()
                .quiet(quiet);
            if (exitCode !== 0) throw new Error('biome check failed');
        }
        const { stdout } =
            await $`web-ext lint --output json --ignore-files "./popup/vendors/*"`
                .nothrow()
                .quiet();
        const report = JSON.parse(stdout.toString());
        const problems = [
            ...report.errors,
            ...report.warnings.filter(w => !IGNORED_WARNINGS.includes(w.code)),
        ];
        for (const notice of report.notices) console.log(lintBox(notice));
        if (problems.length) {
            for (const problem of problems) console.error(lintBox(problem));
            throw new Error('web-ext lint failed');
        }
        if (!quiet) console.log(styleText('green', 'web-ext lint passed'));
    } catch {
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
