/**
 * Built-in security audit feature.
 */

import securityAuditAdminApiRoutes from "./routes/admin-api";
import { securityAuditApiRoutes } from "./routes/api";

export const securityAuditFeature = {
  routes: [
    {
      path: "/api/security-audit",
      handler: securityAuditApiRoutes as any,
    },
    {
      path: "/api/admin/security-audit",
      handler: securityAuditAdminApiRoutes as any,
    },
  ],
};

export { securityAuditMiddleware } from "./middleware/audit-middleware";
export { BruteForceDetector } from "./services/brute-force-detector";
export { SecurityAuditService } from "./services/security-audit-service";
