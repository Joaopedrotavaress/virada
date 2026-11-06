import { Chess } from 'chess.js'
import type { PieceSymbol } from 'chess.js'
import type { Frame } from '../guide/aulas'
import { lessonById } from '../guide/lessons'

/** Onde a pessoa disse que quer começar. */
export const START_KEY = 'aprender-inicio'

export interface Unit {
  title: string
  lessons: string[]
}

export interface Level {
  id: string
  title: string
  /** O título ganho ao terminar o nível anterior: quem começa é peão e termina dama. */
  rank: string
  piece: PieceSymbol
  /** Para quem é. Aparece na escolha do ponto de partida. */
  forWhom: string
  /** O que muda ao terminar. */
  goal: string
  units: Unit[]
}

export const LEVELS: Level[] = [
  {
    id: 'iniciante',
    title: 'Iniciante',
    rank: 'Peão',
    piece: 'p',
    forWhom: 'Nunca joguei, ou ainda confundo as regras.',
    goal: 'Saber jogar uma partida inteira e dar os primeiros mates.',
    units: [
      { title: 'As peças', lessons: ['torre-bispo', 'dama-rei', 'cavalo', 'peao'] },
      { title: 'As regras', lessons: ['captura-valor', 'xeque', 'mate-e-afogamento', 'lances-especiais'] },
      { title: 'Os primeiros mates', lessons: ['mate-do-pastor', 'mate-do-corredor'] },
    ],
  },
  {
    id: 'basico',
    title: 'Básico',
    rank: 'Cavalo',
    piece: 'n',
    forWhom: 'Sei as regras, mas perco peças sem ver.',
    goal: 'Parar de entregar peças e fechar as partidas ganhas.',
    units: [
      { title: 'Não entregue nada', lessons: ['peca-solta'] },
      { title: 'Abrir bem', lessons: ['principios-abertura'] },
      { title: 'As primeiras táticas', lessons: ['garfo', 'cravada', 'espeto'] },
      { title: 'Mates que você precisa saber', lessons: ['dama-e-rei', 'mate-de-escada', 'torre-e-rei'] },
    ],
  },
  {
    id: 'intermediario',
    title: 'Intermediário',
    rank: 'Torre',
    piece: 'r',
    forWhom: 'Vejo táticas simples e quero enxergar além.',
    goal: 'Criar ameaças em série, jogar finais simples e ter um plano.',
    units: [
      { title: 'Táticas que combinam', lessons: ['ataque-descoberto', 'xeque-duplo', 'desvio', 'atracao', 'lance-intermediario'] },
      { title: 'Mates com as peças juntas', lessons: ['mate-apoiado', 'mate-sufocado'] },
      { title: 'Finais de peões', lessons: ['quadrado-do-peao', 'oposicao', 'peao-passado'] },
      { title: 'O plano', lessons: ['plano-meio-jogo', 'estrutura-peoes'] },
    ],
  },
  {
    id: 'avancado',
    title: 'Avançado',
    rank: 'Dama',
    piece: 'q',
    forWhom: 'Quero técnica de finais, cálculo e um repertório.',
    goal: 'Calcular de verdade e estudar por conta própria.',
    units: [
      { title: 'Finais de torre', lessons: ['lucena', 'philidor'] },
      { title: 'Calcular', lessons: ['calculo', 'sacrificio'] },
      { title: 'Estudar sozinho', lessons: ['revisar-partidas', 'seu-repertorio'] },
    ],
  },
]

export const lessonsOfLevel = (level: Level) => level.units.flatMap((unit) => unit.lessons)
export const allRoadmapLessons = () => LEVELS.flatMap(lessonsOfLevel)

export interface LevelProgress {
  level: Level
  done: number
  total: number
  complete: boolean
  /** Antes do ponto de partida escolhido: não entra na conta. */
  skipped: boolean
}

export interface RoadmapProgress {
  levels: LevelProgress[]
  done: number
  total: number
  /** A próxima aula, na ordem, a partir do ponto de partida. */
  next: string | null
  /** O nível da próxima aula. */
  currentLevel: Level
  /** O título da pessoa: o nível mais alto já alcançado. */
  rank: string
  piece: PieceSymbol
}

export function roadmapProgress(doneIds: string[], startLevel: string | null): RoadmapProgress {
  const done = new Set(doneIds)
  const startIndex = Math.max(0, LEVELS.findIndex((level) => level.id === startLevel))
  const levels = LEVELS.map((level, index): LevelProgress => {
    const ids = lessonsOfLevel(level)
    const count = ids.filter((id) => done.has(id)).length
    return { level, done: count, total: ids.length, complete: count === ids.length, skipped: index < startIndex && count < ids.length }
  })
  const counted = levels.filter((item) => !item.skipped)
  const next = counted.flatMap((item) => lessonsOfLevel(item.level)).find((id) => !done.has(id)) ?? null
  const current = next ? LEVELS.find((level) => lessonsOfLevel(level).includes(next)) : undefined
  const currentLevel = current ?? LEVELS[LEVELS.length - 1]
  return {
    levels,
    done: counted.reduce((sum, item) => sum + item.done, 0),
    total: counted.reduce((sum, item) => sum + item.total, 0),
    next,
    currentLevel,
    rank: currentLevel.rank,
    piece: currentLevel.piece,
  }
}

/** A aula depois desta no roteiro. */
export function lessonAfter(id: string): string | null {
  const ids = allRoadmapLessons()
  const index = ids.indexOf(id)
  return index >= 0 && index + 1 < ids.length ? ids[index + 1] : null
}

export const levelOfLesson = (id: string) => LEVELS.find((level) => lessonsOfLevel(level).includes(id))

export const lessonTitle = (id: string) => lessonById(id)?.title ?? id

export interface FrameStep {
  fen: string
  last: { from: string; to: string } | null
}

/** A posição e o último lance de cada quadro da demonstração. Quadro sem lance nem posição repete o anterior. */
export function framesWithFens(frames: Frame[]): FrameStep[] {
  let fen = ''
  return frames.map((frame) => {
    if (frame.fen) fen = frame.fen
    let last: FrameStep['last'] = null
    if (frame.move) {
      const moved = new Chess(fen).move(frame.move)
      fen = moved.after
      last = { from: moved.from, to: moved.to }
    }
    return { fen, last }
  })
}
