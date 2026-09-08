// vite.config.ts
import { defineConfig, loadEnv } from "file:///E:/%E9%A1%B9%E7%9B%AE/%E7%8E%B0%E5%9C%BA/vue-markdown/node_modules/.pnpm/vite@5.4.20_@types+node@20.19.43_sass@1.101.0/node_modules/vite/dist/node/index.js";
import vue from "file:///E:/%E9%A1%B9%E7%9B%AE/%E7%8E%B0%E5%9C%BA/vue-markdown/node_modules/.pnpm/@vitejs+plugin-vue@5.2.4_vi_c7c8abc5572515a98ed34139f65b2445/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///E:/%E9%A1%B9%E7%9B%AE/%E7%8E%B0%E5%9C%BA/vue-markdown/node_modules/.pnpm/@vitejs+plugin-vue-jsx@4.2._ebc7ddbbae303f0ca21826e080cf4797/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import path from "path";
import cssInjectedByJsPlugin from "file:///E:/%E9%A1%B9%E7%9B%AE/%E7%8E%B0%E5%9C%BA/vue-markdown/node_modules/.pnpm/vite-plugin-css-injected-by_18cf0d5a2459da5180a3477be4d6670d/node_modules/vite-plugin-css-injected-by-js/dist/esm/index.js";
var __vite_injected_original_dirname = "E:\\\u9879\u76EE\\\u73B0\u573A\\vue-markdown\\packages\\simple";
var vite_config_default = defineConfig(({ mode }) => {
  const { VITE_BASE_URL } = loadEnv(mode, process.cwd());
  return {
    plugins: [vue(), vueJsx(), cssInjectedByJsPlugin()],
    base: VITE_BASE_URL,
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "src")
      }
    },
    build: {
      lib: {
        entry: path.resolve(__vite_injected_original_dirname, "src/main.ts"),
        name: "sdk",
        fileName: "sdk"
      },
      minify: false
    },
    server: {
      port: 8001
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxcdTk4NzlcdTc2RUVcXFxcXHU3M0IwXHU1NzNBXFxcXHZ1ZS1tYXJrZG93blxcXFxwYWNrYWdlc1xcXFxzaW1wbGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXFx1OTg3OVx1NzZFRVxcXFxcdTczQjBcdTU3M0FcXFxcdnVlLW1hcmtkb3duXFxcXHBhY2thZ2VzXFxcXHNpbXBsZVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovJUU5JUExJUI5JUU3JTlCJUFFLyVFNyU4RSVCMCVFNSU5QyVCQS92dWUtbWFya2Rvd24vcGFja2FnZXMvc2ltcGxlL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJztcclxuaW1wb3J0IHZ1ZUpzeCBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUtanN4JzsgLy8gXHU1RjE1XHU1MTY1IFZ1ZSBUU1ggXHU2NTJGXHU2MzAxXHU2M0QyXHU0RUY2XHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgY3NzSW5qZWN0ZWRCeUpzUGx1Z2luIGZyb20gJ3ZpdGUtcGx1Z2luLWNzcy1pbmplY3RlZC1ieS1qcyc7XHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcclxuICBjb25zdCB7IFZJVEVfQkFTRV9VUkwgfSA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSk7XHJcbiAgcmV0dXJuIHtcclxuICAgIHBsdWdpbnM6IFt2dWUoKSwgdnVlSnN4KCksIGNzc0luamVjdGVkQnlKc1BsdWdpbigpXSxcclxuICAgIGJhc2U6IFZJVEVfQkFTRV9VUkwsXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGFsaWFzOiB7XHJcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjJylcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIGJ1aWxkOiB7XHJcbiAgICAgIGxpYjoge1xyXG4gICAgICAgIGVudHJ5OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjL21haW4udHMnKSxcclxuICAgICAgICBuYW1lOiAnc2RrJyxcclxuICAgICAgICBmaWxlTmFtZTogJ3NkaydcclxuICAgICAgfSxcclxuICAgICAgbWluaWZ5OiBmYWxzZVxyXG4gICAgfSxcclxuICAgIHNlcnZlcjoge1xyXG4gICAgICBwb3J0OiA4MDAxXHJcbiAgICB9XHJcbiAgfTtcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlUsU0FBUyxjQUFjLGVBQWU7QUFDblgsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sWUFBWTtBQUNuQixPQUFPLFVBQVU7QUFDakIsT0FBTywyQkFBMkI7QUFKbEMsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxFQUFFLGNBQWMsSUFBSSxRQUFRLE1BQU0sUUFBUSxJQUFJLENBQUM7QUFDckQsU0FBTztBQUFBLElBQ0wsU0FBUyxDQUFDLElBQUksR0FBRyxPQUFPLEdBQUcsc0JBQXNCLENBQUM7QUFBQSxJQUNsRCxNQUFNO0FBQUEsSUFDTixTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxLQUFLO0FBQUEsTUFDcEM7QUFBQSxJQUNGO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxLQUFLO0FBQUEsUUFDSCxPQUFPLEtBQUssUUFBUSxrQ0FBVyxhQUFhO0FBQUEsUUFDNUMsTUFBTTtBQUFBLFFBQ04sVUFBVTtBQUFBLE1BQ1o7QUFBQSxNQUNBLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsSUFDUjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
