import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TIME_CLASSES } from '../chesscom/api'
import { recordsFor, useAllRecords } from '../data/library'
import { type PeriodPoint, colorInsight, findPatterns, groupByPeriod, ratingSeries, timeClassFor, totalsOf } from '../data/stats'
import { navigate } from '../route'

const RANGES = [
  { id: '30', label: '30 dias', days: 30 },
  { id: '90', label: '90 dias', days: 90 },
  { id: '365', label: '1 ano', days: 365 },
  { id: 'all', label: 'Tudo', days: null },
]

const pct = (value: number | null) => (value === null ? '–' : `${value.toFixed(0)}%`)
const decimal = (value: number | null) => (value === null ? '–' : value.toFixed(1).replace('.', ','))
const formatDay = (time: number) => new Date(time).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })

const AXIS_TICK = { fill: 'var(--muted)', fontSize: 12 }

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md bg-surface p-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-display tabular text-3xl font-semibold">{value}</dd>
      {hint && <dd className="text-xs text-muted">{hint}</dd>}
    </div>
  )
}

function ChartTip({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink shadow-md">
      <p className="text-muted">{title}</p>
      <p className="tabular font-semibold">{value}</p>
    </div>
  )
}

function ChartBlock({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md bg-surface p-3">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {note && <p className="text-sm text-muted">{note}</p>}
      <div className="mt-2 h-52">{children}</div>
    </section>
  )
}

function periodValue(point: PeriodPoint, key: 'accuracy' | 'errorsPerGame' | 'score') {
  return point[key]
}

function PeriodLine({ points, dataKey, suffix }: { points: PeriodPoint[]; dataKey: 'accuracy' | 'score'; suffix: string }) {
  const data = points.filter((point) => periodValue(point, dataKey) !== null)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" strokeOpacity={0.6} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={24} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <Tooltip
          isAnimationActive={false}
          cursor={{ stroke: 'var(--line)' }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as PeriodPoint | undefined
            return active && point ? <ChartTip title={`${point.label}, ${point.games} ${point.games === 1 ? 'partida' : 'partidas'}`} value={`${(periodValue(point, dataKey) ?? 0).toFixed(1).replace('.', ',')}${suffix}`} /> : null
          }}
        />
        <Line dataKey={dataKey} stroke="var(--ink)" strokeWidth={2} dot={{ r: 3, fill: 'var(--ink)', stroke: 'var(--surface)', strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function Progress({ username }: { username: string }) {
  const all = useAllRecords()
  const [rangeId, setRangeId] = useState('90')
  const [timeClass, setTimeClass] = useState('all')

  const owned = useMemo(() => recordsFor(all, username), [all, username])
  const records = useMemo(() => {
    const days = RANGES.find((range) => range.id === rangeId)?.days ?? null
    // eslint-disable-next-line react-hooks/purity -- o recorte por data só precisa ser recalculado quando os filtros mudam.
    const since = days === null ? 0 : Date.now() - days * 86_400_000
    return owned.filter((record) => record.playedAt >= since && (timeClass === 'all' || timeClassFor(record) === timeClass))
  }, [owned, rangeId, timeClass])

  const totals = useMemo(() => totalsOf(records), [records])
  const rating = useMemo(() => ratingSeries(records), [records])
  // Até uns três meses, a semana mostra bem. Depois disso, viraria só ruído.
  const period = rangeId === '30' || rangeId === '90' ? 'week' : 'month'
  const points = useMemo(() => groupByPeriod(records, period), [period, records])
  const patterns = useMemo(() => findPatterns(records), [records])
  const colors = useMemo(() => colorInsight(records), [records])
  const hasAccuracy = points.filter((point) => point.accuracy !== null).length >= 2
  const errorPoints = points.filter((point) => point.errorsPerGame !== null)
  const ratingChange = rating.length >= 2 ? rating[rating.length - 1].rating - rating[0].rating : null

  const chips = (
    <div className="mt-3 flex flex-col gap-1.5">
      <div role="group" aria-label="Período" className="flex flex-wrap gap-1.5">
        {RANGES.map((range) => (
          <button key={range.id} type="button" aria-pressed={rangeId === range.id} onClick={() => setRangeId(range.id)} className={`min-h-10 rounded-sm px-4 text-sm font-semibold ${rangeId === range.id ? 'bg-action text-on-action' : 'bg-surface hover:bg-sunken'}`}>
            {range.label}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Ritmo" className="flex flex-wrap gap-1.5">
        {[{ id: 'all', label: 'Todos os ritmos' }, ...TIME_CLASSES].map((item) => (
          <button key={item.id} type="button" aria-pressed={timeClass === item.id} onClick={() => setTimeClass(item.id)} className={`min-h-10 rounded-sm px-4 text-sm font-semibold ${timeClass === item.id ? 'bg-action text-on-action' : 'bg-surface hover:bg-sunken'}`}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pt-4 pb-10 lg:pt-8">
      <h1 className="font-display text-3xl font-semibold">Progresso</h1>

      {owned.length === 0 ? (
        <div className="mt-3 rounded-md bg-surface p-4">
          <p className="max-w-prose text-muted">Sua evolução aparece aqui quando houver partidas guardadas. Busque as do chess.com ou jogue contra um bot.</p>
          <button type="button" onClick={() => navigate('#/partidas')} className="mt-3 min-h-11 rounded-md bg-action px-5 font-semibold text-on-action">
            Ver partidas
          </button>
        </div>
      ) : (
        <>
          {chips}
          {records.length === 0 ? (
            <p className="mt-4 rounded-md bg-surface p-4 text-muted">Nenhuma partida neste período e ritmo.</p>
          ) : (
            <>
              <dl className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                <Stat label="Partidas" value={String(totals.games)} hint={`${totals.wins} vitórias, ${totals.draws} empates, ${totals.losses} derrotas`} />
                <Stat label="Aproveitamento" value={pct(totals.score)} hint="Pontos sobre o total possível" />
                <Stat label="Precisão média" value={pct(totals.accuracy)} hint="Sua, nas partidas com precisão" />
                <Stat label="Erros graves por partida" value={decimal(totals.errorsPerGame)} hint={`Em ${totals.analyzed} ${totals.analyzed === 1 ? 'partida analisada' : 'partidas analisadas'}`} />
              </dl>

              {(patterns.length > 0 || colors) && (
                <section className="mt-4 rounded-md bg-surface p-4">
                  <h2 className="font-display text-xl font-semibold">O que se repete</h2>
                  <ul className="mt-2 flex flex-col gap-2">
                    {patterns.map((pattern) => (
                      <li key={pattern.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                        <span className="max-w-prose text-base leading-relaxed">{pattern.text}</span>
                        {pattern.theme && (
                          <button type="button" onClick={() => navigate(`#/treino/sessao/${pattern.theme}`)} className="min-h-11 shrink-0 rounded-md border border-line px-4 font-semibold hover:bg-sunken">
                            Treinar
                          </button>
                        )}
                      </li>
                    ))}
                    {colors && <li className="max-w-prose text-base leading-relaxed">{colors}</li>}
                  </ul>
                </section>
              )}

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {rating.length >= 2 && (
                  <ChartBlock title="Rating" note={ratingChange === null ? undefined : `${ratingChange > 0 ? '+' : ''}${ratingChange} pontos no período${timeClass === 'all' ? '. Filtre por ritmo: cada um tem o seu rating.' : '.'}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={rating} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                        <CartesianGrid vertical={false} stroke="var(--line)" strokeOpacity={0.6} />
                        <XAxis dataKey="time" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={formatDay} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={32} />
                        <YAxis domain={['dataMin - 20', 'dataMax + 20']} allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(value: number) => String(Math.round(value))} />
                        <Tooltip
                          isAnimationActive={false}
                          cursor={{ stroke: 'var(--line)' }}
                          content={({ active, payload }) => {
                            const point = payload?.[0]?.payload as { time: number; rating: number } | undefined
                            return active && point ? <ChartTip title={formatDay(point.time)} value={String(point.rating)} /> : null
                          }}
                        />
                        <Line dataKey="rating" stroke="var(--ink)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartBlock>
                )}
                {hasAccuracy && (
                  <ChartBlock title={period === 'week' ? 'Precisão por semana' : 'Precisão por mês'}>
                    <PeriodLine points={points} dataKey="accuracy" suffix="%" />
                  </ChartBlock>
                )}
                {points.length >= 2 && (
                  <ChartBlock title={period === 'week' ? 'Aproveitamento por semana' : 'Aproveitamento por mês'}>
                    <PeriodLine points={points} dataKey="score" suffix="%" />
                  </ChartBlock>
                )}
                {errorPoints.length >= 2 && (
                  <ChartBlock title={period === 'week' ? 'Erros graves por partida, por semana' : 'Erros graves por partida, por mês'}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={errorPoints} margin={{ top: 8, right: 8, bottom: 0, left: -24 }} barCategoryGap="30%">
                        <CartesianGrid vertical={false} stroke="var(--line)" strokeOpacity={0.6} />
                        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={24} />
                        <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                        <Tooltip
                          isAnimationActive={false}
                          cursor={{ fill: 'var(--sunken)' }}
                          content={({ active, payload }) => {
                            const point = payload?.[0]?.payload as PeriodPoint | undefined
                            return active && point ? <ChartTip title={`${point.label}, ${point.analyzed} analisadas`} value={decimal(point.errorsPerGame)} /> : null
                          }}
                        />
                        <Bar dataKey="errorsPerGame" fill="var(--share-mid)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartBlock>
                )}
              </div>

              {points.length > 0 && (
                <details className="mt-3">
                  <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Ver os números em tabela</summary>
                  <div className="overflow-x-auto rounded-md bg-surface">
                    <table className="tabular w-full text-right text-sm">
                      <thead className="text-muted">
                        <tr className="border-b border-line">
                          <th scope="col" className="p-2 text-left font-semibold">{period === 'week' ? 'Semana' : 'Mês'}</th>
                          <th scope="col" className="p-2 font-semibold">Partidas</th>
                          <th scope="col" className="p-2 font-semibold">Aproveit.</th>
                          <th scope="col" className="p-2 font-semibold">Precisão</th>
                          <th scope="col" className="p-2 font-semibold">Erros graves</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {[...points].reverse().map((point) => (
                          <tr key={point.key}>
                            <th scope="row" className="p-2 text-left font-normal">{point.label}</th>
                            <td className="p-2">{point.games}</td>
                            <td className="p-2">{pct(point.score)}</td>
                            <td className="p-2">{pct(point.accuracy)}</td>
                            <td className="p-2">{decimal(point.errorsPerGame)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
              {totals.analyzed < totals.games && (
                <p className="mt-3 max-w-prose text-sm text-muted">
                  {totals.games - totals.analyzed === 1 ? '1 partida ainda sem análise fica fora dos erros graves.' : `${totals.games - totals.analyzed} partidas ainda sem análise ficam fora dos erros graves.`}{' '}
                  <button type="button" onClick={() => navigate('#/partidas')} className="font-semibold text-ink underline">
                    Analisar em Partidas
                  </button>
                </p>
              )}
            </>
          )}
        </>
      )}
    </main>
  )
}
