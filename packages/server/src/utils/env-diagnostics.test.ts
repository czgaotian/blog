import { describe, expect, it } from 'vitest'
import { summarizeEnvironmentBindings } from './env-diagnostics'

describe('summarizeEnvironmentBindings', () => {
  it('summarizes bindings without exposing secret values', () => {
    const summary = summarizeEnvironmentBindings({
      DB: { prepare: () => ({}) },
      JWT_SECRET: 'super-secret',
      IMAGES_API_TOKEN: 'image-secret',
      ENVIRONMENT: 'test',
      EMPTY_VALUE: '',
    })

    expect(summary).toEqual({
      DB: 'binding',
      EMPTY_VALUE: 'empty',
      ENVIRONMENT: 'configured',
      IMAGES_API_TOKEN: 'configured-secret',
      JWT_SECRET: 'configured-secret',
    })
    expect(JSON.stringify(summary)).not.toContain('super-secret')
    expect(JSON.stringify(summary)).not.toContain('image-secret')
  })

  it('returns an empty summary for non-object input', () => {
    expect(summarizeEnvironmentBindings(null)).toEqual({})
    expect(summarizeEnvironmentBindings('JWT_SECRET=secret')).toEqual({})
  })
})
