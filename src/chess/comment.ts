import type { AnalyzedMove, AnalyzedPosition } from './analyze'
import { isErrorClass } from './classify'
import { type Color, formatEval } from './evaluation'
import { detectMotifs, explainMotifs } from './motifs'
import { sanToPt, uciToSan } from './notation'

const sideName = (color: Color) => (color === 'w' ? 'As brancas' : 'As pretas')

export interface CommentInput {
  move: AnalyzedMove
  before: AnalyzedPosition
  after: AnalyzedPosition
  previousMove?: AnalyzedMove | null
  /** true quando o lance é do usuário identificado. Muda "este lance" para "seu lance". */
  isUserMove?: boolean
  /** false esconde o melhor lance nos erros, para não estragar o "Tentar de novo". */
  revealBest?: boolean
}

const bestSanPt = (position: AnalyzedPosition) => {
  const san = uciToSan(position.fen, position.bestUci)
  return san ? sanToPt(san) : null
}

/** Comentário do treinador, gerado por regras. */
export function coachComment({ move, before, after, previousMove, isUserMove, revealBest = true }: CommentInput): string {
  const { cls, color } = move
  const from = formatEval(before.eval)
  const to = formatEval(after.eval)
  const best = bestSanPt(before)
  const reply = bestSanPt(after)
  const moverHadMate = before.eval.kind === 'mate' && before.eval.winner === color
  const moverKeepsMate = after.eval.kind === 'mate' && after.eval.winner === color && after.eval.moves > 0
  const opponentHasMate = after.eval.kind === 'mate' && after.eval.winner !== color && after.eval.moves > 0

  if (after.terminal === 'checkmate') return `Xeque-mate! ${sideName(color)} vencem a partida.`
  if (cls === 'book') return 'Lance de livro: faz parte da teoria de aberturas. A avaliação fica em ' + to + '.'

  const ending = after.terminal === 'stalemate' ? ' A partida termina em afogamento.' : after.terminal === 'draw' ? ' A partida termina empatada.' : ''

  if (cls === 'best') {
    if (moverKeepsMate && after.eval.kind === 'mate') return `O melhor lance: mantém o mate forçado em ${after.eval.moves}.`
    if (opponentHasMate && after.eval.kind === 'mate') return `O melhor lance, mas a posição já estava perdida: o adversário tem mate em ${after.eval.moves}.`
    return `O melhor lance da posição. A avaliação fica em ${to}.${ending}`
  }

  // A perda é pequena porque já não havia o que perder: elogiar o lance seria enganoso.
  if ((cls === 'excellent' || cls === 'good') && opponentHasMate && after.eval.kind === 'mate') {
    const resisted = best ? ` ${best} resistia mais.` : ''
    return `A posição já estava perdida, e agora o adversário tem mate em ${after.eval.moves}${reply ? `, começando com ${reply}` : ''}.${resisted}`
  }

  if (cls === 'excellent') {
    return `Lance muito bom, quase igual ao melhor${best ? ` (${best})` : ''}. A avaliação fica em ${to}.${ending}`
  }

  if (cls === 'good') {
    return `Lance sólido. A avaliação foi de ${from} para ${to}${best ? `, e ${best} era um pouco mais preciso` : ''}.${ending}`
  }

  // Quando os motivos táticos explicam o erro, eles falam no lugar do texto genérico.
  if (isErrorClass(cls)) {
    const explanation = explainMotifs(
      detectMotifs({
        color,
        uci: move.uci,
        beforeFen: before.fen,
        afterFen: after.fen,
        beforeEval: before.eval,
        afterEval: after.eval,
        bestUci: before.bestUci,
        beforePv: before.pvUci,
        afterPv: after.pvUci,
      }),
      { color, isUser: isUserMove, revealBest },
    )
    if (explanation) {
      const previous = previousMove ? ` (${sanToPt(previousMove.san)})` : ''
      const intro = cls === 'miss' ? `O adversário errou no lance anterior${previous} e a chance passou. ` : ''
      const mentionsBest = best ? explanation.includes(best) : true
      const closing = revealBest && best && !mentionsBest ? ` O melhor era ${best}.` : ''
      return `${intro}${explanation}${closing}${ending}`
    }
  }

  // Na escala das brancas, um erro delas derruba a avaliação; um erro das pretas a faz subir.
  const change = `A avaliação ${color === 'w' ? 'caiu' : 'foi'} de ${from} para ${to}.`

  const bestSentence = !best
    ? ''
    : moverHadMate && before.eval.kind === 'mate'
      ? ` Havia mate forçado em ${before.eval.moves}${revealBest ? `, começando com ${best}` : ''}.`
      : !revealBest
        ? ''
        : cls === 'inaccuracy'
          ? ` ${best} era mais preciso.`
          : ` O melhor era ${best}.`

  const subject = isUserMove ? 'Depois do seu lance' : 'Depois deste lance'
  const replySentence =
    cls === 'inaccuracy' || !reply
      ? ''
      : opponentHasMate && after.eval.kind === 'mate'
        ? ` ${subject}, o adversário tem mate em ${after.eval.moves}, começando com ${reply}.`
        : ` ${subject}, o adversário tem ${reply}.`

  if (cls === 'miss') {
    const previous = previousMove ? ` (${sanToPt(previousMove.san)})` : ''
    return `O adversário errou no lance anterior${previous} e a chance passou. ${change}${bestSentence}${replySentence}${ending}`
  }

  return `${change}${bestSentence}${replySentence}${ending}`
}

/** Mensagem do card quando ainda não há lance: a posição inicial. */
export function startComment(position: AnalyzedPosition): string {
  const best = bestSanPt(position)
  return `Posição inicial, avaliada em ${formatEval(position.eval)}.${best ? ` O motor começaria com ${best}.` : ''} Use as setas para acompanhar a partida.`
}
