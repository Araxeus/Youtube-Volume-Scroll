import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        rules: {
            'no-unused-vars': 'warn',
            indent: ['error', 4, { SwitchCase: 1 }],
            'linebreak-style': 'off',
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
        },
        languageOptions: {
            ecmaVersion: 2022,
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },
    {
        ignores: ['**/popup/vendors/*', '**/.*'],
    },
];
