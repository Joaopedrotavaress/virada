import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { type CatalogLine, buildFamilies, familyId, familyOf, filterFamilies, loadFamilies } from './catalog'

const LINES: CatalogLine[] = [
  ['B90', 'Defesa Siciliana: Najdorf', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'],
  ['B20', 'Defesa Siciliana', 'e4 c5'],
  ['C30', 'Gambito do Rei', 'e4 e5 f4'],
  ['D02', 'Sistema Londres', 'd4 d5 Bf4'],
  ['A10', 'Abertura Inglesa', 'c4'],
  ['A00', 'Abertura Grob', 'g4'],
]

describe('catálogo de aberturas', () => {
  it('nome e identificador da família', () => {
    expect(familyOf('Defesa Siciliana: Najdorf, Variante Inglesa')).toBe('Defesa Siciliana')
    expect(familyId('Defesa Índia do Rei: Sämisch')).toBe('defesa-india-do-rei')
  })

  it('agrupa as variantes e coloca o tronco primeiro', () => {
    const families = buildFamilies(LINES)
    const sicilian = families.find((family) => family.id === 'defesa-siciliana')!
    expect(sicilian.variants.map((variant) => variant.moves.length)).toEqual([2, 10])
    expect(sicilian.group).toBe('e4-outras')
    expect(sicilian.guide?.slug).toBe('siciliana')
  })

  it('separa por primeiro lance e marca gambitos e sistemas', () => {
    const families = buildFamilies(LINES)
    const by = (id: string) => families.find((family) => family.id === id)!
    expect(by('gambito-do-rei')).toMatchObject({ group: 'e4-e5', isGambit: true })
    expect(by('sistema-londres')).toMatchObject({ group: 'd4-d5', isSystem: true })
    expect(by('abertura-inglesa').group).toBe('flanco')
    expect(by('abertura-grob').guide).toBeNull()
  })

  it('busca sem ligar para acento, pelo nome, pela variante e pelo ECO', () => {
    const families = buildFamilies(LINES)
    const names = (query: string, kind: 'all' | 'gambits' | 'systems' | 'guide' = 'all') => filterFamilies(families, { query, kind }).map((family) => family.id)
    expect(names('najdorf')).toEqual(['defesa-siciliana'])
    expect(names('sistema LONDRES')).toEqual(['sistema-londres'])
    expect(names('c30')).toEqual(['gambito-do-rei'])
    expect(names('', 'gambits')).toEqual(['gambito-do-rei'])
    expect(names('', 'systems')).toEqual(['sistema-londres'])
    expect(names('', 'guide')).not.toContain('abertura-grob')
    expect(names('nada-disso')).toEqual([])
  })

  it('a base inteira carrega, e todas as linhas são legais', async () => {
    const families = await loadFamilies()
    expect(families.length).toBeGreaterThan(100)
    let lines = 0
    for (const family of families) {
      for (const variant of family.variants) {
        const chess = new Chess()
        for (const move of variant.moves) chess.move(move)
        lines += 1
      }
    }
    expect(lines).toBeGreaterThan(3000)
  })
})
