import { describe, expect, it } from 'vitest'
import { buildEmailRedirectUrl } from '../src/redirectUrl'

describe('buildEmailRedirectUrl', () => {
  it('keeps the GitHub project path when the Vite base is relative', () => {
    expect(buildEmailRedirectUrl('https://canas1257.github.io/web-student-planner/', './'))
      .toBe('https://canas1257.github.io/web-student-planner/')
  })

  it('uses the custom-domain root when the Vite base is relative', () => {
    expect(buildEmailRedirectUrl('https://belajarteratur.web.id/', './'))
      .toBe('https://belajarteratur.web.id/')
  })
})
