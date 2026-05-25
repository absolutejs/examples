// eslint.config.mjs
import pluginJs from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config';
import absolutePlugin from 'eslint-plugin-absolute';
import promisePlugin from 'eslint-plugin-promise';
import securityPlugin from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
	{
		ignores: [
			'node_modules/**',
			'dist/**',
			'build/**',
			'.absolutejs/**',
			'**/indexes/**',
			// Personal OAuth2 identities used for local testing.
			'src/shared/exampleIdentities.ts',
			'**/*.min.js',
			'**/*.min.css'
		]
	},

	pluginJs.configs.recommended,

	...tseslint.configs.recommended,

	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
				Bun: 'readonly'
			},
			parser: tsParser,
			parserOptions: {
				createDefaultProgram: true,
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname
			}
		},
		plugins: { '@stylistic': stylistic },
		rules: {
			'@stylistic/padding-line-between-statements': [
				'error',
				{ blankLine: 'always', next: 'return', prev: '*' }
			],
			'@typescript-eslint/consistent-type-assertions': [
				'error',
				{ assertionStyle: 'never' }
			],
			'@typescript-eslint/consistent-type-definitions': ['error', 'type'],
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/no-unnecessary-type-assertion': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			]
		}
	},
	{
		files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
		plugins: {
			absolute: absolutePlugin,
			promise: promisePlugin,
			security: securityPlugin
		},
		rules: {
			'absolute/explicit-object-types': 'error',
			'absolute/localize-react-props': 'error',
			'absolute/max-depth-extended': ['error', 1],
			'absolute/max-jsxnesting': ['error', 5],
			'absolute/min-var-length': [
				'error',
				{ allowedVars: ['_', 'id', 'db', 'OK', 'ws'], minLength: 3 }
			],
			'absolute/no-explicit-return-type': 'error',
			'absolute/no-import-meta-path': 'error',
			'absolute/no-useless-function': 'error',
			'absolute/sort-exports': [
				'error',
				{
					caseSensitive: true,
					natural: true,
					order: 'asc',
					variablesBeforeFunctions: true
				}
			],
			'absolute/sort-keys-fixable': [
				'error',
				{
					caseSensitive: true,
					natural: true,
					order: 'asc',
					variablesBeforeFunctions: true
				}
			],
			'arrow-body-style': ['error', 'as-needed'],
			'consistent-return': 'error',
			eqeqeq: 'error',
			'func-style': [
				'error',
				'expression',
				{ allowArrowFunctions: true }
			],
			'no-await-in-loop': 'error',
			'no-console': ['error', { allow: ['warn', 'error'] }],
			'no-debugger': 'error',
			'no-duplicate-case': 'error',
			'no-duplicate-imports': 'error',
			'no-else-return': 'error',
			'no-empty-function': 'error',
			'no-empty-pattern': 'error',
			'no-fallthrough': 'error',
			'no-global-assign': 'error',
			'no-implicit-coercion': 'error',
			'no-implicit-globals': 'error',
			'no-loop-func': 'error',
			'no-magic-numbers': [
				'warn',
				{ detectObjects: false, enforceConst: true, ignore: [0, 1, 2] }
			],
			'no-nested-ternary': 'error',
			'no-new-wrappers': 'error',
			'no-param-reassign': 'error',
			'no-restricted-exports': [
				'error',
				{ restrictDefaultExports: { direct: true } }
			],
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							importNames: ['default'],
							message:
								'Import only named React exports for tree-shaking.',
							name: 'react'
						}
					]
				}
			],
			'no-return-await': 'error',
			'no-shadow': 'error',
			'no-undef': 'error',
			'no-unneeded-ternary': 'error',
			'no-unreachable': 'error',
			'no-useless-concat': 'error',
			'no-useless-return': 'error',
			'no-var': 'error',
			'prefer-arrow-callback': 'error',
			'prefer-const': 'error',
			'prefer-template': 'error',
			'promise/catch-or-return': 'error',
			'promise/no-return-wrap': 'error',
			'promise/param-names': 'error'
		}
	},
	{
		files: ['src/backend/server.ts'],
		rules: {
			'@typescript-eslint/no-unused-vars': 'off'
		}
	},
	{
		// The provider showcases log their OAuth2 responses so you can see them.
		files: ['src/backend/providers/**/*.ts'],
		rules: {
			'no-console': 'off'
		}
	},
	{
		files: ['absolute.config.ts'],
		rules: {
			'no-restricted-exports': 'off'
		}
	},
	{
		files: ['eslint.config.mjs'],
		languageOptions: {
			globals: { ...globals.node }
		},
		rules: {
			'absolute/no-import-meta-path': 'off',
			'no-magic-numbers': 'off',
			'no-restricted-exports': 'off'
		}
	}
]);
