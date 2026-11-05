import type { AnalyzedMove, AnalyzedPosition } from '../chess/analyze'
import { CLASS_INFO, isErrorClass } from '../chess/classify'
import { coachComment, startComment } from '../chess/comment'
import { formatEval } from '../chess/evaluation'
import { formatLinePt, pvToSan, sanToPt } from '../chess/notation'
import { ClassSymbol } from './ClassBadge'
import type { BestLines } from './useBestLines'

interface CoachCardProps {
  move: AnalyzedMove | null
  before: AnalyzedPosition | null
  current: AnalyzedPosition
  previousMove: AnalyzedMove | null
  isUserMove: boolean
  /** Verdadeiro depois de "Mostrar melhor". */
  revealed: boolean
  /** O melhor lance a mostrar: o da análise ou, com as linhas abertas, o da primeira linha. */
  bestUci: string | null
  bestLines: BestLines
  onToggleBest: () => void
  onRetry: () => void
  /** Revisão correndo: só o essencial, para o texto não ficar pulando. */
  compact?: boolean
  /** Parada num momento-chave da revisão. */
  moment?: { title: string; note: string | null; index: number; total: number } | null
  /** Retoma a revisão. */
  onContinue?: () => void
}

export function moveLabel(move: Pick<AnalyzedMove, 'moveNumber' | 'color' | 'san'>) {
  return `${move.moveNumber}${move.color === 'w' ? '.' : '...'} ${sanToPt(move.san)}`
}

/** Até 3 linhas do motor, cada uma com avaliação e 5 lances. */
function LinesList({ fen, bestUci, bestLines }: { fen: string; bestUci: string | null; bestLines: BestLines }) {
  if (bestLines.error) {
    return (
      <p role="alert" className="text-sm font-medium text-(--text-blunder)">
        {bestLines.error}
      </p>
    )
  }
  if (!bestLines.lines) return <p className="text-sm text-muted">Calculando as melhores linhas…</p>
  // Quem o card aponta como melhor vai primeiro, para o texto e a lista não se contradizerem.
  const lines = [...bestLines.lines].sort((a, b) => Number(b.pvUci[0] === bestUci) - Number(a.pvUci[0] === bestUci))
  return (
    <ol className="grid gap-2">
      {lines.map((line, index) => (
        <li key={`${index}-${line.pvUci[0]}`} className="flex items-baseline gap-3">
          <span className="tabular w-12 shrink-0 text-right text-sm font-bold">{formatEval(line.eval)}</span>
          <span className="min-w-0 text-base leading-snug">{formatLinePt(fen, pvToSan(fen, line.pvUci, 5))}</span>
        </li>
      ))}
    </ol>
  )
}

export function CoachCard({ move, before, current, previousMove, isUserMove, revealed, bestUci, bestLines, onToggleBest, onRetry, compact = false, moment, onContinue }: CoachCardProps) {
  // A linha sempre parte da posição antes do lance: é o que se podia ter jogado.
  const reference = before ?? current
  const comment =
    move && before ? coachComment({ move, before: { ...before, bestUci }, after: current, previousMove, isUserMove, revealBest: revealed }) : startComment(current)
  const canRetry = Boolean(move && isErrorClass(move.cls))

  return (
    <section aria-label="Comentário do treinador" aria-live={compact ? 'off' : 'polite'} className="rounded-md bg-surface p-4 sm:p-5">
      {moment && (
        <div className="mb-3 border-b border-line pb-2">
          <p className="text-sm text-muted">
            Momento {moment.index} de {moment.total}
          </p>
          {/* Se o título só repete a classificação logo abaixo, ele sai. */}
          {move && moment.title !== CLASS_INFO[move.cls].label && <p className="font-display text-xl leading-tight font-semibold">{moment.title}</p>}
          {moment.note && <p className="mt-1 text-sm">{moment.note}</p>}
        </div>
      )}
      <div className="flex items-start gap-4">
        {move && (
          <span aria-hidden="true" className="font-display min-w-14 text-center text-6xl leading-none font-bold" style={{ color: `var(--text-${move.cls})` }}>
            <ClassSymbol cls={move.cls} iconClassName="mx-auto size-14" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-lg leading-snug font-bold" style={move ? { color: `var(--text-${move.cls})` } : undefined}>
            {move ? CLASS_INFO[move.cls].label : 'Início da partida'}
          </h2>
          {move && <p className="text-lg leading-snug">{moveLabel(move)}</p>}
          <p className="tabular mt-0.5 text-sm text-muted">
            {before ? (
              <>
                {formatEval(before.eval)} <span aria-label="para">→</span> {formatEval(current.eval)}
              </>
            ) : (
              formatEval(current.eval)
            )}
          </p>
        </div>
      </div>

      {!compact && <p className="mt-3 max-w-prose text-base leading-relaxed">{comment}</p>}

      {!compact && onContinue && (
        <button type="button" onClick={onContinue} className="mt-3 min-h-12 w-full rounded-md bg-action px-4 font-semibold text-on-action">
          Continuar revisão
        </button>
      )}

      {!compact && reference.bestUci && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleBest}
            aria-expanded={revealed}
            className={`min-h-11 flex-1 rounded-md px-4 font-semibold whitespace-nowrap ${revealed || canRetry || onContinue ? 'border border-line hover:bg-sunken' : 'bg-action text-on-action'}`}
          >
            {revealed ? 'Esconder melhor' : 'Mostrar melhor'}
          </button>
          {canRetry && (
            <button type="button" onClick={onRetry} className={`min-h-11 flex-1 rounded-md px-4 font-semibold whitespace-nowrap ${onContinue ? 'border border-line hover:bg-sunken' : 'bg-action text-on-action'}`}>
              Tentar de novo
            </button>
          )}
        </div>
      )}

      {!compact && revealed && reference.bestUci && (
        <div className="mt-3 border-t border-line pt-3">
          <h3 className="mb-2 text-sm text-muted">Melhores linhas</h3>
          <LinesList fen={reference.fen} bestUci={bestUci} bestLines={bestLines} />
        </div>
      )}
    </section>
  )
}
