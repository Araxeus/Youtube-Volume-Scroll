#!/usr/bin/env bun

import { $ } from 'bun';
import { version } from '../package.json' with { type: 'json' };
import { paths } from './provider.js';

$.cwd(paths.PKG);

await $`git add .`;
await $`git commit -m "chore(release): v${version}"`;
await $`git tag v${version}`;

console.log(`Committed and tagged version v${version} successfully.
run 'git push origin main && git push --tags origin main' to push changes.`);
