/**
 * Simple in-memory metrics tracker for real-time analytics
 * Tracks requests per second using a sliding window
 */

interface RequestMetrics {
  timestamp: number
  method?: string
  statusClass?: '1xx' | '2xx' | '3xx' | '4xx' | '5xx'
  durationMs?: number
}

export interface RecordRequestOptions {
  timestamp?: number
  method?: string
  statusCode?: number
  durationMs?: number
}

export class MetricsTracker {
  private requests: RequestMetrics[] = []
  private readonly windowSize = 10000 // 10 seconds window

  /**
   * Record a new request
   */
  recordRequest(options: RecordRequestOptions = {}): void {
    const now = options.timestamp ?? Date.now()
    this.requests.push({
      timestamp: now,
      method: options.method?.toUpperCase(),
      statusClass: getStatusClass(options.statusCode),
      durationMs: options.durationMs,
    })
    this.cleanup(now)
  }

  /**
   * Clean up old requests outside the window
   */
  private cleanup(now: number): void {
    const cutoff = now - this.windowSize
    this.requests = this.requests.filter(req => req.timestamp > cutoff)
  }

  /**
   * Get current requests per second
   */
  getRequestsPerSecond(): number {
    const now = Date.now()
    this.cleanup(now)

    if (this.requests.length === 0) {
      return 0
    }

    // Calculate RPS over the last second
    const oneSecondAgo = now - 1000
    const recentRequests = this.requests.filter(req => req.timestamp > oneSecondAgo)

    return recentRequests.length
  }

  /**
   * Get total requests in the current window
   */
  getTotalRequests(): number {
    const now = Date.now()
    this.cleanup(now)
    return this.requests.length
  }

  /**
   * Get average requests per second over the window
   */
  getAverageRPS(): number {
    const now = Date.now()
    this.cleanup(now)

    if (this.requests.length === 0) {
      return 0
    }

    const windowSeconds = this.windowSize / 1000
    return this.requests.length / windowSeconds
  }

  /**
   * Get average response duration in milliseconds over the current window
   */
  getAverageDurationMs(): number {
    const now = Date.now()
    this.cleanup(now)

    const durations = this.requests
      .map(req => req.durationMs)
      .filter((duration): duration is number => typeof duration === 'number')

    if (durations.length === 0) {
      return 0
    }

    return durations.reduce((sum, duration) => sum + duration, 0) / durations.length
  }

  /**
   * Get request counts grouped by status class over the current window
   */
  getStatusClassCounts(): Record<string, number> {
    const now = Date.now()
    this.cleanup(now)

    return this.requests.reduce<Record<string, number>>((counts, req) => {
      const statusClass = req.statusClass || 'unknown'
      counts[statusClass] = (counts[statusClass] || 0) + 1
      return counts
    }, {})
  }

  /**
   * Reset tracked metrics. Intended for tests and local diagnostics.
   */
  reset(): void {
    this.requests = []
  }
}

function getStatusClass(statusCode?: number): RequestMetrics['statusClass'] | undefined {
  if (!statusCode) return undefined

  if (statusCode >= 100 && statusCode < 200) return '1xx'
  if (statusCode >= 200 && statusCode < 300) return '2xx'
  if (statusCode >= 300 && statusCode < 400) return '3xx'
  if (statusCode >= 400 && statusCode < 500) return '4xx'
  if (statusCode >= 500 && statusCode < 600) return '5xx'

  return undefined
}

// Global singleton instance
export const metricsTracker = new MetricsTracker()
