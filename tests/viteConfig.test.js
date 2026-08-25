import { describe, expect, it } from 'vitest'
import viteConfig from '../vite.config'

describe('Vite deployment base', () => {
  it('uses relative asset URLs so GitHub project Pages and the custom domain both work', () => {
    expect(viteConfig.base).toBe('./')
  })
})
