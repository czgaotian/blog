import { describe, expect, it } from 'vitest'
import { getBootstrapRuntimeConfig } from './bootstrap'

describe('getBootstrapRuntimeConfig', () => {
  it('defaults to auto mode', () => {
    expect(getBootstrapRuntimeConfig()).toEqual({ mode: 'auto' })
    expect(getBootstrapRuntimeConfig({ BOOTSTRAP_MODE: '' })).toEqual({ mode: 'auto' })
  })

  it('parses supported bootstrap modes case-insensitively', () => {
    expect(getBootstrapRuntimeConfig({ BOOTSTRAP_MODE: 'manual' })).toEqual({ mode: 'manual' })
    expect(getBootstrapRuntimeConfig({ BOOTSTRAP_MODE: ' DISABLED ' })).toEqual({ mode: 'disabled' })
  })

  it('falls back to auto for unknown modes', () => {
    expect(getBootstrapRuntimeConfig({ BOOTSTRAP_MODE: 'eager' })).toEqual({ mode: 'auto' })
  })
})
