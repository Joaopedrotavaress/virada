import type { AnalyzedMove, AnalyzedPosition } from '../chess/analyze'
import { CLASS_INFO, isErrorClass } from '../chess/classify'
import { coachComment, startComment } from '../chess/comment'
import { formatEval } from '../chess/evaluation'
import { formatLinePt, pvToSan, sanToPt } from '../chess/notation'
import { speechOf } from '../chess/professor'
import { ClassBadge, ClassSymbol } from './ClassBadge'
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
  /** Celular: uma linha de título, texto curto, e os botões ficam na barra fixa de baixo. */
  dense?: boolean
}

export function moveLabel(move: Pick<AnalyzedMove, 'moveNumber' | 'color' | 'san'>) {
  return `${move.moveNumber}${move.color === 'w' ? '.' : '...'} ${sanToPt(move.san)}`
}

/** Até 3 linhas do motor, cada uma com avaliação e 5 lances. */
function LinesList({ fen, bestUci, bestLines, dense = false }: { fen: string; bestUci: string | null; bestLines: BestLines; dense?: boolean }) {
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
    <ol className={`grid ${dense ? 'gap-1' : 'gap-2'}`}>
      {lines.map((line, index) => (
        <li key={`${index}-${line.pvUci[0]}`} className={`flex items-baseline ${dense ? 'gap-2' : 'gap-3'}`}>
          <span className={`tabular shrink-0 text-right font-bold ${dense ? 'w-10 text-xs' : 'w-12 text-sm'}`}>{formatEval(line.eval)}</span>
          <span className={`min-w-0 leading-snug ${dense ? 'text-sm' : 'text-base'}`}>{formatLinePt(fen, pvToSan(fen, line.pvUci, 5))}</span>
        </li>
      ))}
    </ol>
  )
}

export function CoachCard({ move, before, current, previousMove, isUserMove, revealed, bestUci, bestLines, onToggleBest, onRetry, compact = false, moment, onContinue, dense = false }: CoachCardProps) {
  // A linha sempre parte da posição antes do lance: é o que se podia ter jogado.
  const reference = before ?? current
  const comment =
    move && before ? coachComment({ move, before: { ...before, bestUci }, after: current, previousMove, isUserMove, revealBest: revealed }) : startComment(current)
  const canRetry = Boolean(move && isErrorClass(move.cls))
  const speech = move && before ? speechOf({ move, before, after: current, isUserMove }) : null

  if (dense) {
    return (
      <section aria-label="Comentário do treinador" aria-live={compact ? 'off' : 'polite'} className="rounded-md bg-surface p-3">
        {moment && (
          <p className="mb-1.5 text-xs text-muted">
            Momento {moment.index} de {moment.total}
            {move && moment.title !== CLASS_INFO[move.cls].label ? `: ${moment.title}` : ''}
          </p>
        )}
        <div className="flex items-center gap-2">
          {move && <ClassBadge cls={move.cls} className="size-7 shrink-0" />}
          <h2 className="min-w-0 truncate text-base leading-tight">
            <span className="font-bold" style={move ? { color: `var(--text-${move.cls})` } : undefined}>
              {move ? CLASS_INFO[move.cls].label : 'Início da partida'}
            </span>
            {move && <span className="ml-1.5 text-sm">{moveLabel(move)}</span>}
          </h2>
          <p className="tabular ml-auto shrink-0 rounded-sm bg-sunken px-1.5 py-0.5 text-xs font-semibold">
            {before ? `${formatEval(before.eval)} → ${formatEval(current.eval)}` : formatEval(current.eval)}
          </p>
        </div>
        {!compact && moment?.note && <p className="mt-1.5 text-xs text-muted">{moment.note}</p>}
        {!compact && (
          <p className="mt-1.5 text-sm leading-snug">
            {speech?.opener && <span className="font-semibold">{speech.opener} </span>}
            {comment}
          </p>
        )}
        {!compact && speech?.lesson && !revealed && <p className="mt-1.5 text-sm leading-snug text-muted italic">{speech.lesson}</p>}
        {!compact && revealed && reference.bestUci && (
          <div className="mt-2 border-t border-line pt-2">
            <LinesList fen={reference.fen} bestUci={bestUci} bestLines={bestLines} dense />
          </div>
        )}
      </section>
    )
  }

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

      {!compact && (
        <p className="mt-3 max-w-prose text-base leading-relaxed">
          {speech?.opener && <span className="font-semibold">{speech.opener} </span>}
          {comment}
        </p>
      )}
      {!compact && speech?.lesson && <p className="mt-2 max-w-prose text-base leading-relaxed text-muted italic">{speech.lesson}</p>}

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
