import pluginJs from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
	{
		ignores: ["node_modules/**", "build/**", ".absolutejs/**"],
	},
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				Bun: "readonly",
			},
		},
		rules: {
			"@typescript-eslint/consistent-type-definitions": ["error", "type"],
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
		},
	},
]);
