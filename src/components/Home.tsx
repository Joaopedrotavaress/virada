import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { formatOpening } from '../chess/book'
import { FAMOUS_MOMENTS, momentLine, pickMoment } from '../chess/famous'
import { BOTS } from '../bots/bots'
import { type GameRecord, recordsFor, removeRecord, useAllRecords } from '../data/library'
import { useInstall } from '../pwa'
import { navigate } from '../route'
import type { ActiveGame } from '../storage'
import { Icon } from './Icons'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { Professor } from './Professor'
import { Placa, RevelationBoard, placaDelay } from './Revelation'
import { TodayCard } from './TodayCard'
import { viewRecord } from './Games'

const NextLessonCard = lazy(() => import('../learn/RoadmapScreen').then((module) => ({ default: module.NextLessonCard })))

const DEPTHS = [
  { value: 12, label: 'Rápida', hint: 'Boa para uma olhada. Pode deixar passar táticas longas.' },
  { value: 15, label: 'Normal', hint: 'O equilíbrio para a maioria das partidas.' },
  { value: 18, label: 'Profunda', hint: 'Mais lenta e mais confiável nas táticas.' },
  { value: 20, label: 'Extra', hint: 'Uns 5 minutos numa partida de 50 lances no computador, e bem mais no celular.' },
  { value: 22, label: 'Máxima', hint: 'Bem lenta: uns 10 minutos numa partida de 50 lances no computador. No celular, deixe na tomada.' },
]

const RECENT_LIMIT = 6

interface HomeProps {
  pgn: string
  onPgnChange: (text: string) => void
  depth: number
  onDepthChange: (depth: number) => void
  username: string
  onUsernameChange: (username: string) => void
  error: string | null
  activeGame: ActiveGame | null
  onAbandonGame: () => void
  onAnalyze: () => void
  onSample: () => void
  onOpen: (record: GameRecord) => void
}

const inputClass =
  'w-full rounded-md border border-line bg-surface text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink'

const OUTCOME_LABEL = { win: 'vitória', loss: 'derrota', draw: 'empate' }

function UserForm({ username, onChange, onSubmit, autoFocus = false, submitLabel = 'Buscar partidas', help = 'Também serve para o tabuleiro abrir virado para o seu lado.' }: { username: string; onChange: (name: string) => void; onSubmit: () => void; autoFocus?: boolean; submitLabel?: string; help?: string }) {
  const [needsUser, setNeedsUser] = useState(false)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!username.trim()) {
          setNeedsUser(true)
          return
        }
        onSubmit()
      }}
    >
      <label htmlFor="usuario" className="mb-1.5 block text-sm font-semibold">
        Seu usuário do chess.com
      </label>
      <div className="flex gap-2">
        <input
          id="usuario"
          type="text"
          value={username}
          autoFocus={autoFocus}
          onChange={(event) => {
            setNeedsUser(false)
            onChange(event.target.value)
          }}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="username"
          spellCheck={false}
          aria-describedby="ajuda-usuario"
          className={`${inputClass} min-h-12 min-w-0 flex-1 px-3 text-base`}
        />
        <button type="submit" className="min-h-12 shrink-0 rounded-md bg-action px-4 font-semibold text-on-action sm:px-6">
          {submitLabel}
        </button>
      </div>
      <p id="ajuda-usuario" role={needsUser ? 'alert' : undefined} className={`mt-2 text-sm ${needsUser ? 'font-medium text-(--text-blunder)' : 'text-muted'}`}>
        {needsUser ? 'Digite seu usuário para buscar as partidas.' : help}
      </p>
    </form>
  )
}

function PgnForm({ pgn, depth, error, onPgnChange, onDepthChange, onAnalyze, onSample }: Pick<HomeProps, 'pgn' | 'depth' | 'error' | 'onPgnChange' | 'onDepthChange' | 'onAnalyze' | 'onSample'>) {
  const hint = DEPTHS.find((option) => option.value === depth)?.hint
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onAnalyze()
      }}
    >
      <label htmlFor="pgn" className="mb-1.5 block text-sm font-semibold">
        Cole o PGN da partida
      </label>
      <textarea
        id="pgn"
        value={pgn}
        onChange={(event) => onPgnChange(event.target.value)}
        rows={5}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-describedby={error ? 'erro-pgn' : 'ajuda-pgn'}
        aria-invalid={Boolean(error)}
        placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ..."
        className={`${inputClass} block resize-y p-3 text-base leading-relaxed`}
      />
      {error ? (
        <p id="erro-pgn" role="alert" className="mt-2 text-sm font-medium text-(--text-blunder)">
          {error}
        </p>
      ) : (
        <p id="ajuda-pgn" className="mt-2 text-sm text-muted">
          No chess.com, abra a partida, toque em Compartilhar e copie o PGN.
        </p>
      )}

      <fieldset className="mt-6">
        <legend className="mb-1.5 text-sm font-semibold">Profundidade</legend>
        <div className="grid grid-cols-5 gap-px overflow-hidden rounded-md border border-line bg-line">
          {DEPTHS.map((option) => (
            <label
              key={option.value}
              className={`flex min-h-11 cursor-pointer flex-col items-center justify-center px-1 py-1.5 text-center has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink ${
                depth === option.value ? 'bg-ink text-bg' : 'bg-surface text-ink'
              }`}
            >
              <input type="radio" name="profundidade" value={option.value} checked={depth === option.value} onChange={() => onDepthChange(option.value)} className="sr-only" />
              <span className="text-xs font-semibold sm:text-sm">{option.label}</span>
              <span className="tabular text-xs opacity-80">{option.value}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">{hint}</p>
      </fieldset>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="submit" className="min-h-12 flex-1 rounded-md border border-ink px-5 font-semibold sm:flex-none sm:px-8">
          Analisar partida
        </button>
        <button type="button" onClick={onSample} className="min-h-12 rounded-md border border-line px-5 font-semibold text-ink hover:bg-sunken">
          Partida de exemplo
        </button>
      </div>
    </form>
  )
}

function RecentGames({ records, onOpen }: { records: GameRecord[]; onOpen: (record: GameRecord) => void }) {
  return (
    <ul className="mt-3 divide-y divide-line border-y border-line">
      {records.map((record) => {
        const view = viewRecord(record)
        return (
          <li key={record.key} className="flex items-stretch">
            <button type="button" onClick={() => onOpen(record)} className="min-w-0 flex-1 py-3 pr-2 text-left hover:bg-sunken">
              <span className="block truncate font-semibold">{view.title}</span>
              {record.opening && <span className="block truncate text-sm text-muted">{formatOpening(record.opening)}</span>}
              <span className="tabular mt-0.5 block truncate text-sm text-muted">
                {[record.outcome ? OUTCOME_LABEL[record.outcome] : record.result === '*' ? '' : record.result, new Date(record.playedAt).toLocaleDateString('pt-BR'), record.digest ? (view.accuracy !== null ? `precisão ${view.accuracy.toFixed(0)}%` : '') : 'toque para analisar'].filter(Boolean).join(', ')}
              </span>
            </button>
            <button type="button" onClick={() => void removeRecord(record.key)} aria-label={`Apagar a partida contra ${view.title}`} className="flex w-11 shrink-0 items-center justify-center text-xl text-muted hover:bg-sunken hover:text-ink">
              <Icon name="close" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** A animação toca uma vez por visita: voltar para o início não repete nem troca a jogada. */
let heroPlayed = false
let heroMoment: number | null = null

const finishAnimations = (element: HTMLElement) => element.getAnimations({ subtree: true }).forEach((animation) => animation.finish())

/** Uma jogada famosa, sorteada, e o Seu Nonato comentando. */
function HomeHero() {
  const [animate, setAnimate] = useState(() => !heroPlayed)
  const [index, setIndex] = useState(() => (heroMoment ??= pickMoment()))
  useEffect(() => {
    heroPlayed = true
  }, [])
  const moment = FAMOUS_MOMENTS[index]
  const delayMs = placaDelay(moment.moves.length)
  const showAnother = () => {
    heroMoment = pickMoment(index)
    setAnimate(true)
    setIndex(heroMoment)
  }
  return (
    <div onClick={(event) => finishAnimations(event.currentTarget)}>
      <div className="mx-auto max-w-[max(14rem,calc(100dvh-25rem))] px-5 lg:max-w-none lg:px-0">
        <RevelationBoard key={index} fen={moment.fen} moves={moment.moves} focus={moment.focus} focusAt={moment.focusAt} orientation={moment.orientation} animate={animate} />
      </div>
      <div className="mt-3 overflow-hidden">
        <Placa key={index} number={moment.number} title={moment.title} note={moment.note} delayMs={delayMs} animate={animate} />
      </div>
      <div className="mt-2 px-5 lg:px-0">
        <Professor say={`${index}`} talkMs={1600} delayMs={animate ? delayMs + 300 : 0}>
          <div className="flex min-h-11 items-center justify-between gap-2 rounded-md bg-surface py-1 pr-1 pl-3">
            <p className="text-sm font-semibold">{momentLine(index)}</p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                showAnother()
              }}
              className="min-h-9 shrink-0 rounded-md px-2.5 text-sm font-semibold underline hover:bg-sunken"
            >
              Mostra outra
            </button>
          </div>
        </Professor>
      </div>
    </div>
  )
}

export function Home(props: HomeProps) {
  const { username, activeGame } = props
  const { mode: installMode, install } = useInstall()
  const [changingUser, setChangingUser] = useState(false)
  const all = useAllRecords()
  const records = useMemo(() => recordsFor(all, username), [all, username])
  // Recentes: o que a pessoa já olhou ou jogou aqui. As demais partidas do chess.com ficam em Partidas.
  const recent = useMemo(() => records.filter((record) => record.digest || record.source !== 'chesscom').slice(0, RECENT_LIMIT), [records])
  const returning = records.length > 0 || Boolean(username.trim())
  const activeBot = activeGame && BOTS.find((bot) => bot.id === activeGame.botId)

  const pgnForm = <PgnForm {...props} />
  const footer = (
    <footer className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
      <p className="font-display w-full text-xl font-bold text-ink">Feito com carinho no Brasil</p>
      <a
        href="#/dados"
        onClick={(event) => {
          event.preventDefault()
          navigate('#/dados')
        }}
        className="flex min-h-11 items-center font-semibold text-ink underline"
      >
        Seus dados e backup
      </a>
      <span>
        Análise feita pelo{' '}
        <a href="https://github.com/nmrugg/stockfish.js" className="underline" rel="noreferrer" target="_blank">
          Stockfish.js
        </a>{' '}
        (licença{' '}
        <a href="/engine/LICENSE.txt" className="underline" target="_blank">
          GPLv3
        </a>
        ).
      </span>
    </footer>
  )
  const installSection = installMode !== 'none' && (
    <section className="mt-10 border-t border-line pt-6">
      <h2 className="font-display text-xl font-semibold">Use como um app</h2>
      {installMode === 'prompt' ? (
        <>
          <p className="mt-1 max-w-prose text-muted">Instalado, ele abre direto da tela inicial e funciona sem internet.</p>
          <button type="button" onClick={() => void install()} className="mt-3 min-h-12 w-full rounded-md border border-line px-5 font-semibold hover:bg-sunken sm:w-auto">
            Instalar app
          </button>
        </>
      ) : (
        <p className="mt-1 max-w-prose text-muted">No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início. Assim ele abre como um app e funciona sem internet.</p>
      )}
    </section>
  )

  if (!returning) {
    return (
      <div className="mx-auto w-full max-w-5xl pb-12 lg:px-4 lg:pt-8">
        <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
          <div>
            <div className="flex items-center justify-between py-1 pr-2 pl-5 lg:hidden">
              <Logo />
              <ThemeToggle />
            </div>
            <HomeHero />
          </div>
          <main className="flex min-w-0 flex-col px-5 pt-4 lg:px-0 lg:pt-0">
            <div className="order-1 lg:order-2 lg:mt-5">
              <UserForm username={username} onChange={props.onUsernameChange} onSubmit={() => navigate('#/partidas')} submitLabel="Achar a virada" help="Suas partidas públicas, sem cadastro." />
            </div>
            <div className="order-2 mt-4 lg:order-1 lg:mt-0">
              <h1 className="font-display text-3xl leading-none font-extrabold lg:text-6xl">
                Toda partida tem
                <br />
                um ponto de virada.
                <br />
                Ache o seu.
              </h1>
              <p className="mt-3 max-w-prose text-base text-muted">O Stockfish analisa cada lance no seu aparelho. O Virada explica o erro em português e transforma em treino. Grátis, sem cadastro.</p>
            </div>
            <div className="order-3 mt-8">
            {pgnForm}
            <section className="mt-10 border-t border-line pt-6">
              <h2 className="font-display text-2xl font-bold">Prefere jogar agora?</h2>
              <p className="mt-1 max-w-prose text-muted">Tem doze adversários, cada um com seu jeito, e o treinador do seu lado avisando dos erros. Depois, é só revisar.</p>
              <button type="button" onClick={() => navigate('#/jogar')} className="mt-3 min-h-12 w-full rounded-md border border-line px-5 font-semibold hover:bg-sunken sm:w-auto">
                Jogar contra um bot
              </button>
            </section>
            <section className="mt-10 border-t border-line pt-6">
              <h2 className="font-display text-2xl font-bold">Quer aprender do começo?</h2>
              <p className="mt-1 max-w-prose text-muted">Um caminho em quatro níveis, das regras ao cálculo, com o Seu Nonato mostrando no tabuleiro.</p>
              <button type="button" onClick={() => navigate('#/aprender')} className="mt-3 min-h-12 w-full rounded-md border border-line px-5 font-semibold hover:bg-sunken sm:w-auto">
                Ver o caminho
              </button>
            </section>
            {installSection}
            {footer}
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-10 lg:px-4 lg:pt-8">
      <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div className="lg:sticky lg:top-4">
          <div className="flex items-center justify-between py-1 pr-2 pl-5 lg:hidden">
            <Logo />
            <ThemeToggle />
          </div>
          <HomeHero />
        </div>

        <main className="min-w-0 px-5 pt-5 lg:px-0 lg:pt-0">
          <h1 className="font-display text-4xl leading-none font-extrabold lg:text-5xl">{username.trim() ? `E aí, ${username.trim()}?` : 'O que vamos fazer hoje?'}</h1>

          {activeGame && (
            <section aria-label="Partida em andamento" className="mt-4 rounded-md bg-action p-4 text-on-action">
              <p className="font-semibold">Você tem uma partida em andamento{activeBot ? ` contra ${activeBot.name}` : ''}.</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => navigate('#/jogo')} className="min-h-11 flex-1 rounded-md bg-on-action px-4 font-semibold text-action sm:flex-none">
                  Continuar
                </button>
                <button type="button" onClick={props.onAbandonGame} className="min-h-11 flex-1 rounded-md border border-on-action/40 px-4 font-semibold sm:flex-none">
                  Abandonar
                </button>
              </div>
            </section>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => navigate('#/partidas')} className="min-h-14 rounded-md bg-action px-5 font-semibold text-on-action">
              Ver minhas partidas
            </button>
            <button type="button" onClick={() => navigate('#/jogar')} className="min-h-14 rounded-md border border-line px-5 font-semibold hover:bg-sunken">
              Jogar contra um bot
            </button>
          </div>

          <TodayCard />
          <Suspense fallback={null}>
            <NextLessonCard compact />
          </Suspense>

          <section className="mt-6">
            <h2 className="font-display text-2xl font-bold">Partidas recentes</h2>
            {recent.length === 0 ? (
              <p className="mt-2 max-w-prose text-sm text-muted">As partidas que você analisar ou jogar aqui ficam guardadas neste aparelho, para abrir de novo sem esperar.</p>
            ) : (
              <RecentGames records={recent} onOpen={props.onOpen} />
            )}
            {records.length > recent.length && (
              <button type="button" onClick={() => navigate('#/partidas')} className="mt-2 min-h-11 font-semibold underline">
                Ver todas as {records.length} partidas
              </button>
            )}
          </section>

          <details className="mt-6 border-t border-line pt-3" open={Boolean(props.error) || undefined}>
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Analisar um PGN</summary>
            <div className="pt-2">{pgnForm}</div>
          </details>

          <div className="border-t border-line py-3 text-sm">
            {changingUser ? (
              <UserForm
                username={username}
                onChange={props.onUsernameChange}
                autoFocus
                onSubmit={() => {
                  setChangingUser(false)
                  navigate('#/partidas')
                }}
              />
            ) : (
              <p className="flex flex-wrap items-center gap-x-2 text-muted">
                {username.trim() ? `Conta do chess.com: ${username.trim()}.` : 'Nenhuma conta do chess.com ligada.'}
                <button type="button" onClick={() => setChangingUser(true)} className="min-h-11 font-semibold text-ink underline">
                  {username.trim() ? 'Trocar' : 'Ligar conta'}
                </button>
              </p>
            )}
          </div>
          {installSection}
          {footer}
        </main>
      </div>
    </div>
  )
}
