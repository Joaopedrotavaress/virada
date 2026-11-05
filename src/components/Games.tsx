import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatOpening } from '../chess/book'
import { ChessComError, TIME_CLASSES, createChessComClient, monthLabel, timeClassLabel } from '../chesscom/api'
import { idbCache } from '../chesscom/idbCache'
import { type GameOutcome, type GameRecord, ingestChessCom, recordsFor, removeRecord, updateRecord, useAllRecords } from '../data/library'
import { analysisQueue, useQueue } from '../data/queue'
import { Icon } from './Icons'
import { timeClassFor as timeClassOf } from '../data/stats'
import { loadMonthsLoaded, saveMonthsLoaded } from '../storage'

const client = createChessComClient({ cache: idbCache })

/** Ao voltar para o app, só busca de novo se já passou este tempo. */
const REFRESH_ON_RETURN_MS = 60_000
const PAGE_SIZE = 50
const BATCH_SIZE = 20

const OUTCOME: Record<GameOutcome, { label: string; plural: string; color: string }> = {
  win: { label: 'Vitória', plural: 'Vitórias', color: 'var(--positive)' },
  loss: { label: 'Derrota', plural: 'Derrotas', color: 'var(--text-blunder)' },
  draw: { label: 'Empate', plural: 'Empates', color: 'var(--muted)' },
}

const formatDay = (ms: number) => new Date(ms).toLocaleDateString('pt-BR')
const formatTime = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const describeFailure = (failure: unknown) => (failure instanceof ChessComError ? failure.message : 'Não consegui buscar as partidas. Tente de novo.')

export interface GameFilters {
  query: string
  outcome: GameOutcome | 'all'
  timeClass: string
  color: 'w' | 'b' | 'all'
  state: 'all' | 'analyzed' | 'unanalyzed'
  source: GameRecord['source'] | 'all'
  tag: string
}

export const NO_FILTERS: GameFilters = { query: '', outcome: 'all', timeClass: 'all', color: 'all', state: 'all', source: 'all', tag: '' }

const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function filterGames(records: GameRecord[], filters: GameFilters): GameRecord[] {
  const words = normalize(filters.query).split(/\s+/).filter(Boolean)
  return records.filter((record) => {
    if (filters.outcome !== 'all' && record.outcome !== filters.outcome) return false
    if (filters.timeClass !== 'all' && timeClassOf(record) !== filters.timeClass) return false
    if (filters.color !== 'all' && record.userColor !== filters.color) return false
    if (filters.state === 'analyzed' && !record.digest) return false
    if (filters.state === 'unanalyzed' && record.digest) return false
    if (filters.source !== 'all' && record.source !== filters.source) return false
    if (filters.tag && !record.tags.includes(filters.tag)) return false
    if (words.length === 0) return true
    const text = normalize([record.white, record.black, record.opening?.name, record.opening?.eco, record.note, ...record.tags].filter(Boolean).join(' '))
    return words.every((word) => text.includes(word))
  })
}

/** Como a partida aparece na lista, do ponto de vista da pessoa. */
export function viewRecord(record: GameRecord) {
  const { userColor } = record
  const mine = userColor === 'b' ? { rating: record.blackRating, accuracy: record.accuracies?.black } : { rating: record.whiteRating, accuracy: record.accuracies?.white }
  const other = userColor === 'b' ? record.whiteRating : record.blackRating
  const analyzed = record.digest && userColor ? record.digest.accuracy[userColor] : null
  return {
    title: userColor ? (userColor === 'w' ? record.black : record.white) : `${record.white} x ${record.black}`,
    myRating: mine.rating,
    opponentRating: other,
    accuracy: analyzed ?? mine.accuracy ?? null,
  }
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-10 rounded-sm px-4 text-sm font-semibold ${active ? 'bg-ink text-bg' : 'bg-surface hover:bg-sunken'}`}>
      {children}
    </button>
  )
}

function GameDetails({ record, onClose }: { record: GameRecord; onClose: () => void }) {
  const [note, setNote] = useState(record.note)
  const [tag, setTag] = useState('')
  const [confirming, setConfirming] = useState(false)
  const addTag = () => {
    const value = tag.trim()
    if (value && !record.tags.includes(value)) void updateRecord(record.key, { tags: [...record.tags, value] })
    setTag('')
  }
  return (
    <div className="border-t border-line bg-sunken p-3">
      <label htmlFor={`nota-${record.key}`} className="mb-1 block text-sm font-semibold">
        Sua nota
      </label>
      <textarea
        id={`nota-${record.key}`}
        value={note}
        rows={2}
        onChange={(event) => setNote(event.target.value)}
        onBlur={() => void updateRecord(record.key, { note })}
        className="w-full rounded-md border border-line bg-surface p-2 text-base"
      />
      <label htmlFor={`marca-${record.key}`} className="mt-2 mb-1 block text-sm font-semibold">
        Marcadores
      </label>
      {record.tags.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {record.tags.map((item) => (
            <li key={item}>
              <button
                type="button"
                aria-label={`Tirar o marcador ${item}`}
                onClick={() => void updateRecord(record.key, { tags: record.tags.filter((other) => other !== item) })}
                className="flex min-h-9 items-center gap-1 rounded-sm bg-surface px-3 text-sm font-semibold hover:bg-bg"
              >
                {item} <Icon name="close" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          addTag()
        }}
      >
        <input id={`marca-${record.key}`} value={tag} onChange={(event) => setTag(event.target.value)} placeholder="torneio, final de torres…" className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-2 text-base" />
        <button type="submit" className="min-h-11 shrink-0 rounded-md border border-line bg-surface px-4 font-semibold hover:bg-bg">
          Adicionar
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {record.link && (
          <a href={record.link} target="_blank" rel="noreferrer" className="flex min-h-11 items-center rounded-md border border-line bg-surface px-4 font-semibold hover:bg-bg">
            Abrir no chess.com
          </a>
        )}
        {confirming ? (
          <button type="button" onClick={() => void removeRecord(record.key)} className="min-h-11 rounded-md bg-action px-4 font-semibold text-on-action">
            Confirmar: apagar partida
          </button>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="min-h-11 rounded-md border border-line bg-surface px-4 font-semibold hover:bg-bg">
            Apagar
          </button>
        )}
        <button type="button" onClick={onClose} className="min-h-11 rounded-md px-4 font-semibold hover:bg-bg">
          Fechar
        </button>
      </div>
    </div>
  )
}

interface GamesProps {
  username: string
  onUsernameChange: (name: string) => void
  onOpen: (record: GameRecord) => void
}

/** Todas as partidas num lugar só: as do chess.com, as contra bots e as coladas. */
export function Games({ username, onUsernameChange, onOpen }: GamesProps) {
  const user = username.trim()
  const all = useAllRecords()
  const queue = useQueue()
  const records = useMemo(() => recordsFor(all, user), [all, user])
  const [filters, setFilters] = useState(NO_FILTERS)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [openDetails, setOpenDetails] = useState<string | null>(null)
  const [archives, setArchives] = useState<string[]>([])
  const [monthsLoaded, setMonthsLoaded] = useState(() => loadMonthsLoaded(user))
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMonth, setLoadingMonth] = useState(false)
  const [newCount, setNewCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draftUser, setDraftUser] = useState('')
  const state = useRef({ refreshing, updatedAt, archives, monthsLoaded })
  state.current = { refreshing, updatedAt, archives, monthsLoaded }

  /** Pergunta ao chess.com o que há de novo, sem tirar a lista da tela. */
  const refresh = useCallback(async () => {
    if (!user || state.current.refreshing) return
    setRefreshing(true)
    setError(null)
    setNewCount(null)
    try {
      const list = await client.archives(user, { force: true })
      const known = state.current.archives.length
      setArchives(list)
      // Só o mês atual muda. Meses já abertos vêm do cache; os novos, do chess.com.
      const count = Math.max(1, Math.min(state.current.monthsLoaded, list.length))
      let added = 0
      for (let index = 0; index < count; index += 1) {
        const games = await client.month(list[index], index === 0, { force: index === 0 })
        added += await ingestChessCom(user, games.filter((game) => !game.rules || game.rules === 'chess'))
      }
      // Sem internet, o que veio é o que já estava guardado: não dá para dizer que atualizou.
      if (navigator.onLine === false) {
        setError(new ChessComError('offline').message)
        return
      }
      setUpdatedAt(Date.now())
      setNewCount(known === 0 && state.current.updatedAt === null ? (added > 0 ? added : null) : added)
    } catch (failure) {
      setError(describeFailure(failure))
    } finally {
      setRefreshing(false)
    }
  }, [user])

  const loadPreviousMonth = async () => {
    const index = monthsLoaded
    if (index >= archives.length) return
    setLoadingMonth(true)
    setError(null)
    try {
      const games = await client.month(archives[index], false)
      await ingestChessCom(user, games.filter((game) => !game.rules || game.rules === 'chess'))
      setMonthsLoaded(index + 1)
      saveMonthsLoaded(user, index + 1)
    } catch (failure) {
      setError(describeFailure(failure))
    } finally {
      setLoadingMonth(false)
    }
  }

  // Abrir a lista sempre pergunta: quem acabou de jogar quer ver a partida agora.
  useEffect(() => {
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

  const visible = useMemo(() => filterGames(records, filters), [filters, records])
  const allTags = useMemo(() => [...new Set(records.flatMap((record) => record.tags))].sort(), [records])
  const toAnalyze = useMemo(() => visible.filter((record) => !record.digest && !record.queued).slice(0, BATCH_SIZE), [visible])
  const change = (patch: Partial<GameFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
    setLimit(PAGE_SIZE)
  }
  const filtering = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS)
  const hasMoreMonths = user !== '' && monthsLoaded < archives.length

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:pt-8">
      <h1 className="font-display text-3xl font-semibold">Partidas</h1>

      {!user ? (
        <form
          className="mt-3 rounded-md bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault()
            onUsernameChange(draftUser.trim())
          }}
        >
          <label htmlFor="usuario-partidas" className="mb-1.5 block font-semibold">
            Seu usuário do chess.com
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="usuario-partidas" value={draftUser} onChange={(event) => setDraftUser(event.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} className="min-h-12 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 text-base" />
            <button type="submit" disabled={!draftUser.trim()} className="min-h-12 shrink-0 rounded-md bg-action px-6 font-semibold text-on-action disabled:opacity-50">
              Buscar partidas
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button type="button" onClick={() => void refresh()} disabled={refreshing} className="min-h-11 shrink-0 rounded-md border border-line px-4 font-semibold hover:bg-sunken disabled:opacity-60">
            {refreshing ? 'Atualizando…' : 'Atualizar'}
          </button>
          <p role="status" className="min-w-0 text-sm text-muted">
            {`Conta ${user} no chess.com. `}
            {newCount !== null && newCount > 0 ? `${newCount} ${newCount === 1 ? 'partida nova' : 'partidas novas'}. ` : ''}
            {updatedAt !== null ? `Atualizado às ${formatTime(updatedAt)}.` : ''}
          </p>
        </div>
      )}
      {newCount === 0 && !refreshing && <p className="mt-2 max-w-prose text-sm text-muted">Nenhuma partida nova. Se você acabou de jogar, o chess.com pode levar um tempo para publicar. Enquanto isso, dá para colar o PGN na tela inicial.</p>}

      {error && (
        <div role="alert" className="mt-3 rounded-md bg-surface p-4">
          <p className="font-medium text-(--text-blunder)">{error}</p>
          <button type="button" onClick={() => void refresh()} className="mt-2 min-h-11 rounded-md border border-line px-4 font-semibold hover:bg-sunken">
            Tentar de novo
          </button>
        </div>
      )}

      {(queue.remaining > 0 || queue.error) && (
        <div role="status" className="mt-3 rounded-md bg-surface p-3">
          {queue.error ? (
            <p className="font-medium text-(--text-blunder)">{queue.error}</p>
          ) : (
            <p className="font-semibold">{queue.held ? `Fila parada enquanto você joga: faltam ${queue.remaining}.` : `Analisando: ${queue.done} prontas, faltam ${queue.remaining}.`}</p>
          )}
          {queue.current && <p className="truncate text-sm text-muted">{queue.current}</p>}
          <p className="text-sm text-muted">Pode sair desta tela. Se fechar o app, a fila continua ao abrir de novo.</p>
          <div className="mt-2 flex gap-2">
            {queue.error && (
              <button type="button" onClick={() => void analysisQueue.resume()} className="min-h-11 rounded-md bg-action px-4 font-semibold text-on-action">
                Tentar de novo
              </button>
            )}
            <button type="button" onClick={() => void analysisQueue.cancel()} className="min-h-11 rounded-md border border-line px-4 font-semibold hover:bg-sunken">
              Cancelar a fila
            </button>
          </div>
        </div>
      )}

      {records.length > 0 && (
        <>
          <label htmlFor="busca-partidas" className="sr-only">
            Buscar por adversário, abertura, marcador ou nota
          </label>
          <input
            id="busca-partidas"
            type="search"
            value={filters.query}
            onChange={(event) => change({ query: event.target.value })}
            placeholder="Adversário, abertura, marcador ou nota"
            className="mt-4 min-h-12 w-full rounded-md border border-line bg-surface px-3 text-base"
          />
          <div role="group" aria-label="Filtrar por resultado" className="mt-3 flex flex-wrap gap-1.5">
            <Chip active={filters.outcome === 'all'} onClick={() => change({ outcome: 'all' })}>
              Todas
            </Chip>
            {(Object.keys(OUTCOME) as GameOutcome[]).map((id) => (
              <Chip key={id} active={filters.outcome === id} onClick={() => change({ outcome: id })}>
                {OUTCOME[id].plural}
              </Chip>
            ))}
          </div>
          <div role="group" aria-label="Filtrar por ritmo" className="mt-1.5 flex flex-wrap gap-1.5">
            {TIME_CLASSES.map(({ id, label }) => (
              <Chip key={id} active={filters.timeClass === id} onClick={() => change({ timeClass: filters.timeClass === id ? 'all' : id })}>
                {label}
              </Chip>
            ))}
          </div>
          <details className="mt-2">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">Mais filtros</summary>
            <div className="grid gap-2 pb-2 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Cor
                <select value={filters.color} onChange={(event) => change({ color: event.target.value as GameFilters['color'] })} className="mt-1 block min-h-11 w-full rounded-md border border-line bg-surface px-2 text-base font-normal">
                  <option value="all">Qualquer cor</option>
                  <option value="w">De brancas</option>
                  <option value="b">De pretas</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Análise
                <select value={filters.state} onChange={(event) => change({ state: event.target.value as GameFilters['state'] })} className="mt-1 block min-h-11 w-full rounded-md border border-line bg-surface px-2 text-base font-normal">
                  <option value="all">Todas</option>
                  <option value="analyzed">Analisadas</option>
                  <option value="unanalyzed">Ainda sem análise</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Origem
                <select value={filters.source} onChange={(event) => change({ source: event.target.value as GameFilters['source'] })} className="mt-1 block min-h-11 w-full rounded-md border border-line bg-surface px-2 text-base font-normal">
                  <option value="all">Todas</option>
                  <option value="chesscom">chess.com</option>
                  <option value="bot">Contra bots</option>
                  <option value="pgn">PGN colado</option>
                </select>
              </label>
              {allTags.length > 0 && (
                <label className="text-sm font-semibold">
                  Marcador
                  <select value={filters.tag} onChange={(event) => change({ tag: event.target.value })} className="mt-1 block min-h-11 w-full rounded-md border border-line bg-surface px-2 text-base font-normal">
                    <option value="">Qualquer um</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </details>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="tabular text-sm text-muted">
              {visible.length} {visible.length === 1 ? 'partida' : 'partidas'}
              {user && archives.length > 0 && monthsLoaded > 0 ? `, do chess.com desde ${monthLabel(archives[Math.min(monthsLoaded, archives.length) - 1])}` : ''}
            </p>
            {toAnalyze.length > 0 && (
              <button type="button" onClick={() => void analysisQueue.add(toAnalyze.map((record) => record.key))} className="min-h-11 rounded-md bg-action px-4 font-semibold text-on-action">
                Analisar {toAnalyze.length === 1 ? 'a última' : `as últimas ${toAnalyze.length}`}
              </button>
            )}
          </div>
        </>
      )}

      {visible.length > 0 && (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-md bg-surface">
          {visible.slice(0, limit).map((record) => {
            const view = viewRecord(record)
            const outcome = record.outcome && OUTCOME[record.outcome]
            const klass = timeClassOf(record)
            return (
              <li key={record.key}>
                <div className="flex items-stretch">
                  <button type="button" onClick={() => onOpen(record)} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-1 pl-3 text-left hover:bg-sunken">
                    {record.userColor && (
                      <span
                        aria-hidden="true"
                        className="size-3 shrink-0 rounded-full border border-muted"
                        style={{ backgroundColor: record.userColor === 'w' ? 'var(--share-white)' : 'var(--share-black)' }}
                        title={record.userColor === 'w' ? 'Você jogou de brancas' : 'Você jogou de pretas'}
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{view.title}</span>
                      <span className="tabular block truncate text-sm text-muted">
                        {[formatDay(record.playedAt), klass ? timeClassLabel(klass) : '', view.myRating || view.opponentRating ? `${view.myRating ?? '?'} x ${view.opponentRating ?? '?'}` : ''].filter(Boolean).join(', ')}
                      </span>
                      {record.opening && <span className="block truncate text-sm text-muted">{formatOpening(record.opening)}</span>}
                      {record.digest && record.digest.errors.length > 0 && <span className="block text-sm font-semibold">Virou no lance {record.digest.errors.reduce((worst, error) => (error.loss > worst.loss ? error : worst)).moveNumber}</span>}
                      {record.digest && record.userColor && (record.digest.counts[record.userColor].brilliant ?? 0) > 0 && (
                        <span className="block text-sm font-bold text-(--text-brilliant)">{record.digest.counts[record.userColor].brilliant === 1 ? '!! 1 lance brilhante' : `!! ${record.digest.counts[record.userColor].brilliant} lances brilhantes`}</span>
                      )}
                      {(record.tags.length > 0 || record.note) && <span className="block truncate text-sm text-muted">{[...record.tags, record.note].filter(Boolean).join(', ')}</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      {outcome && (
                        <span className="block text-sm font-bold" style={{ color: outcome.color }}>
                          {outcome.label}
                        </span>
                      )}
                      {view.accuracy !== null && <span className="tabular block text-xs text-muted">{`Precisão ${view.accuracy.toFixed(0)}%`}</span>}
                      <span className={`block text-xs ${record.digest ? 'font-semibold text-(--positive)' : 'text-muted'}`}>{record.digest ? 'Analisada' : record.queued ? 'Na fila' : 'Sem análise'}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Nota, marcadores e mais opções de ${view.title}`}
                    aria-expanded={openDetails === record.key}
                    onClick={() => setOpenDetails(openDetails === record.key ? null : record.key)}
                    className="flex w-11 shrink-0 items-center justify-center text-muted hover:bg-sunken hover:text-ink"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="currentColor">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>
                </div>
                {openDetails === record.key && <GameDetails key={record.key} record={record} onClose={() => setOpenDetails(null)} />}
              </li>
            )
          })}
        </ul>
      )}

      {visible.length > limit && (
        <button type="button" onClick={() => setLimit((value) => value + PAGE_SIZE)} className="mt-3 min-h-12 w-full rounded-md border border-line font-semibold hover:bg-sunken">
          Mostrar mais {Math.min(PAGE_SIZE, visible.length - limit)}
        </button>
      )}

      {records.length === 0 && !refreshing && !error && (
        <p className="mt-4 rounded-md bg-surface p-4 text-muted">{user ? 'Nenhuma partida por aqui. Jogue contra um bot ou cole um PGN na tela inicial.' : 'Digite seu usuário para buscar as partidas, ou cole um PGN na tela inicial.'}</p>
      )}
      {records.length > 0 && visible.length === 0 && (
        <div className="mt-3 rounded-md bg-surface p-4">
          <p className="text-muted">{filtering ? 'Nenhuma partida com estes filtros.' : 'Nenhuma partida.'}</p>
          {filtering && (
            <button type="button" onClick={() => change(NO_FILTERS)} className="mt-2 min-h-11 rounded-md border border-line px-4 font-semibold hover:bg-sunken">
              Limpar filtros
            </button>
          )}
        </div>
      )}
      {refreshing && records.length === 0 && <p className="mt-4 text-muted">Buscando partidas no chess.com…</p>}

      {hasMoreMonths && !error && (
        <button type="button" disabled={loadingMonth} onClick={() => void loadPreviousMonth()} className="mt-3 min-h-12 w-full rounded-md border border-line font-semibold hover:bg-sunken disabled:opacity-60">
          {loadingMonth ? 'Buscando…' : `Buscar ${monthLabel(archives[monthsLoaded])}`}
        </button>
      )}
    </main>
  )
}
