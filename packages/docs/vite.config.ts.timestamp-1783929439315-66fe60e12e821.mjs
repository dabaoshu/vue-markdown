// vite.config.ts
import { defineConfig } from "file:///E:/%E9%A1%B9%E7%9B%AE/%E7%8E%B0%E5%9C%BA/vue-markdown/node_modules/.pnpm/vite@5.4.20_@types+node@20.19.13_sass@1.97.3/node_modules/vite/dist/node/index.js";
import vue from "file:///E:/%E9%A1%B9%E7%9B%AE/%E7%8E%B0%E5%9C%BA/vue-markdown/node_modules/.pnpm/@vitejs+plugin-vue@5.2.4_vi_60efffa723eb4e3d7e6e0956854e3a74/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///E:/%E9%A1%B9%E7%9B%AE/%E7%8E%B0%E5%9C%BA/vue-markdown/node_modules/.pnpm/@vitejs+plugin-vue-jsx@4.2._d912915eee1ffa4be994ddafdf25b7dc/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "E:\\\u9879\u76EE\\\u73B0\u573A\\vue-markdown\\packages\\docs";
var base = process.env.GITHUB_ACTIONS ? "/vue-markdown/" : "/";
var vite_config_default = defineConfig({
  plugins: [vue(), vueJsx()],
  base,
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "src")
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    rollupOptions: {
      output: {
        /**
         * 仅拆分 node_modules 中的重型依赖。
         * 不要对 src 下的 Demo/编辑器做 manualChunks —— 否则 Rollup 可能把 Vue 运行时
         * 复用到异步 chunk，入口 chunk 反向依赖它，再叠加 vendor 交叉引用会在生产环境报错。
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return void 0;
          }
          if (id.includes("mermaid") || id.includes("cytoscape")) {
            return "vendor-mermaid";
          }
          if (id.includes("katex")) {
            return "vendor-katex";
          }
          if (id.includes("element-plus")) {
            return "vendor-element-plus";
          }
          if (id.includes("@codemirror") || id.includes("/codemirror/") || id.includes("vue-codemirror")) {
            return "vendor-codemirror";
          }
          return void 0;
        }
      }
    }
  },
  server: {
    port: 8002
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxcdTk4NzlcdTc2RUVcXFxcXHU3M0IwXHU1NzNBXFxcXHZ1ZS1tYXJrZG93blxcXFxwYWNrYWdlc1xcXFxkb2NzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxcdTk4NzlcdTc2RUVcXFxcXHU3M0IwXHU1NzNBXFxcXHZ1ZS1tYXJrZG93blxcXFxwYWNrYWdlc1xcXFxkb2NzXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi8lRTklQTElQjklRTclOUIlQUUvJUU3JThFJUIwJUU1JTlDJUJBL3Z1ZS1tYXJrZG93bi9wYWNrYWdlcy9kb2NzL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJztcclxuaW1wb3J0IHZ1ZUpzeCBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUtanN4JztcclxuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XHJcblxyXG4vKipcclxuICogR2l0SHViIFBhZ2VzIFx1NUI1MFx1OERFRlx1NUY4NFx1RkYxQS92dWUtbWFya2Rvd24vXHJcbiAqIFx1NjcyQ1x1NTczMFx1NUYwMFx1NTNEMVx1NEY3Rlx1NzUyOFx1NjgzOVx1OERFRlx1NUY4NCAvXHJcbiAqL1xyXG5jb25zdCBiYXNlID0gcHJvY2Vzcy5lbnYuR0lUSFVCX0FDVElPTlMgPyAnL3Z1ZS1tYXJrZG93bi8nIDogJy8nO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbdnVlKCksIHZ1ZUpzeCgpXSxcclxuICBiYXNlLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpXHJcbiAgICB9XHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgb3V0RGlyOiAnZGlzdCcsXHJcbiAgICBlbXB0eU91dERpcjogdHJ1ZSxcclxuICAgIHRhcmdldDogJ2VzMjAyMCcsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFx1NEVDNVx1NjJDNlx1NTIwNiBub2RlX21vZHVsZXMgXHU0RTJEXHU3Njg0XHU5MUNEXHU1NzhCXHU0RjlEXHU4RDU2XHUzMDAyXHJcbiAgICAgICAgICogXHU0RTBEXHU4OTgxXHU1QkY5IHNyYyBcdTRFMEJcdTc2ODQgRGVtby9cdTdGMTZcdThGOTFcdTU2NjhcdTUwNUEgbWFudWFsQ2h1bmtzIFx1MjAxNFx1MjAxNCBcdTU0MjZcdTUyMTkgUm9sbHVwIFx1NTNFRlx1ODBGRFx1NjI4QSBWdWUgXHU4RkQwXHU4ODRDXHU2NUY2XHJcbiAgICAgICAgICogXHU1OTBEXHU3NTI4XHU1MjMwXHU1RjAyXHU2QjY1IGNodW5rXHVGRjBDXHU1MTY1XHU1M0UzIGNodW5rIFx1NTNDRFx1NTQxMVx1NEY5RFx1OEQ1Nlx1NUI4M1x1RkYwQ1x1NTE4RFx1NTNFMFx1NTJBMCB2ZW5kb3IgXHU0RUE0XHU1M0M5XHU1RjE1XHU3NTI4XHU0RjFBXHU1NzI4XHU3NTFGXHU0RUE3XHU3M0FGXHU1ODgzXHU2MkE1XHU5NTE5XHUzMDAyXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XHJcbiAgICAgICAgICBpZiAoIWlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdtZXJtYWlkJykgfHwgaWQuaW5jbHVkZXMoJ2N5dG9zY2FwZScpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLW1lcm1haWQnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdrYXRleCcpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWthdGV4JztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnZWxlbWVudC1wbHVzJykpIHtcclxuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItZWxlbWVudC1wbHVzJztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ0Bjb2RlbWlycm9yJykgfHxcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJy9jb2RlbWlycm9yLycpIHx8XHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCd2dWUtY29kZW1pcnJvcicpXHJcbiAgICAgICAgICApIHtcclxuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItY29kZW1pcnJvcic7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA4MDAyXHJcbiAgfVxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1VSxTQUFTLG9CQUFvQjtBQUNwVyxPQUFPLFNBQVM7QUFDaEIsT0FBTyxZQUFZO0FBQ25CLE9BQU8sVUFBVTtBQUhqQixJQUFNLG1DQUFtQztBQVN6QyxJQUFNLE9BQU8sUUFBUSxJQUFJLGlCQUFpQixtQkFBbUI7QUFFN0QsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7QUFBQSxFQUN6QjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsS0FBSztBQUFBLElBQ3BDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsYUFBYTtBQUFBLElBQ2IsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQU1OLGFBQWEsSUFBSTtBQUNmLGNBQUksQ0FBQyxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQ2hDLG1CQUFPO0FBQUEsVUFDVDtBQUNBLGNBQUksR0FBRyxTQUFTLFNBQVMsS0FBSyxHQUFHLFNBQVMsV0FBVyxHQUFHO0FBQ3RELG1CQUFPO0FBQUEsVUFDVDtBQUNBLGNBQUksR0FBRyxTQUFTLE9BQU8sR0FBRztBQUN4QixtQkFBTztBQUFBLFVBQ1Q7QUFDQSxjQUFJLEdBQUcsU0FBUyxjQUFjLEdBQUc7QUFDL0IsbUJBQU87QUFBQSxVQUNUO0FBQ0EsY0FDRSxHQUFHLFNBQVMsYUFBYSxLQUN6QixHQUFHLFNBQVMsY0FBYyxLQUMxQixHQUFHLFNBQVMsZ0JBQWdCLEdBQzVCO0FBQ0EsbUJBQU87QUFBQSxVQUNUO0FBQ0EsaUJBQU87QUFBQSxRQUNUO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
