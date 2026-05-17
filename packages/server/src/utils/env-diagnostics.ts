export type EnvBindingSummary = Record<string, 'binding' | 'configured' | 'configured-secret' | 'empty'>

const SECRET_KEY_PATTERN = /(SECRET|TOKEN|KEY|PASSWORD|PRIVATE|CLIENT_SECRET)/i

export function summarizeEnvironmentBindings(env: unknown): EnvBindingSummary {
  if (!env || typeof env !== 'object') {
    return {}
  }

  return Object.keys(env as Record<string, unknown>)
    .sort()
    .reduce<EnvBindingSummary>((summary, key) => {
      const value = (env as Record<string, unknown>)[key]

      if (value === undefined || value === null || value === '') {
        summary[key] = 'empty'
        return summary
      }

      if (typeof value === 'object' || typeof value === 'function') {
        summary[key] = 'binding'
        return summary
      }

      summary[key] = SECRET_KEY_PATTERN.test(key) ? 'configured-secret' : 'configured'
      return summary
    }, {})
}
