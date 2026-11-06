import moments from '../data/famous-moments.json'

/**
 * Jogadas de partidas reais, para a animação da tela inicial.
 * Os lances vêm da base PGN Mentor, e o momento de cada partida foi escolhido com o Stockfish.
 */
export interface FamousMoment {
  title: string
  note: string
  number: number
  fen: string
  moves: string[]
  focus: string
  focusAt: number
  orientation: 'white' | 'black'
}

export const FAMOUS_MOMENTS = moments as FamousMoment[]

/** Sorteia uma jogada, sem repetir a que está na tela. */
export function pickMoment(except: number | null = null, random: () => number = Math.random): number {
  const total = FAMOUS_MOMENTS.length
  const index = Math.floor(random() * total)
  return index === except ? (index + 1) % total : index
}

const LINES = ['Olha essa, chefia.', 'Essa eu conto até hoje, chefia.', 'Presta atenção nessa, chefia.', 'Essa é de arrepiar, chefia.', 'Senta aí e vê essa, chefia.']

/** A frase do professor para cada jogada. A mesma jogada sempre recebe a mesma frase. */
export const momentLine = (index: number) => LINES[index % LINES.length]
