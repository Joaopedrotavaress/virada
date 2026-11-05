import { memo, useMemo } from 'react'
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AnalyzedMove, AnalyzedPosition } from '../chess/analyze'
import { CLASS_INFO, type MoveClass, isErrorClass } from '../chess/classify'
import { formatEval, whiteWinPercent } from '../chess/evaluation'
import { moveLabel } from './CoachCard'

interface Point {
  ply: number
  win: number
  evalText: string
  move: AnalyzedMove | null
}

interface EvalChartProps {
  positions: AnalyzedPosition[]
  moves: AnalyzedMove[]
  ply: number
  onSelect: (ply: number) => void
  showTitle?: boolean
}

/** Tamanho também diferencia a gravidade, além da cor. */
const DOT_RADIUS: Partial<Record<MoveClass, number>> = { inaccuracy: 3.5, mistake: 4.5, miss: 4.5, blunder: 5.5 }
const PLOT_PADDING = 8
const LEGEND: MoveClass[] = ['inaccuracy', 'mistake', 'miss', 'blunder']

function ChartTooltip({ active, payload }: { active?: boolean; payload?: readonly { payload?: Point }[] }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink shadow-md">
      <p className="font-book font-semibold">{point.move ? moveLabel(point.move) : 'Posição inicial'}</p>
      <p className="tabular text-muted">
        {point.evalText}
        {point.move ? `, ${CLASS_INFO[point.move.cls].label}` : ''}
      </p>
    </div>
  )
}

/** O desenho do gráfico só muda com a partida, não a cada lance navegado. */
const EvalPlot = memo(function EvalPlot({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} accessibilityLayer={false}>
        {/* A faixa extra no eixo Y evita cortar os pontos em 0% e 100%. */}
        <YAxis hide domain={[-6, 106]} />
        <XAxis hide dataKey="ply" type="number" domain={[0, data.length - 1]} padding={{ left: PLOT_PADDING, right: PLOT_PADDING }} />
        <ReferenceLine y={50} stroke="var(--share-mid)" strokeWidth={1} />
        <Tooltip content={ChartTooltip} cursor={{ stroke: 'var(--share-mid)' }} isAnimationActive={false} />
        <Area
          dataKey="win"
          type="linear"
          stroke="var(--share-mid)"
          strokeWidth={2}
          fill="var(--share-white)"
          fillOpacity={1}
          baseValue={-6}
          isAnimationActive={false}
          activeDot={false}
          dot={(props) => {
            const cls = (props.payload as Point | undefined)?.move?.cls
            if (!cls || !isErrorClass(cls) || props.cx == null || props.cy == null) return <g key={props.key} />
            return <circle key={props.key} cx={props.cx} cy={props.cy} r={DOT_RADIUS[cls]} fill={`var(--fill-${cls})`} stroke="#fff" strokeWidth={2} />
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
})

export function EvalChart({ positions, moves, ply, onSelect, showTitle = true }: EvalChartProps) {
  const data: Point[] = useMemo(
    () =>
      positions.map((position, index) => ({
        ply: index,
        win: whiteWinPercent(position.eval),
        evalText: formatEval(position.eval),
        move: index > 0 ? moves[index - 1] : null,
      })),
    [moves, positions],
  )
  const ratio = data.length > 1 ? ply / (data.length - 1) : 0

  return (
    <section aria-label="Gráfico de avaliação">
      {showTitle ? (
        <h2 className="mb-1.5 text-sm font-semibold">Chance de vitória ao longo da partida</h2>
      ) : (
        <p className="mb-1.5 text-sm text-muted">Chance de vitória ao longo da partida. Toque no gráfico para ir ao lance.</p>
      )}
      <div
        className="relative h-32 cursor-pointer overflow-hidden rounded-md"
        style={{ backgroundColor: 'var(--share-black)' }}
        onClick={(event) => {
          // Pela posição do clique: no toque não há hover, e o índice do tooltip da biblioteca vem nulo.
          const box = event.currentTarget.getBoundingClientRect()
          const ratio = (event.clientX - box.left - PLOT_PADDING) / (box.width - 2 * PLOT_PADDING)
          onSelect(Math.max(0, Math.min(data.length - 1, Math.round(ratio * (data.length - 1)))))
        }}
      >
        <EvalPlot data={data} />
        {/* Traço duplo para a posição atual aparecer sobre o claro e sobre o escuro. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white"
          style={{ left: `calc(${PLOT_PADDING}px + (100% - ${2 * PLOT_PADDING}px) * ${ratio} - 1px)`, boxShadow: '0 0 0 1px rgb(22 32 43 / 0.55)' }}
        />
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {LEGEND.map((cls) => (
          <li key={cls} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block rounded-full" style={{ backgroundColor: `var(--fill-${cls})`, width: DOT_RADIUS[cls]! * 2, height: DOT_RADIUS[cls]! * 2 }} />
            {CLASS_INFO[cls].label}
          </li>
        ))}
      </ul>
    </section>
  )
}
