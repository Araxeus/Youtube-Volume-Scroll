import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { parse } from 'yaml';

const deps = getDependencies();

execSync('yarn peru');

const depsNew = getDependencies().filter(dep => dep.version !== deps[dep.name].version);

const newDepsList = depsNew.map(dep => `* Bump [${dep.name}](${dep.origin}) from ❌ ${dep.version} to ✅ ${dep.versionNew}`).join('\n');

const repoLink = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`;

const links = {
    dependencyUpdater: `[dependency-updater.yml](${repoLink}/actions/runs/${process.env.GITHUB_RUN_ID})`,
    peru: '[peru](https://github.com/buildinspace/peru)',
    peruCi: `[peru-ci.js](${repoLink}/blob/master/scripts/peru-ci.js)`
};

process.stdout.write(`\
${newDepsList}

----

This is an automated pull request by ${links.dependencyUpdater} using ${links.peru} && ${links.peruCi}
`
);

/////////////////////// helper function ///////////////////////

function getDependencies() {
    const peru = parse(readFileSync('peru.yaml', 'utf8'));

    return Object.fromEntries(Object.entries(peru.imports).map(([module, path]) => {
        const { rev, url, pick } = peru[`git module ${module}`];

        return [
            module,
            {
                version: rev,
                files: pick,
                path,
                origin: url
            }
        ];
    }));
}

// # peru.yaml

// imports:
//     coloris: ./unpacked/popup/vendors/coloris
//     cooltipz: ./unpacked/popup/vendors/cooltipz
// git module coloris:
//     url: https://github.com/mdbassit/Coloris
//     move:
//         dist/coloris.min.js: coloris.min.js
//         dist/coloris.min.css: coloris.min.css
//     pick:
//         - coloris.min.js
//         - coloris.min.css
//         - LICENSE
//     rev: 672e4c1ed76b5f15b333f2f1639661cdf79c4e41
// git module cooltipz:
//     url: https://github.com/jackdomleo7/Cooltipz.css
//     pick:
//         - cooltipz.min.css
//         - LICENSE
//     rev: 221c78fc845f4272b8e81f9c9a55ff5416949903


// when parsed to js (json), it looks like this:

// {
//     imports: {
//       coloris: './unpacked/popup/vendors/coloris',
//       cooltipz: './unpacked/popup/vendors/cooltipz'
//     },
//     'git module coloris': {
//       url: 'https://github.com/mdbassit/Coloris',
//       move: {
//         'dist/coloris.min.js': 'coloris.min.js',
//         'dist/coloris.min.css': 'coloris.min.css'
//       },
//       pick: [ 'coloris.min.js', 'coloris.min.css', 'LICENSE' ],
//       rev: '672e4c1ed76b5f15b333f2f1639661cdf79c4e41'
//     },
//     'git module cooltipz': {
//       url: 'https://github.com/jackdomleo7/Cooltipz.css',
//       pick: [ 'cooltipz.min.css', 'LICENSE' ],
//       rev: '221c78fc845f4272b8e81f9c9a55ff5416949903'
//     }
// }
