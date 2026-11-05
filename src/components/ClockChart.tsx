import { memo, useMemo } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AnalyzedMove } from '../chess/analyze'
import { CLASS_INFO, isErrorClass } from '../chess/classify'
import { type ClockData, clocksAt, formatClock } from '../chess/clock'
import { moveLabel } from './CoachCard'

interface ClockChartProps {
  data: ClockData
  moves: AnalyzedMove[]
  ply: number
  white: string
  black: string
  onSelect: (ply: number) => void
}

interface Point {
  ply: number
  white: number
  black: number
  move: AnalyzedMove | null
}

const PLOT_PADDING = 8

function ChartTooltip({ active, payload, white, black }: { active?: boolean; payload?: readonly { payload?: Point }[]; white: string; black: string }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink shadow-md">
      <p className="font-display font-semibold">{point.move ? moveLabel(point.move) : 'Início'}</p>
      {point.move && isErrorClass(point.move.cls) && <p className="text-muted">{CLASS_INFO[point.move.cls].label}</p>}
      <p className="tabular text-muted">
        {white}: {formatClock(point.white)}
      </p>
      <p className="tabular text-muted">
        {black}: {formatClock(point.black)}
      </p>
    </div>
  )
}

const dotFor = (color: 'w' | 'b') =>
  function ClockDot(props: { key?: React.Key | null; cx?: number; cy?: number; payload?: Point }) {
    const move = props.payload?.move
    if (!move || move.color !== color || !isErrorClass(move.cls) || props.cx == null || props.cy == null) return <g key={props.key} />
    return <circle key={props.key} cx={props.cx} cy={props.cy} r={move.cls === 'inaccuracy' ? 3 : move.cls === 'blunder' ? 5 : 4} fill={`var(--fill-${move.cls})`} stroke="var(--surface)" strokeWidth={2} />
  }

/** O desenho só muda com a partida, não a cada lance navegado. */
const ClockPlot = memo(function ClockPlot({ points, white, black }: { points: Point[]; white: string; black: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 8, right: 0, bottom: 8, left: 0 }} accessibilityLayer={false}>
        <YAxis hide domain={[0, 'dataMax']} />
        <XAxis hide dataKey="ply" type="number" domain={[0, points.length - 1]} padding={{ left: PLOT_PADDING, right: PLOT_PADDING }} />
        <Tooltip content={(props) => <ChartTooltip active={props.active} payload={props.payload as readonly { payload?: Point }[]} white={white} black={black} />} cursor={{ stroke: 'var(--line)' }} isAnimationActive={false} />
        <Line dataKey="white" type="stepAfter" stroke="var(--ink)" strokeWidth={2} isAnimationActive={false} activeDot={false} dot={dotFor('w')} />
        <Line dataKey="black" type="stepAfter" stroke="var(--muted)" strokeWidth={2} strokeDasharray="4 3" isAnimationActive={false} activeDot={false} dot={dotFor('b')} />
      </LineChart>
    </ResponsiveContainer>
  )
})

/** Relógio dos dois jogadores. Linha contínua e tracejada: a cor fica reservada para os erros. */
export function ClockChart({ data, moves, ply, white, black, onSelect }: ClockChartProps) {
  const points: Point[] = useMemo(
    () =>
      Array.from({ length: moves.length + 1 }, (_, index) => {
        const clocks = clocksAt(data, moves, index)
        return { ply: index, white: clocks.w, black: clocks.b, move: index > 0 ? moves[index - 1] : null }
      }),
    [data, moves],
  )
  const ratio = points.length > 1 ? ply / (points.length - 1) : 0

  return (
    <section aria-label="Gráfico do relógio">
      <h2 className="mb-1.5 text-sm font-semibold">Relógio dos dois jogadores</h2>
      <div
        className="relative h-28 cursor-pointer overflow-hidden rounded-md bg-surface"
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect()
          const ratio = (event.clientX - box.left - PLOT_PADDING) / (box.width - 2 * PLOT_PADDING)
          onSelect(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))))
        }}
      >
        <ClockPlot points={points} white={white} black={black} />
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-muted" style={{ left: `calc(${PLOT_PADDING}px + (100% - ${2 * PLOT_PADDING}px) * ${ratio})` }} />
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <li className="flex min-w-0 items-center gap-1.5">
          <svg aria-hidden="true" width="20" height="4">
            <line x1="0" y1="2" x2="20" y2="2" stroke="var(--ink)" strokeWidth="2" />
          </svg>
          <span className="truncate">{white}</span>
        </li>
        <li className="flex min-w-0 items-center gap-1.5">
          <svg aria-hidden="true" width="20" height="4">
            <line x1="0" y1="2" x2="20" y2="2" stroke="var(--muted)" strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          <span className="truncate">{black}</span>
        </li>
      </ul>
    </section>
  )
}
