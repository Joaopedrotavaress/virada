import type { Color, Eval } from './evaluation'

/**
 * Pontos esperados: de 0 (derrota certa) a 1 (vitória certa), com o empate valendo meio ponto.
 *
 * O Chess.com diz publicamente que julga os lances assim e que a conta depende do rating, mas não publica a curva.
 * A curva daqui foi medida em partidas reais do Lichess (scripts/medir-pontos-esperados.mjs): para cada faixa de rating,
 * quantos pontos as brancas fizeram a partir de cada avaliação. Ver docs/classificacao.md.
 */

/** Sem rating no PGN, usa o meio da escala. */
export const DEFAULT_RATING = 1500

/** Inclinação da curva medida em cada faixa: quanto mais forte o jogador, mais a vantagem vira ponto. */
const SLOPES: [rating: number, slope: number][] = [
  [700, 0.00175],
  [900, 0.00205],
  [1100, 0.00235],
  [1300, 0.0026],
  [1500, 0.00285],
  [1700, 0.0031],
  [1900, 0.00335],
  [2100, 0.00345],
  [2350, 0.0035],
]

/**
 * A curva foi medida no Lichess, cuja escala fica acima da do Chess.com. Distância estimada pela comparação
 * pública do ChessGoals entre o rapid do Chess.com e o blitz do Lichess, com cerca de 2 mil perfis.
 */
export function toModelRating(rating: number, fromChessCom: boolean): number {
  if (!fromChessCom) return rating
  if (rating <= 1100) return rating + 200
  if (rating >= 1700) return rating + 90
  return rating + 200 - ((rating - 1100) * 110) / 600
}

/** A partir daqui, mais vantagem não muda o julgamento: +15 e +25 são a mesma partida ganha. */
const DECISIVE_CP = 1000

export function slopeFor(rating: number): number {
  if (rating <= SLOPES[0][0]) return SLOPES[0][1]
  for (let index = 1; index < SLOPES.length; index += 1) {
    const [top, topSlope] = SLOPES[index]
    if (rating <= top) {
      const [bottom, bottomSlope] = SLOPES[index - 1]
      return bottomSlope + ((topSlope - bottomSlope) * (rating - bottom)) / (top - bottom)
    }
  }
  return SLOPES[SLOPES.length - 1][1]
}

/** Pontos esperados das brancas. Um mate vale o teto da curva, para que +8 não pareça uma catástrofe perto de um mate em 9. */
function whitePoints(evaluation: Eval, rating: number): number {
  const cp = evaluation.kind === 'mate' ? (evaluation.winner === 'w' ? DECISIVE_CP : -DECISIVE_CP) : Math.max(-DECISIVE_CP, Math.min(DECISIVE_CP, evaluation.cp))
  return 1 / (1 + Math.exp(-slopeFor(rating) * cp))
}

export function expectedPoints(evaluation: Eval, color: Color, rating: number = DEFAULT_RATING): number {
  if (evaluation.kind === 'mate' && evaluation.moves === 0) return evaluation.winner === color ? 1 : 0
  const white = whitePoints(evaluation, rating)
  return color === 'w' ? white : 1 - white
}

/** Os três estados que o Chess.com cita ao explicar o "!" e a Chance perdida. Como saem dos pontos esperados, variam com o rating. */
export type Standing = 'losing' | 'equal' | 'winning'

const WINNING_POINTS = 0.7
const LOSING_POINTS = 0.3

export function standingOf(points: number): Standing {
  if (points >= WINNING_POINTS) return 'winning'
  return points <= LOSING_POINTS ? 'losing' : 'equal'
}

export const isWinning = (points: number) => points >= WINNING_POINTS
