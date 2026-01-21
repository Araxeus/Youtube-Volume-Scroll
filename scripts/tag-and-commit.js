#!/usr/bin/env bun

import { $ } from 'bun';
import { version } from '../package.json' with { type: 'json' };
import { paths } from './provider.js';

$.cwd(paths.PKG);

await $`git add .`;
await $`git commit -m "v${version}"`;
await $`git tag v${version}`;

console.log(`Committed and tagged version v${version} successfully.`);
