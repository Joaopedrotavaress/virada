import type { AnalyzedMove, AnalyzedPosition } from './analyze'
import { type MoveClass, isErrorClass } from './classify'
import { detectMotifs, type Motif } from './motifs'

/**
 * Seu Nonato, o professor: um velho de boteco que joga xadrez no bar há décadas.
 * Ele chama todo mundo de "chefia". A fala dele só abre e fecha o comentário: quem diz
 * o que aconteceu na posição continua sendo o Stockfish, em comment.ts.
 */
export const PROFESSOR_NAME = 'Seu Nonato'

export type Mood = 'feliz' | 'neutro' | 'bravo' | 'espantado'

const MOODS: Record<MoveClass, Mood> = {
  brilliant: 'espantado',
  best: 'feliz',
  excellent: 'feliz',
  good: 'neutro',
  book: 'neutro',
  inaccuracy: 'bravo',
  mistake: 'bravo',
  miss: 'bravo',
  blunder: 'espantado',
}

const MINE: Record<MoveClass, string[]> = {
  brilliant: ['Eita, chefia! Esse eu vou contar na mesa a semana inteira.', 'Para tudo e chama o dono do bar, chefia!', 'Em cinquenta anos de boteco, vi pouco lance assim.'],
  best: ['Isso, chefia.', 'É esse mesmo.', 'Nem eu jogava melhor, chefia.', 'Aí sim.'],
  excellent: ['Boa, chefia.', 'Gostei de ver.', 'Tá jogando, hein?'],
  good: ['Dá pro gasto, chefia.', 'Não é o prato do dia, mas enche a barriga.'],
  book: ['Isso aí até o dono do bar sabe.', 'Começou certinho, chefia.'],
  inaccuracy: ['Hmm, chefia. Dava pra mais.', 'Passou raspando.'],
  mistake: ['Ih, chefia.', 'Aí complicou.', 'Pensa comigo, chefia.'],
  miss: ['Ô, chefia, deixou passar!', 'Tava no balcão, chefia, era só pegar.'],
  blunder: ['Vixe, chefia!', 'Essa vai pra conta, chefia.', 'Ai, ai, ai.'],
}

const OTHER: Record<MoveClass, string[]> = {
  brilliant: ['Olha isso, chefia! Esse lance vale a conta de hoje.'],
  best: ['Esse acertou.', 'Lance de quem sabe.'],
  excellent: ['Bem jogado.'],
  good: ['Dá pro gasto.'],
  book: ['Coisa de livro.'],
  inaccuracy: ['Dava pra mais aí.'],
  mistake: ['Olha o vacilo, chefia.'],
  miss: ['Deixou passar, chefia.'],
  blunder: ['Vixe! Olha o presente, chefia.'],
}

const LESSONS: Record<Motif['kind'], string> = {
  hanging: 'Regra do balcão: antes de soltar a peça, olha quem ficou sem proteção.',
  material: 'Antes de jogar, faz a conta: quem ataca, quem defende e quanto sobra.',
  fork: 'Garfo se evita olhando para onde a peça do outro pode pular no próximo lance.',
  pin: 'Peça cravada defende mal. Não conta muito com ela.',
  'allowed-mate': 'Antes de qualquer lance, olha os xeques do outro. Primeiro o rei, depois o resto.',
  'missed-mate': 'Com o rei do outro apertado, procura primeiro os xeques e as capturas.',
  'missed-capture': 'Antes de decidir, olha todas as capturas e com qual peça vale pegar.',
}

const GENERAL_LESSON = 'Antes de soltar a peça, pergunta: o que o outro quer fazer agora?'
const PRECISION_LESSON = 'Sem pressa: compara dois lances antes de escolher.'
const SACRIFICE_LESSON = 'Sacrifício bom é assim: você paga agora porque já viu o troco.'

export const GREETING = `Senta aí, chefia. Eu sou o ${PROFESSOR_NAME} e jogo xadrez neste bar desde antes de você nascer. Vamos ver essa partida.`
export const FAREWELL = 'Fechou a conta, chefia. Olha o que eu levaria dessa partida.'

/** A mesma posição sempre recebe a mesma frase: o texto não muda enquanto a pessoa olha. */
const pick = (options: string[], seed: number) => options[seed % options.length]

/** A lição geral de um erro. Nunca cita lance da posição, para não estragar o "Tentar de novo". */
export function lessonOf(motifs: Motif[]): string {
  return motifs.length > 0 ? LESSONS[motifs[0].kind] : GENERAL_LESSON
}

export interface SpeechInput {
  move: AnalyzedMove
  before: AnalyzedPosition
  after: AnalyzedPosition
  isUserMove?: boolean
}

export interface Speech {
  opener: string | null
  lesson: string | null
  mood: Mood
}

/** O que o professor acrescenta ao comentário de um lance. */
export function speechOf({ move, before, after, isUserMove = false }: SpeechInput): Speech {
  const { cls, color, ply } = move
  const opponentHasMate = after.eval.kind === 'mate' && after.eval.winner !== color && after.eval.moves > 0

  if (after.terminal === 'checkmate') {
    return { opener: isUserMove ? 'Fecha a conta, chefia!' : 'Acabou, chefia. Amanhã tem revanche.', lesson: null, mood: isUserMove ? 'feliz' : 'neutro' }
  }
  // Numa posição já perdida, festa seria mentira.
  if (opponentHasMate && !isErrorClass(cls)) return { opener: null, lesson: null, mood: 'neutro' }

  const opener = pick((isUserMove ? MINE : OTHER)[cls], ply)
  if (cls === 'brilliant') return { opener, lesson: SACRIFICE_LESSON, mood: MOODS[cls] }
  if (!isErrorClass(cls)) return { opener, lesson: null, mood: MOODS[cls] }

  const motifs = detectMotifs({
    color,
    uci: move.uci,
    beforeFen: before.fen,
    afterFen: after.fen,
    beforeEval: before.eval,
    afterEval: after.eval,
    bestUci: before.bestUci,
    beforePv: before.pvUci,
    afterPv: after.pvUci,
  })
  const lesson = motifs.length === 0 && cls === 'inaccuracy' ? PRECISION_LESSON : lessonOf(motifs)
  return { opener, lesson, mood: MOODS[cls] }
}

export const moodOf = (cls: MoveClass | null | undefined): Mood => (cls ? MOODS[cls] : 'neutro')
