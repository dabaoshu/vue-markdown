import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import path from 'path';

/**
 * GitHub Pages 子路径：/vue-markdown/
 * 本地开发使用根路径 /
 */
const base = process.env.GITHUB_ACTIONS ? '/vue-markdown/' : '/';

export default defineConfig({
  plugins: [vue(), vueJsx()],
  base,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            if (id.includes('/demo/mermaid') || id.includes('code_mermaid')) {
              return 'demo-mermaid';
            }
            if (id.includes('/demo/MarkdownDemoEditor') || id.includes('DemoCodeMirror')) {
              return 'demo-editor';
            }
            if (id.includes('/components/markdown/')) {
              return 'demo-markdown';
            }
            return undefined;
          }
          if (id.includes('mermaid') || id.includes('cytoscape')) {
            return 'vendor-mermaid';
          }
          if (id.includes('@codemirror') || id.includes('codemirror')) {
            return 'vendor-codemirror';
          }
          if (id.includes('katex')) {
            return 'vendor-katex';
          }
          if (id.includes('element-plus')) {
            return 'vendor-element-plus';
          }
          return undefined;
        }
      }
    }
  },
  server: {
    port: 8002
  }
});
