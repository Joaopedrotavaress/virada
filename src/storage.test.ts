import { afterEach, describe, expect, it } from 'vitest'
import { ANALYSIS_DEPTHS, backgroundDepth, loadDepth, saveDepth } from './storage'

const fakeStorage = () => {
  const data = new Map<string, string>()
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('profundidade', () => {
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage
  })

  it('guarda cada profundidade oferecida, até a máxima', () => {
    fakeStorage()
    for (const depth of ANALYSIS_DEPTHS) {
      saveDepth(depth)
      expect(loadDepth()).toBe(depth)
    }
    expect(Math.max(...ANALYSIS_DEPTHS)).toBe(22)
  })

  it('volta para a Normal com um valor estranho', () => {
    fakeStorage()
    saveDepth(99)
    expect(loadDepth()).toBe(15)
  })

  it('o que roda em segundo plano para em 18', () => {
    expect(backgroundDepth(22)).toBe(18)
    expect(backgroundDepth(20)).toBe(18)
    expect(backgroundDepth(15)).toBe(15)
  })
})
