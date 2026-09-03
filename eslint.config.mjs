// eslint.config.mjs

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Prevent developers from importing next/image directly.
  // The shared SiteImage component is the only exception.
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ignores: [
      "components/media/SiteImage.tsx",
      // If your component is elsewhere, change this path.
      // Example: "src/components/ui/SiteImage.tsx"
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/image",
              message:
                "Use the shared SiteImage component instead of next/image directly.",
            },
          ],
        },
      ],
    },
  },

  // Next.js generated files.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;