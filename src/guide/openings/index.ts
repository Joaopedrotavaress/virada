import type { OpeningGuide } from '../types'
import { ABERTAS } from './abertas'
import { FECHADAS } from './fechadas'
import { FLANCO } from './flanco'
import { INDIAS } from './indias'
import { SEMIABERTAS } from './semiabertas'

export const OPENING_GUIDES: OpeningGuide[] = [...ABERTAS, ...SEMIABERTAS, ...FECHADAS, ...INDIAS, ...FLANCO]

export const guideBySlug = (slug: string) => OPENING_GUIDES.find((guide) => guide.slug === slug)

export const splitSans = (sans: string) => sans.split(/\s+/).filter(Boolean)

const GUIDE_ROOTS = OPENING_GUIDES.map((guide) => ({ guide, moves: splitSans(guide.root) })).sort((a, b) => b.moves.length - a.moves.length)

/** O guia que mais fundo acompanha estes lances. Sem nenhum, a partida fica fora do guia. */
export function guideForMoves(sans: string[]): OpeningGuide | null {
  for (const { guide, moves } of GUIDE_ROOTS) {
    if (moves.length <= sans.length && moves.every((move, index) => move === sans[index])) return guide
  }
  return null
}
