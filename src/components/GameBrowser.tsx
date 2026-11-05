import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChessComError, type ChessComGame, TIME_CLASSES, createChessComClient, monthLabel, timeClassLabel, viewGame } from '../chesscom/api'
import { idbCache } from '../chesscom/idbCache'

const client = createChessComClient({ cache: idbCache })

/** Ao voltar para o app, só busca de novo se já passou este tempo. */
const REFRESH_ON_RETURN_MS = 60_000

/** O que fica guardado para a lista não recomeçar do zero ao voltar de uma análise. */
export interface BrowserMemo {
  username: string
  archives: string[]
  loaded: number
  games: ChessComGame[]
  filter: string
  updatedAt: number | null
}

interface GameBrowserProps {
  username: string
  memo: { current: BrowserMemo | null }
  analyzedLinks: Set<string>
  onOpen: (game: ChessComGame) => void
  onBack: () => void
}

const OUTCOME = {
  win: { label: 'Vitória', color: 'var(--text-best)' },
  loss: { label: 'Derrota', color: 'var(--text-blunder)' },
  draw: { label: 'Empate', color: 'var(--muted)' },
}

const formatDay = (seconds: number) => new Date(seconds * 1000).toLocaleDateString('pt-BR')
const formatTime = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
// Variantes como xadrez 960 não passam pela análise.
const onlyStandard = (games: ChessComGame[]) => games.filter((game) => !game.rules || game.rules === 'chess')
const describeFailure = (failure: unknown) => (failure instanceof ChessComError ? failure.message : 'Não consegui buscar as partidas. Tente de novo.')

/** Junta sem repetir, com a versão nova de cada partida e as mais recentes primeiro. */
function mergeGames(current: ChessComGame[], incoming: ChessComGame[]): ChessComGame[] {
  const byUrl = new Map(current.map((game) => [game.url, game]))
  for (const game of incoming) byUrl.set(game.url, game)
  return [...byUrl.values()].sort((a, b) => b.end_time - a.end_time)
}

export function GameBrowser({ username, memo, analyzedLinks, onOpen, onBack }: GameBrowserProps) {
  const initial = memo.current?.username === username ? memo.current : null
  const [archives, setArchives] = useState<string[]>(initial?.archives ?? [])
  const [loaded, setLoaded] = useState(initial?.loaded ?? 0)
  const [games, setGames] = useState<ChessComGame[]>(initial?.games ?? [])
  const [filter, setFilter] = useState(initial?.filter ?? 'all')
  const [updatedAt, setUpdatedAt] = useState<number | null>(initial?.updatedAt ?? null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [newCount, setNewCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)
  const state = useRef({ archives, games, loaded, updatedAt, refreshing })
  state.current = { archives, games, loaded, updatedAt, refreshing }

  useEffect(() => {
    memo.current = { username, archives, loaded, games, filter, updatedAt }
  }, [archives, filter, games, loaded, memo, updatedAt, username])

  const loadMonth = useCallback(async (list: string[], index: number) => {
    setLoading(true)
    setError(null)
    try {
      const month = await client.month(list[index], index === 0)
      setGames((current) => mergeGames(current, onlyStandard(month)))
      setLoaded(index + 1)
    } catch (failure) {
      setError(describeFailure(failure))
    } finally {
      setLoading(false)
    }
  }, [])

  /** Pergunta ao chess.com o que há de novo, sem tirar a lista da tela. */
  const refresh = useCallback(async () => {
    if (state.current.refreshing) return
    setRefreshing(true)
    setError(null)
    setNewCount(null)
    try {
      const list = await client.archives(username, { force: true })
      // Um mês novo pode ter começado: o que era o atual também precisa ser relido, pois terminou depois da última vez.
      const firstTime = state.current.archives.length === 0
      const added = firstTime ? 0 : Math.max(0, list.length - state.current.archives.length)
      const months = list.slice(0, added + 1)
      const before = new Set(state.current.games.map((game) => game.url))
      let merged = state.current.games
      for (const url of months) merged = mergeGames(merged, onlyStandard(await client.month(url, url === list[0], { force: true })))
      setArchives(list)
      setLoaded((current) => (list.length === 0 ? 0 : Math.max(1, current + added)))
      setGames(merged)
      // Sem internet, o que veio é o que já estava guardado: não dá para dizer que atualizou.
      if (navigator.onLine === false) {
        setError(new ChessComError('offline').message)
        return
      }
      setUpdatedAt(Date.now())
      setNewCount(firstTime ? null : merged.filter((game) => !before.has(game.url)).length)
    } catch (failure) {
      setError(describeFailure(failure))
    } finally {
      setRefreshing(false)
    }
  }, [username])

  // Abrir a lista sempre pergunta: quem acabou de jogar quer ver a partida agora.
  useEffect(() => {
    if (started.current) return
    started.current = true
    void refresh()
  }, [refresh])

  // Voltar para o app (depois de jogar no chess.com, por exemplo) também atualiza.
  useEffect(() => {
    const onVisible = () => {
      const last = state.current.updatedAt
      if (document.visibilityState === 'visible' && (last === null || Date.now() - last >= REFRESH_ON_RETURN_MS)) void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  const visible = useMemo(() => (filter === 'all' ? games : games.filter((game) => game.time_class === filter)), [filter, games])
  const hasMore = loaded > 0 && loaded < archives.length
  const firstLoad = refreshing && updatedAt === null && games.length === 0

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-2 pb-10 lg:pt-8">
      <button type="button" onClick={onBack} className="-ml-1 flex min-h-11 items-center gap-1 rounded-md pr-3 pl-1 font-semibold hover:bg-sunken">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="currentColor">
          <path d="M15.4 6.4 14 5l-7 7 7 7 1.4-1.4L9.8 12z" />
        </svg>
        Início
      </button>
      <h1 className="font-book mt-2 truncate text-3xl font-semibold">Partidas de {username}</h1>
      {loaded > 0 && (
        <p className="mt-1 text-sm text-muted">
          {loaded === 1 ? monthLabel(archives[0]) : `De ${monthLabel(archives[loaded - 1])} até ${monthLabel(archives[0])}`}, {games.length} {games.length === 1 ? 'partida' : 'partidas'}
        </p>
      )}

      {(games.length > 0 || updatedAt !== null) && (
        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={() => void refresh()} disabled={refreshing} className="min-h-11 shrink-0 rounded-md border border-line px-4 font-semibold hover:bg-sunken disabled:opacity-60">
            {refreshing ? 'Atualizando…' : 'Atualizar'}
          </button>
          <p role="status" className="min-w-0 text-sm text-muted">
            {newCount !== null && newCount > 0 ? `${newCount} ${newCount === 1 ? 'partida nova' : 'partidas novas'}. ` : ''}
            {updatedAt !== null ? `Atualizado às ${formatTime(updatedAt)}.` : ''}
          </p>
        </div>
      )}
      {newCount === 0 && !refreshing && (
        <p className="mt-2 max-w-prose text-sm text-muted">Nenhuma partida nova. Se você acabou de jogar, o chess.com pode levar um tempo para publicar. Enquanto isso, dá para colar o PGN na tela inicial.</p>
      )}

      {games.length > 0 && (
        <div role="group" aria-label="Filtrar por ritmo" className="mt-4 flex flex-wrap gap-1.5">
          {[{ id: 'all', label: 'Todas' }, ...TIME_CLASSES].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={`min-h-10 rounded-full px-4 text-sm font-semibold ${filter === id ? 'bg-ink text-bg' : 'bg-surface hover:bg-sunken'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 rounded-md bg-surface p-4">
          <p className="font-medium text-(--text-blunder)">{error}</p>
          <button type="button" onClick={() => void refresh()} className="mt-2 min-h-11 rounded-md border border-line px-4 font-semibold hover:bg-sunken">
            Tentar de novo
          </button>
        </div>
      )}

      {visible.length > 0 && (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-md bg-surface">
          {visible.map((game) => {
            const view = viewGame(game, username)
            const outcome = OUTCOME[view.outcome]
            return (
              <li key={game.url}>
                <button type="button" onClick={() => onOpen(game)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-sunken">
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-full border border-muted"
                    style={{ backgroundColor: view.myColor === 'w' ? 'var(--share-white)' : 'var(--share-black)' }}
                    title={view.myColor === 'w' ? 'Você jogou de brancas' : 'Você jogou de pretas'}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{view.opponent}</span>
                    <span className="tabular block text-sm text-muted">
                      {view.myRating ?? '?'} x {view.opponentRating ?? '?'}, {timeClassLabel(game.time_class)}, {formatDay(game.end_time)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold" style={{ color: outcome.color }}>
                      {outcome.label}
                    </span>
                    <span className="block text-xs text-muted">{view.myColor === 'w' ? 'de brancas' : 'de pretas'}</span>
                    {analyzedLinks.has(game.url) && <span className="mt-0.5 block text-xs font-semibold text-(--text-best)">Analisada</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!loading && !refreshing && !error && loaded > 0 && visible.length === 0 && (
        <p className="mt-4 rounded-md bg-surface p-4 text-muted">{filter === 'all' ? 'Nenhuma partida neste mês.' : `Nenhuma partida de ${timeClassLabel(filter).toLowerCase()} nos meses carregados.`}</p>
      )}
      {!loading && !refreshing && !error && updatedAt !== null && archives.length === 0 && <p className="mt-4 rounded-md bg-surface p-4 text-muted">Este usuário ainda não tem partidas públicas.</p>}

      {(loading || firstLoad) && <p className="mt-4 text-muted">Buscando partidas no chess.com…</p>}

      {hasMore && !loading && !error && (
        <button type="button" onClick={() => void loadMonth(archives, loaded)} className="mt-4 min-h-12 w-full rounded-md border border-line font-semibold hover:bg-sunken">
          Carregar mês anterior
        </button>
      )}
    </main>
  )
}
