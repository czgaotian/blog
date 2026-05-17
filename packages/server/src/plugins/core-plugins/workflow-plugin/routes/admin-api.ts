import { Hono } from 'hono'
import type { AdminApiResponse, WorkflowAdminDashboardData, WorkflowStateData } from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../../../../app'
import { requireAuth, requireRole } from '../../../../middleware'
import { SchedulerService } from '../services/scheduler'
import { WorkflowEngine } from '../services/workflow-service'

const workflowAdminApiRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

workflowAdminApiRoutes.use('*', requireAuth())
workflowAdminApiRoutes.use('*', requireRole('admin'))

function success<T>(data: T, message?: string): AdminApiResponse<T> {
  return message ? { success: true, data, message } : { success: true, data }
}

function failure(error: string, message?: string): AdminApiResponse<never> {
  return message ? { success: false, error, message } : { success: false, error }
}

async function getWorkflowStateData(workflowEngine: WorkflowEngine): Promise<WorkflowStateData[]> {
  const states = await workflowEngine.getWorkflowStates()
  const stateData: WorkflowStateData[] = []

  for (const state of states) {
    try {
      const content = await workflowEngine.getContentByState(state.id, 10)
      stateData.push({
        ...state,
        count: content.length,
        content: content.slice(0, 5),
      })
    } catch {
      stateData.push({
        ...state,
        count: 0,
        content: [],
      })
    }
  }

  return stateData
}

workflowAdminApiRoutes.get('/', async (c) => {
  try {
    const user = c.get('user')
    const workflowEngine = new WorkflowEngine(c.env.DB)
    const scheduler = new SchedulerService(c.env.DB)

    let states: WorkflowStateData[] = []
    let assignedContent: Array<Record<string, unknown>> = []
    let scheduledContent: Array<Record<string, unknown>> = []
    let scheduledStats = {
      pending: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    }

    try {
      states = await getWorkflowStateData(workflowEngine)
    } catch {
      // Workflow tables may be absent until the plugin migration runs.
    }

    try {
      assignedContent = await workflowEngine.getAssignedContent(user?.userId || '')
    } catch {
      // Workflow tables may be absent until the plugin migration runs.
    }

    try {
      ;[scheduledContent, scheduledStats] = await Promise.all([
        scheduler.getScheduledContentForUser(user?.userId || ''),
        scheduler.getScheduledContentStats(),
      ])
    } catch {
      // scheduled_content may be absent until the plugin migration runs.
    }

    return c.json(success<WorkflowAdminDashboardData>({
      states,
      assignedContent,
      scheduledContent,
      scheduledStats,
    }))
  } catch (error) {
    console.error('Error fetching Workflow dashboard:', error)
    return c.json(failure('Failed to fetch Workflow dashboard'), 500)
  }
})

export default workflowAdminApiRoutes
