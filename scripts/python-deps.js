//////////////////////// Setup ////////////////////////////

import { writeJsonFile } from 'write-json-file';
import { loadJsonFile } from 'load-json-file';

const pkg = await loadJsonFile('./package.json');
const deps = Object.keys(pkg.python.dependencies);

// import pkg from './package.json' assert { type: 'json' }; // es-lint not yet supported: https://github.com/eslint/eslint/discussions/15305

import { execSync } from 'child_process';

const prefixesRegex = /^([^0-9]*)?.*$/;
const semverPrefixes = ['==', '~=', '<', '<=', '>', '>=', '~>'];

const flagKeys = {
    upgrade: ['upgrade', 'update', 'u'],
    outdated: ['outdated', 'check', 'o'],
    ci: ['ci'],
    help: ['help', 'h']
};

Object.keys(flagKeys).forEach(flag => {
    flagKeys[flag] = flagKeys[flag].flatMap(key => [key, `-${key}`, `--${key}`]);
});

const flags = process.argv.slice(2).reduce((acc, arg) => {
    Object.keys(flagKeys).forEach(flag => {
        if (flagKeys[flag].includes(arg)) {
            acc[flag] = true;
        }
    });
    return acc;
}, {});

//////////////////////// Main ////////////////////////////

const log = flags.ci ? () => { } : console.log.bind(console);

if (flags.help || Object.keys(flags).length === 0) {
    log('Availale flags:\n' +
        Object.keys(flagKeys).map(flag =>
            `    ${flag} [${flagKeys[flag].slice(1).join(', ')}]`
        ).join('\n'));
    process.exit(0);
}

if (flags.outdated) {
    const outdatedDeps = getOutdatedDeps();
    if (outdatedDeps?.length) {
        log('Outdated python dependencies:\n');
        outdatedDeps.forEach(dep => {
            log(`    ${dep.name}: ❌ ${dep.version} -> ✅ ${dep.latest_version}`);
        });
        log('\nRun `yarn python-deps upgrade` to upgrade them\n');
        process.exit(1);
    }
    process.exit(0);
}

if (flags.upgrade) {
    const updatedDeps = [];
    for (const dep of deps) {
        const oldVersion = pkg.python.dependencies[dep];

        const output = JSON.parse(
            execSync(`yarn npip install ${dep} --upgrade --quiet --report -`) ?? '{}'
        );
        const newVersion = output.install?.[0]?.metadata?.version;
        if (newVersion) {
            pkg.python.dependencies[dep] = formatWithPrefixes(oldVersion, newVersion);

            log(`Updated ${dep} from ${removePrefix(oldVersion)} to ${newVersion}`);

            updatedDeps.push({
                name: dep.name,
                version: dep.version,
                latest_version: dep.latest_version
            });
        }
    }

    if (updatedDeps.length) {
        await writeJsonFile('./package.json', pkg, { indent: 2 });

        if (flags.ci) {
            process.stdout.write(getPrBody(updatedDeps));
        }
    }

    process.exit(0);
}

/////////////////////// helper functions ///////////////////////

function getOutdatedDeps() {
    const output = execSync('yarn npip list --outdated --format=json').toString().trim();

    return JSON.parse(output)?.filter(dep => deps.includes(dep.name));
}

function formatWithPrefixes(existingVersion, newVersion) {
    const prefix = getPrefix(existingVersion);

    return prefix ? `${prefix}${newVersion}` : newVersion;
}

function getPrefix(version) {
    const prefix = prefixesRegex.exec(version)?.[1];
    if (!semverPrefixes.includes(prefix))
        return '';

    return prefix ?? '';
}

function removePrefix(version) {
    const prefix = getPrefix(version);
    return version.slice(prefix.length);
}

function getPrBody(deps) {
    const repoLink = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`;

    const links = {
        dependencyUpdater: `[dependency-updater.yml](${repoLink}/actions/runs/${process.env.GITHUB_RUN_ID})`,
        nopy: '[nopy](https://github.com/alastairpatrick/nopy)',
        pythonDeps: `[python-deps.js](${repoLink}/blob/master/scripts/python-deps.js)`
    };

    return `\
${deps.map(dep => `* Bump [${dep.name}](https://pypi.org/project/${dep.name}) from ❌ ${dep.version} to ✅ ${dep.latest_version}`).join('\n')}

----
    
This is an automated pull request by ${links.dependencyUpdater} using ${links.nopy} && ${links.pythonDeps}
`;
}

// spawn a child process to run `yarn npip show ${dep}`
// parse the output to get the version number
// function getVersion(dep) {
//     const output = execSync(`npm run npip show ${dep}`).toString().trim();
//     const lines = output.split('\n');
//     for (const line of lines) {
//         if (line.trim().startsWith('Version:')) {
//             return line.split(':').at(-1).trim();
//         }
//     }

//     throw new Error(`Package ${dep} is not installed`);
// }


