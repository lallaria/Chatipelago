import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  globalIgnores(['dist/']),
  {
    languageOptions: {
      globals: globals.node
    }
  }
]);
