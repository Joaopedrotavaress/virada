import type { Color } from '../chess/evaluation'

export type GuideGroup = 'abertas' | 'semiabertas' | 'fechadas' | 'indias' | 'flanco'

export const GROUP_LABEL: Record<GuideGroup, { title: string; moves: string }> = {
  abertas: { title: 'Jogos abertos', moves: '1.e4 e5' },
  semiabertas: { title: 'Defesas contra 1.e4', moves: '1.e4 sem 1...e5' },
  fechadas: { title: 'Jogos fechados', moves: '1.d4 d5, e sistemas de 1.d4' },
  indias: { title: 'Defesas índias e contra 1.d4', moves: '1.d4 Cf6 e outras' },
  flanco: { title: 'Aberturas de flanco', moves: '1.c4, 1.Cf3, 1.f4' },
}

export interface GuideLine {
  name: string
  /** Lances em notação internacional, separados por espaço. Conferidos pelos testes. */
  sans: string
  note: string
  /** Linha de gambito ou muito aguda: o teste aceita mais desequilíbrio. */
  sharp?: boolean
}

export interface GuideTrap {
  name: string
  sans: string
  /** Quem se dá bem no final da armadilha. */
  who: Color
  /** Índice do lance que cai na armadilha (0 = primeiro lance). */
  errorAt: number
  text: string
  /** Vantagem mínima esperada, em chance de vitória, quando a armadilha dá vantagem sem decidir a partida. */
  minWin?: number
}

export interface OpeningGuide {
  slug: string
  name: string
  eco: string
  group: GuideGroup
  /** A cor de quem escolhe esta abertura: é com ela que se pratica. */
  side: Color
  level: 'iniciante' | 'intermediário' | 'avançado'
  /** Lances que definem a abertura. Partidas que começam assim contam como dela. */
  root: string
  summary: string
  ideas: string[]
  plans: { white: string[]; black: string[] }
  lines: GuideLine[]
  traps: GuideTrap[]
  mistakes: string[]
}
