import type { NextConfig } from "next";

// cacheComponents is left off: every screen depends on the signed-in user and changes in real time,
// so there is nothing to prerender and session reads would need a Suspense boundary everywhere
const nextConfig: NextConfig = {
  // Tailwind through its Turbopack loader, as scaffolded by create-next-app 16.4 (no PostCSS config needed)
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
