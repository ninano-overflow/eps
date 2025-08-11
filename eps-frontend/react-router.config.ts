import type { Config } from "@react-router/dev/config";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // Ignore /api routes for React Router
  ignoredRouteFiles: ["**/.*", "**/*.test.{js,jsx,ts,tsx}"],
} satisfies Config;
