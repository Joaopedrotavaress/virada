import { useMemo } from 'react'
import type { ErrorTheme } from '../chess/digest'
import { useKv } from '../data/kv'
import { recordsFor, useAllRecords } from '../data/library'
import { THEME_LABEL, findPatterns } from '../data/stats'
import { navigate } from '../route'
import { DAILY_KEY, type DailyState, EMPTY_DAILY, currentDaily } from './daily'
import { useCards } from './useCards'

/** O resumo do treino de hoje, na tela inicial e na tela de treino. */
export function TodaySummary({ compact = false }: { compact?: boolean }) {
  const { due, cards, loaded } = useCards()
  const [stored] = useKv<DailyState>(DAILY_KEY, EMPTY_DAILY)
  const daily = currentDaily(stored)
  const count = due.length
  if (compact && loaded && cards.length === 0 && daily.total === 0) return null
  return (
    <section aria-label="Treino de hoje" className={`rounded-md bg-surface p-4 ${compact ? 'mt-4' : 'mt-3'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-book text-xl font-semibold">{count > 0 ? `${count} ${count === 1 ? 'exercício' : 'exercícios'} para hoje` : daily.doneToday > 0 ? 'Treino de hoje em dia' : 'Nenhum exercício vencido'}</h2>
          <p className="text-sm text-muted">
            {[daily.streak > 0 ? `${daily.streak} ${daily.streak === 1 ? 'dia' : 'dias'} seguidos` : '', daily.doneToday > 0 ? `${daily.doneToday} feitos hoje` : '', count > 0 ? 'Leva uns minutos' : ''].filter(Boolean).join(', ') || 'Os erros das partidas analisadas viram exercícios.'}
          </p>
        </div>
        {count > 0 && (
          <button type="button" onClick={() => navigate('#/treino/sessao')} className="min-h-12 w-full shrink-0 rounded-md bg-ink px-5 font-semibold text-bg sm:w-auto">
            Começar
          </button>
        )}
      </div>
    </section>
  )
}

export function Training({ username }: { username: string }) {
  const { cards } = useCards()
  const records = recordsFor(useAllRecords(), username)
  const patterns = useMemo(() => findPatterns(records), [records])
  const themes = useMemo(() => {
    const counts = new Map<ErrorTheme, number>()
    for (const card of cards) if (card.theme) counts.set(card.theme, (counts.get(card.theme) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [cards])
  const reviewed = cards.filter((card) => card.reviews > 0).length

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:pt-8">
      <h1 className="font-book text-3xl font-semibold">Treino</h1>
      <TodaySummary />

      <section className="mt-4 rounded-md bg-surface p-4">
        <h2 className="font-book text-xl font-semibold">Puzzles</h2>
        <p className="mt-1 max-w-prose text-muted">Um puzzle por dia, ou quantos quiser por tema. Funciona sem internet.</p>
        <button type="button" onClick={() => navigate('#/puzzles')} className="mt-3 min-h-12 w-full rounded-md border border-line px-5 font-semibold hover:bg-sunken sm:w-auto">
          Abrir puzzles
        </button>
      </section>

      {patterns.length > 0 && (
        <section className="mt-6">
          <h2 className="font-book text-xl font-semibold">O que se repete nos seus erros</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {patterns.map((pattern) => (
              <li key={pattern.id} className="font-book max-w-prose text-base leading-relaxed">
                {pattern.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-book text-xl font-semibold">Seus erros por tema</h2>
        {themes.length === 0 ? (
          <p className="mt-1 max-w-prose text-muted">Ainda não há exercícios. Analise suas partidas: os piores erros de cada uma entram aqui, com a agenda de revisão.</p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-md bg-surface">
              {themes.map(([theme, count]) => (
                <li key={theme}>
                  <button type="button" onClick={() => navigate(`#/treino/sessao/${theme}`)} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-sunken">
                    <span className="font-semibold first-letter:uppercase">{THEME_LABEL[theme].many}</span>
                    <span className="tabular shrink-0 text-sm text-muted">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">
              {cards.length} {cards.length === 1 ? 'exercício guardado' : 'exercícios guardados'}, {reviewed} já {reviewed === 1 ? 'praticado' : 'praticados'}.
            </p>
          </>
        )}
      </section>
    </main>
  )
}
