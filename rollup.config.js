import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';
import { builtinModules } from 'module';

export default defineConfig({
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true
    }
  ],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist',
      rootDir: './src',
      exclude: ['**/*.test.ts', '**/*.spec.ts']
    })
  ],
  external: [
    ...builtinModules,
    ...builtinModules.map(m => `node:${m}`)
  ]
});
