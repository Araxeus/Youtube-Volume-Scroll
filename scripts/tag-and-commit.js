#!/usr/bin/env bun

import { $, file } from 'bun';
import { paths } from './provider';

$.cwd(paths.PKG);

const pkg = await file(paths.PKG_JSON).json();

await $`git add .`;
await $`git commit -m "v${pkg.version}"`;
await $`git tag v${pkg.version}`;

console.log(`Committed and tagged version v${pkg.version} successfully.`);
