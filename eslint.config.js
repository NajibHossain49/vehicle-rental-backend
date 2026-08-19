const { defineConfig, globalIgnores } = require('eslint/config');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = defineConfig([
  globalIgnores(['dist/**', 'node_modules/**', 'uploads/**', 'eslint.config.js']),
  ...tsPlugin.configs['flat/recommended'],
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        exports: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/types/**/*.ts'],
    rules: {
      '@typescript-eslint/no-namespace': 'off',
    },
  },
]);
