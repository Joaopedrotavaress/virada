import type { AnalyzedMove } from '../chess/analyze'
import { type KeyMoment, REVIEW_SPEEDS, type ReviewSpeedId } from '../chess/review'
import { ClassSymbol } from './ClassBadge'
import { moveLabel } from './CoachCard'
import type { ReviewStatus } from './useGuidedReview'

function InsightList({ insights }: { insights: string[] }) {
  return (
    <ul className="grid max-w-prose gap-2 text-base leading-relaxed">
      {insights.map((insight) => (
        <li key={insight}>{insight}</li>
      ))}
    </ul>
  )
}

function MomentLinks({ moments, moves, onJump }: { moments: KeyMoment[]; moves: AnalyzedMove[]; onJump: (ply: number) => void }) {
  return (
    <ol className="grid gap-0.5">
      {moments.map((moment) => {
        const move = moves[moment.ply - 1]
        return (
          <li key={moment.ply}>
            <button type="button" onClick={() => onJump(moment.ply)} className="flex min-h-11 w-full items-center gap-3 rounded-sm px-1 text-left hover:bg-sunken">
              <span aria-hidden="true" className="font-display flex w-7 shrink-0 justify-center text-lg font-bold" style={{ color: `var(--text-${move.cls})` }}>
                <ClassSymbol cls={move.cls} iconClassName="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{moveLabel(move)}</span>
                <span className="block truncate text-sm text-muted">{moment.title}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

interface IntroProps {
  insights: string[]
  moments: KeyMoment[]
  onStart: () => void
}

/** O que aparece ao abrir a partida: o resumo e o convite para rever. */
export function ReviewIntro({ insights, moments, onStart }: IntroProps) {
  return (
    <section aria-label="Resumo da revisão" className="rounded-md bg-surface p-4 sm:p-5">
      <h2 className="font-display text-2xl leading-tight font-semibold">Como foi a partida</h2>
      <button type="button" onClick={onStart} className="mt-3 min-h-12 w-full rounded-md bg-action px-4 font-semibold text-on-action">
        Começar revisão
      </button>
      <p className="mt-2 text-sm text-muted">
        {moments.length === 0
          ? 'Passa pela partida inteira. Não há nenhum momento crítico para parar.'
          : `Passa pela partida e para em ${moments.length === 1 ? '1 momento decisivo' : `${moments.length} momentos decisivos`}.`}
      </p>
      {insights.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <InsightList insights={insights} />
        </div>
      )}
    </section>
  )
}

interface EndProps {
  insights: string[]
  moments: KeyMoment[]
  moves: AnalyzedMove[]
  result: string
  onJump: (ply: number) => void
  onRestart: () => void
  onExit: () => void
}

/** A conclusão: os pontos principais e o atalho para treinar cada momento. */
export function ReviewEnd({ insights, moments, moves, result, onJump, onRestart, onExit }: EndProps) {
  return (
    <section aria-label="Conclusão da revisão" aria-live="polite" className="rounded-md bg-surface p-4 sm:p-5">
      <h2 className="font-display text-2xl leading-tight font-semibold">Fim da revisão{result !== '*' ? `: ${result}` : ''}</h2>
      {insights.length > 0 && (
        <div className="mt-3">
          <h3 className="mb-1.5 text-sm font-semibold text-muted">Principais pontos</h3>
          <InsightList insights={insights} />
        </div>
      )}
      {moments.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <h3 className="mb-1 text-sm font-semibold text-muted">Rever um momento</h3>
          <MomentLinks moments={moments} moves={moves} onJump={onJump} />
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onRestart} className="min-h-11 flex-1 rounded-md bg-action px-4 font-semibold whitespace-nowrap text-on-action">
          Rever do início
        </button>
        <button type="button" onClick={onExit} className="min-h-11 flex-1 rounded-md border border-line px-4 font-semibold whitespace-nowrap hover:bg-sunken">
          Sair da revisão
        </button>
      </div>
    </section>
  )
}

interface BarProps {
  status: ReviewStatus
  ply: number
  total: number
  moments: KeyMoment[]
  moves: AnalyzedMove[]
  speed: ReviewSpeedId
  hasNext: boolean
  onSpeed: (speed: ReviewSpeedId) => void
  onJump: (ply: number) => void
  onSkip: () => void
  onExit: () => void
}

/** Barra da revisão: onde a pessoa está, onde estão as paradas, a velocidade e o atalho. */
export function ReviewBar({ status, ply, total, moments, moves, speed, hasNext, onSpeed, onJump, onSkip, onExit }: BarProps) {
  const position = total > 0 ? (ply / total) * 100 : 0
  return (
    <div role="group" aria-label="Controles da revisão" className="rounded-md bg-surface px-2.5 pt-3 pb-1.5">
      {/* Trilha da partida: cada marca é uma parada, e dá para ir direto a ela. */}
      <div className="relative mx-2 h-1.5 rounded-full bg-sunken">
        <div className="absolute inset-y-0 left-0 rounded-full bg-action" style={{ width: `${position}%` }} />
        {moments.map((moment) => {
          const move = moves[moment.ply - 1]
          return (
            <button
              key={moment.ply}
              type="button"
              onClick={() => onJump(moment.ply)}
              aria-label={`Ir para ${moveLabel(move)}, ${moment.title}`}
              title={`${moveLabel(move)}: ${moment.title}`}
              className="absolute top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ left: `${(moment.ply / total) * 100}%` }}
            >
              <span className="block size-3 rounded-full border-2 border-surface" style={{ backgroundColor: `var(--fill-${move.cls})` }} />
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <div role="group" aria-label="Velocidade" className="flex shrink-0 overflow-hidden rounded-md border border-line">
          {REVIEW_SPEEDS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={speed === item.id}
              aria-label={`Velocidade ${item.label}`}
              onClick={() => onSpeed(item.id)}
              className={`tabular min-h-9 w-8 text-sm font-semibold ${speed === item.id ? 'bg-action text-on-action' : 'hover:bg-sunken'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onSkip} disabled={status === 'done'} className="min-h-9 min-w-0 flex-1 truncate rounded-md border border-line px-1 text-sm font-semibold hover:bg-sunken disabled:opacity-40">
          {hasNext ? 'Próximo momento' : 'Ir para a conclusão'}
        </button>
        <button type="button" onClick={onExit} aria-label="Sair da revisão" title="Sair da revisão" className="flex size-9 shrink-0 items-center justify-center rounded-md text-xl hover:bg-sunken">
          ×
        </button>
      </div>
    </div>
  )
}
