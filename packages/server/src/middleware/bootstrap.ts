import { Context, Next } from "hono";
import {
  getBootstrapRuntimeConfig,
  isBootstrapComplete,
  resetBootstrap,
  runBootstrap,
  verifySecurityConfig,
} from "../services/bootstrap";
import type { WorkerBlogConfig } from "../app";

type Bindings = {
  DB: D1Database;
  CACHE_KV: KVNamespace;
  JWT_SECRET?: string;
  CORS_ORIGINS?: string;
  ENVIRONMENT?: string;
  BOOTSTRAP_MODE?: string;
};

export { resetBootstrap, verifySecurityConfig };

/**
 * Bootstrap middleware that ensures system initialization
 * Runs once per worker instance
 */
export function bootstrapMiddleware(config: WorkerBlogConfig = {}) {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const runtimeConfig = getBootstrapRuntimeConfig(c.env);
    if (runtimeConfig.mode !== 'auto') {
      return next();
    }

    // Skip if already bootstrapped in this worker instance
    if (isBootstrapComplete()) {
      return next();
    }

    // Skip bootstrap for static assets and health checks
    const path = c.req.path;
    if (
      path.startsWith("/images/") ||
      path.startsWith("/assets/") ||
      path.startsWith("/admin/assets/") ||
      path === "/health" ||
      path === "/api/health" ||
      path.endsWith(".js") ||
      path.endsWith(".css") ||
      path.endsWith(".png") ||
      path.endsWith(".jpg") ||
      path.endsWith(".ico")
    ) {
      return next();
    }

    await runBootstrap(c.env as Bindings, config);

    return next();
  };
}
