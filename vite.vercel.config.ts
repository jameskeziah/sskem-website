import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import vinext from "vinext";
import { nitro } from "nitro/vite";

export default defineConfig({
  css: {
    postcss: {
      plugins: [],
    },
  },
  plugins: [
    tailwindcss(),
    vinext(),
    nitro(),
  ],
});
