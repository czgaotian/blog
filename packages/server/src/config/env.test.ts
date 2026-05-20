import { describe, expect, it } from 'vitest'
import { getServerEnvConfig } from './env'

describe('getServerEnvConfig', () => {
  it('defaults request logging off', () => {
    expect(getServerEnvConfig().requestLoggingEnabled).toBe(false)
  })

  it.each(['true', '1', 'yes', 'on', ' TRUE '])(
    'enables request logging for %s',
    (value) => {
      expect(getServerEnvConfig({ REQUEST_LOGGING_ENABLED: value }).requestLoggingEnabled).toBe(true)
    },
  )

  it.each(['false', '0', 'no', 'off', 'enabled'])(
    'keeps request logging disabled for %s',
    (value) => {
      expect(getServerEnvConfig({ REQUEST_LOGGING_ENABLED: value }).requestLoggingEnabled).toBe(false)
    },
  )
})
