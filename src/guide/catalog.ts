import { OPENING_GUIDES, splitSans } from './openings'
import type { OpeningGuide } from './types'

export type CatalogLine = [eco: string, name: string, moves: string]

export interface CatalogVariant {
  eco: string
  name: string
  moves: string[]
}

export type FamilyGroup = 'e4-e5' | 'e4-outras' | 'd4-d5' | 'd4-indias' | 'flanco'

export const FAMILY_GROUPS: { id: FamilyGroup; title: string }[] = [
  { id: 'e4-e5', title: '1.e4 e5' },
  { id: 'e4-outras', title: 'Outras respostas a 1.e4' },
  { id: 'd4-d5', title: '1.d4 d5' },
  { id: 'd4-indias', title: 'Outras respostas a 1.d4' },
  { id: 'flanco', title: 'Flanco e outros primeiros lances' },
]

export interface OpeningFamily {
  id: string
  name: string
  group: FamilyGroup
  eco: string
  variants: CatalogVariant[]
  isGambit: boolean
  isSystem: boolean
  guide: OpeningGuide | null
}

const SYSTEM_WORDS = /Sistema|Ataque (Torre|Trompowsky|Índio|Índio do Rei)|Colle|Londres|Stonewall/
const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

// A base mantém em inglês os nomes de muitas variantes. Quem procura em português também precisa achar.
const SYNONYMS: Record<string, string> = {
  dragao: 'dragon',
  espanhola: 'ruy lopez',
  filidor: 'philidor',
  eslava: 'slav',
  semieslava: 'semi-slav',
  india: 'indian',
  catala: 'catal',
  inglesa: 'english',
  holandesa: 'dutch',
  escocesa: 'scotch',
  vienense: 'vienna',
  gambito: 'gambit',
  variante: 'variation',
  avanco: 'advance',
  trocas: 'exchange',
  classica: 'classical',
  ataque: 'attack',
  defesa: 'defense',
}

const matchesWord = (haystack: string, word: string) => haystack.includes(word) || (SYNONYMS[word] !== undefined && haystack.includes(SYNONYMS[word]))

const groupOf = (moves: string[]): FamilyGroup => {
  if (moves[0] === 'e4') return moves[1] === 'e5' ? 'e4-e5' : 'e4-outras'
  if (moves[0] === 'd4') return moves[1] === 'd5' ? 'd4-d5' : 'd4-indias'
  return 'flanco'
}

export const familyOf = (name: string) => name.split(/[:,]/)[0].trim()
export const familyId = (name: string) => normalize(familyOf(name)).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** A família mais específica para o guia: as linhas começam pelo mesmo caminho. */
function guideForFamily(moves: string[]): OpeningGuide | null {
  let best: OpeningGuide | null = null
  let bestLength = 0
  for (const guide of OPENING_GUIDES) {
    const root = splitSans(guide.root)
    if (root.length > moves.length || root.length <= bestLength) continue
    if (root.every((move, index) => moves[index] === move)) {
      best = guide
      bestLength = root.length
    }
  }
  return best
}

/** Agrupa todas as linhas da base por família, com o caminho mais curto de cada uma primeiro. */
export function buildFamilies(lines: CatalogLine[]): OpeningFamily[] {
  const groups = new Map<string, CatalogVariant[]>()
  for (const [eco, name, moves] of lines) {
    const id = familyId(name)
    const list = groups.get(id) ?? []
    list.push({ eco, name, moves: splitSans(moves) })
    groups.set(id, list)
  }
  const families: OpeningFamily[] = []
  for (const [id, variants] of groups) {
    variants.sort((a, b) => a.moves.length - b.moves.length || a.name.localeCompare(b.name, 'pt-BR'))
    const first = variants[0]
    const name = familyOf(first.name)
    families.push({
      id,
      name,
      group: groupOf(first.moves),
      eco: first.eco,
      variants,
      isGambit: /gambit/i.test(name),
      isSystem: SYSTEM_WORDS.test(name),
      guide: guideForFamily(first.moves),
    })
  }
  return families.sort((a, b) => b.variants.length - a.variants.length)
}

export interface CatalogFilters {
  query: string
  kind: 'all' | 'gambits' | 'systems' | 'guide'
}

/** Procura pelo nome da família, das variantes e pelo código ECO, sem ligar para acento. */
export function filterFamilies(families: OpeningFamily[], { query, kind }: CatalogFilters): OpeningFamily[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  return families.filter((family) => {
    if (kind === 'gambits' && !family.isGambit) return false
    if (kind === 'systems' && !family.isSystem) return false
    if (kind === 'guide' && !family.guide) return false
    if (words.length === 0) return true
    const haystack = normalize([family.name, family.eco, ...family.variants.map((variant) => `${variant.name} ${variant.eco}`)].join(' '))
    return words.every((word) => matchesWord(haystack, word))
  })
}

/** Aberturas com texto cujo nome combina com a busca. */
export function filterGuides(query: string): OpeningGuide[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  return OPENING_GUIDES.filter((guide) => {
    const haystack = normalize(`${guide.name} ${guide.eco}`)
    return words.every((word) => matchesWord(haystack, word))
  })
}

let cached: Promise<OpeningFamily[]> | null = null

/** A base é grande: só carrega quando a pessoa abre o guia. */
export function loadFamilies(): Promise<OpeningFamily[]> {
  cached ??= import('./catalog.generated.json').then((module) => buildFamilies(module.default as CatalogLine[]))
  return cached
}
