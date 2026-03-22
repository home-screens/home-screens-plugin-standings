import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.tsx',
      formats: ['iife'],
      name: '__HS_PLUGIN__',
      fileName: () => 'bundle.js',
    },
    sourcemap: true,
    outDir: 'dist',
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'React',
        },
      },
    },
  },
});
