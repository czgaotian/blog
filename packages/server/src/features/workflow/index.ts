/**
 * Built-in workflow feature.
 */

import { createWorkflowRoutes } from './routes'
import workflowAdminApiRoutes from './routes/admin-api'

export const workflowFeature = {
  routes: [
    {
      path: '/api/workflow',
      handler: createWorkflowRoutes() as any,
    },
    {
      path: '/api/plugins/workflow',
      handler: workflowAdminApiRoutes as any,
    },
  ],
}

export { WorkflowEngine, WorkflowService } from './services/workflow-service'
export { SchedulerService } from './services/scheduler'
