import type { AnalyzedMove, AnalyzedPosition } from '../chess/analyze'
import { CLASS_INFO } from '../chess/classify'
import { type Color, formatEval } from '../chess/evaluation'
import { detectMotifs, explainMotifs } from '../chess/motifs'
import { formatLinePt, pvToSan, sanToPt, uciToSan } from '../chess/notation'
import { moveLabel } from './CoachCard'
import type { RetryState } from './useRetry'

interface RetryPanelProps {
  retry: RetryState
  move: AnalyzedMove
  before: AnalyzedPosition
  onAgain: () => void
  onReveal: () => void
  onExit: () => void
  isUser?: boolean
}

const primary = 'min-h-11 rounded-md bg-ink px-4 font-semibold text-bg'
const secondary = 'min-h-11 rounded-md border border-line px-4 font-semibold hover:bg-sunken'

export function RetryPanel({ retry, move, before, onAgain, onReveal, onExit, isUser }: RetryPanelProps) {
  const best = sanToPt(uciToSan(before.fen, before.bestUci) ?? '')
  const line = pvToSan(before.fen, before.pvUci, 6)
  const tried = retry.tried ? sanToPt(retry.tried.san) : ''
  const color = before.fen.split(' ')[1] as Color
  const explanation =
    retry.phase === 'wrong' && retry.tried && retry.after
      ? explainMotifs(
          detectMotifs({
            color,
            uci: retry.tried.uci,
            beforeFen: before.fen,
            afterFen: retry.tried.fen,
            beforeEval: before.eval,
            afterEval: retry.after.eval,
            bestUci: before.bestUci,
            beforePv: before.pvUci,
            afterPv: retry.after.pvUci,
          }),
          { color, isUser, revealBest: false },
        )
      : null

  return (
    <section aria-label="Tentar de novo" aria-live="polite" className="rounded-md bg-surface p-4 sm:p-5">
      {retry.phase === 'playing' && (
        <>
          <h2 className="text-lg font-bold">Sua vez de novo</h2>
          <p className="font-book mt-1 max-w-prose text-base leading-relaxed">Na partida saiu {moveLabel(move)}. Procure um lance melhor e jogue no tabuleiro.</p>
          {retry.error && (
            <p role="alert" className="mt-2 text-sm font-medium text-(--text-blunder)">
              {retry.error}
            </p>
          )}
        </>
      )}

      {retry.phase === 'evaluating' && (
        <>
          <h2 className="text-lg font-bold">{tried}</h2>
          <p className="mt-1 text-sm text-muted">O Stockfish está avaliando seu lance…</p>
        </>
      )}

      {retry.phase === 'found' && (
        <>
          <p className="font-book text-5xl leading-none font-bold text-(--text-best)">Achou!</p>
          <p className="font-book mt-3 max-w-prose text-base leading-relaxed">
            {retry.cls === 'best' ? `${tried} é o melhor lance da posição.` : `${tried} é quase tão bom quanto o melhor, ${best}.`}
            {retry.after ? ` A avaliação fica em ${formatEval(retry.after.eval)}.` : ''}
          </p>
        </>
      )}

      {retry.phase === 'wrong' && retry.cls && retry.after && (
        <>
          <h2 className="text-lg font-bold" style={{ color: `var(--text-${retry.cls})` }}>
            Esse lance seria: {CLASS_INFO[retry.cls].label} ({formatEval(retry.after.eval)})
          </h2>
          <p className="font-book mt-1 max-w-prose text-base leading-relaxed">{explanation ?? `${tried} ainda não é o que a posição pede.`}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onAgain} className={primary}>
              Tentar mais uma vez
            </button>
            <button type="button" onClick={onReveal} className={secondary}>
              Ver a resposta
            </button>
          </div>
        </>
      )}

      {retry.phase === 'answer' && (
        <>
          <h2 className="text-lg font-bold">A resposta era {best}</h2>
          <p className="tabular text-sm text-muted">Avaliação {formatEval(before.eval)}</p>
          {line.length > 1 && <p className="font-book mt-2 text-base leading-relaxed">{formatLinePt(before.fen, line)}</p>}
        </>
      )}

      <button type="button" onClick={onExit} className={`${secondary} mt-3 w-full`}>
        Voltar à partida
      </button>
    </section>
  )
}
