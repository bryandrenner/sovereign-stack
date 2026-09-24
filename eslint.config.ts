import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import globals from 'globals'
import prettier from 'eslint-config-prettier/flat'
import tseslint from 'typescript-eslint'
import { defineConfig, includeIgnoreFile } from 'eslint/config'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))

export default defineConfig([
  includeIgnoreFile(gitignorePath, { gitignoreResolution: true }),
  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2025,
      globals: globals.node,
      parserOptions: { projectService: true },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
      reportUnusedInlineConfigs: 'warn',
    },
    rules: {
      '@typescript-eslint/no-empty-object-type': [
        'warn',
        // Prefer interfaces over `type` aliases for complex shapes. `type`
        // aliases expand fully in errors and IntelliSense, obscuring the name,
        // whereas interface names are preserved. An interface with `extends`
        // and no additional properties can therefore act as a readable alias.
        //
        // See TypeScript issue: https://github.com/microsoft/TypeScript/issues/45954
        { allowInterfaces: 'always' },
      ],
      // Unused variables are a natural part of development and shouldn't fail
      // lint. Once code is pushed, though, they more likely indicate a
      // forgotten cleanup and should be flagged.
      '@typescript-eslint/no-unused-vars':
        process.env['CI'] === 'true' ? 'warn' : 'off',
    },
  },
  prettier,
])
