import type { GameAnalysis } from '../chess/analyze'
import { formatOpening } from '../chess/book'
import { CLASS_INFO, MOVE_CLASSES } from '../chess/classify'
import { clockInsights, swingOf } from '../chess/clock'
import type { Color } from '../chess/evaluation'
import { whiteWinPercent } from '../chess/evaluation'
import { ClassBadge } from './ClassBadge'

export const formatPercent = (value: number | null) => (value === null ? '–' : `${value.toFixed(1).replace('.', ',')}%`)

function ClockCard({ analysis, userColor }: { analysis: GameAnalysis; userColor: Color | null }) {
  if (!analysis.clock) return null
  const clock = analysis.clock
  const wins = analysis.positions.map((position) => whiteWinPercent(position.eval))
  const moves = analysis.moves.map((move, index) => ({ color: move.color, moveNumber: move.moveNumber, cls: move.cls, swing: swingOf(wins, index) }))
  const sentences = userColor
    ? clockInsights(moves, clock, userColor, true)
    : [...clockInsights(moves, clock, 'w', false), ...clockInsights(moves, clock, 'b', false)]
  if (sentences.length === 0) return null
  return (
    <section aria-label={userColor ? 'Você e o relógio' : 'O relógio'} className="mt-3 rounded-md bg-surface p-4">
      <h3 className="font-book text-lg font-semibold">{userColor ? 'Você e o relógio' : 'O relógio'}</h3>
      <ul className="font-book mt-1.5 grid max-w-prose gap-1.5 text-base leading-relaxed">
        {sentences.map((sentence) => (
          <li key={sentence}>{sentence}</li>
        ))}
      </ul>
    </section>
  )
}

export function Summary({ analysis, showTitle = true, userColor = null }: { analysis: GameAnalysis; showTitle?: boolean; userColor?: Color | null }) {
  const { summary, white, black } = analysis
  return (
    <section aria-label="Resumo da partida">
      {showTitle && <h2 className="mb-1.5 text-sm font-semibold">Resumo</h2>}
      {analysis.opening && <p className="font-book mb-2 text-base leading-snug">{formatOpening(analysis.opening)}</p>}
      <table className="tabular w-full table-fixed border-collapse overflow-hidden rounded-md bg-surface text-sm">
        <thead>
          <tr>
            <th scope="col" className="w-[50%] p-3 text-left font-normal text-muted">
              Precisão
            </th>
            <th scope="col" className="p-3 pl-0 text-right font-normal">
              <span className="font-book block text-lg leading-none font-semibold whitespace-nowrap">{formatPercent(summary.w.accuracy)}</span>
              <span className="mt-1 block truncate text-xs text-muted" title={white}>
                {white}
              </span>
            </th>
            <th scope="col" className="p-3 pl-0 text-right font-normal">
              <span className="font-book block text-lg leading-none font-semibold whitespace-nowrap">{formatPercent(summary.b.accuracy)}</span>
              <span className="mt-1 block truncate text-xs text-muted" title={black}>
                {black}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {MOVE_CLASSES.map((cls) => (
            <tr key={cls} className="border-t border-line">
              <th scope="row" className="px-3 py-1.5 text-left font-medium">
                <span className="flex items-center gap-2">
                  <ClassBadge cls={cls} className="size-5 shrink-0" />
                  {CLASS_INFO[cls].label}
                </span>
              </th>
              <td className={`px-3 py-1.5 pl-0 text-right ${summary.w.counts[cls] ? 'font-semibold' : 'text-muted'}`}>{summary.w.counts[cls]}</td>
              <td className={`px-3 py-1.5 pl-0 text-right ${summary.b.counts[cls] ? 'font-semibold' : 'text-muted'}`}>{summary.b.counts[cls]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ClockCard analysis={analysis} userColor={userColor} />
    </section>
  )
}
