//////////////////////// Setup ////////////////////////////

import { writeJsonFile } from 'write-json-file';
import { loadJsonFile } from 'load-json-file';

const pkg = await loadJsonFile('./package.json');

// import pkg from './package.json' assert { type: 'json' }; // es-lint not yet supported: https://github.com/eslint/eslint/discussions/15305

import { execSync } from 'child_process';

const prefixesRegex = /^(\D*)\d/;
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
    for (const [dep, oldVersion] of Object.entries(pkg.python.dependencies)) {
        const oldVersionFormatted = removePrefix(oldVersion);

        let execOutput;
        try {
            execOutput = execSync(`yarn npip install ${dep} --report - --upgrade --quiet`);
        } catch (e) {
            log(`Failed to update ${dep} from ${oldVersionFormatted} to ${dep.latest_version}\n${e.output.toString()}`);
        }

        const output = JSON.parse(execOutput.toString() ?? '{}');
        const newVersion = output.install?.[0]?.metadata?.version;
        if (newVersion) {
            pkg.python.dependencies[dep] = formatWithPrefixes(oldVersion, newVersion);

            log(`Updated ${dep} from ${oldVersionFormatted} to ${newVersion}`);

            updatedDeps.push({
                name: dep,
                version: oldVersionFormatted,
                latest_version: newVersion
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

    return JSON.parse(output)?.filter(dep => !!pkg.python.dependencies[dep.name]);
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
