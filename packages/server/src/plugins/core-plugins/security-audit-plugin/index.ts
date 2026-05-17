/**
 * Built-in security audit feature.
 */

import { securityAuditApiRoutes } from './routes/api'

export const securityAuditFeature = {
  routes: [{
    path: '/api/security-audit',
    handler: securityAuditApiRoutes as any,
  }],
}

export { SecurityAuditService } from './services/security-audit-service'
export { BruteForceDetector } from './services/brute-force-detector'
export { securityAuditMiddleware } from './middleware/audit-middleware'
