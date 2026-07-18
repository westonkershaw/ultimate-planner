import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // src/App.jsx is compiled bundler output (16k lines, long-line minified) — linting
  // it produces spurious errors and times ESLint out. It's generated, not
  // hand-maintained, so exclude it from the gate. `**/dist` + `.claude` also cover
  // built output inside .claude/worktrees checkouts. `mobile` is the Expo app —
  // it has its own toolchain and is not part of this web gate.
  globalIgnores(['**/dist', 'coverage', '.vercel', '.claude', 'src/App.jsx', 'mobile']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]|^motion$|^AnimatePresence$', argsIgnorePattern: '^_' }],
    },
  },
  // Node.js scripts — add CJS globals not in browser env
  {
    files: ['api/**/*.js', 'app-store-screenshots/**/*.js'],
    languageOptions: {
      parserOptions: {
        sourceType: 'commonjs',
      },
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
      },
    },
  },
])
