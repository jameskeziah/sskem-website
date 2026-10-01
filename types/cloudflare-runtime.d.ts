// Cloudflare provides this virtual module at runtime. Model only the D1 binding
// needed here for standalone TypeScript validation.
declare module "cloudflare:workers" {
  export const env: {
    DB: Parameters<typeof import("drizzle-orm/d1").drizzle>[0];
  };
}
