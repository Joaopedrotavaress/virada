import { CLASS_INFO, isErrorClass } from '../chess/classify'
import { formatEval } from '../chess/evaluation'
import { detectMotifs, explainMotifs } from '../chess/motifs'
import { sanToPt, uciToSan } from '../chess/notation'
import type { VariantStep } from './useVariant'

interface VariantPanelProps {
  origin: string
  step: VariantStep | null
  isUserColor?: boolean
  error: string | null
  onExit: () => void
}

function terminalText(step: VariantStep) {
  if (step.after?.terminal === 'checkmate') return 'Xeque-mate!'
  if (step.after?.terminal === 'stalemate') return 'Afogamento: a partida empataria.'
  if (step.after?.terminal === 'draw') return 'Empate pelas regras.'
  return null
}

/** Feedback do lance testado: o que ele seria se tivesse sido jogado na partida. */
export function VariantPanel({ origin, step, isUserColor, error, onExit }: VariantPanelProps) {
  const bestSan = step?.before ? uciToSan(step.beforeFen, step.before.bestUci) : null
  const isBest = step?.cls === 'best'
  const explanation =
    step?.cls && isErrorClass(step.cls) && step.before && step.after
      ? explainMotifs(
          detectMotifs({
            color: step.color,
            uci: step.uci,
            beforeFen: step.beforeFen,
            afterFen: step.fen,
            beforeEval: step.before.eval,
            afterEval: step.after.eval,
            bestUci: step.before.bestUci,
            beforePv: step.before.pvUci,
            afterPv: step.after.pvUci,
          }),
          { color: step.color, isUser: isUserColor, revealBest: false },
        )
      : null

  return (
    <section aria-label="Lance testado" aria-live="polite" className="rounded-md bg-surface p-4 sm:p-5">
      {!step && (
        <>
          <h2 className="text-lg font-bold">Testando a partir {origin}</h2>
          <p className="mt-1 text-sm text-muted">Arraste uma peça para ver o que aquele lance seria.</p>
        </>
      )}

      {step && !step.cls && (
        <>
          <h2 className="font-display text-xl font-semibold">{sanToPt(step.san)}</h2>
          <p className="mt-1 text-sm text-muted">O Stockfish está avaliando…</p>
        </>
      )}

      {step?.cls && step.after && (
        <>
          <h2 className="text-lg leading-snug font-bold" style={{ color: `var(--text-${step.cls})` }}>
            Esse lance seria: {CLASS_INFO[step.cls].label} ({formatEval(step.after.eval)})
          </h2>
          <p className="text-lg">{sanToPt(step.san)}</p>
          {terminalText(step) && <p className="mt-1 text-base">{terminalText(step)}</p>}
          {bestSan && !isBest && (
            <p className="mt-2 text-sm text-muted">
              O melhor seria <span className="font-display text-base font-semibold text-ink">{sanToPt(bestSan)}</span>
            </p>
          )}
          {explanation && <p className="mt-2 max-w-prose text-base leading-relaxed">{explanation}</p>}
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-(--text-blunder)">
          {error}
        </p>
      )}

      <button type="button" onClick={onExit} className="mt-3 min-h-11 w-full rounded-md bg-action px-4 font-semibold text-on-action">
        Voltar à partida
      </button>
    </section>
  )
}
