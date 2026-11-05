import { useState } from 'react'
import type { GameAnalysis } from '../chess/analyze'
import { formatDate } from '../chess/pgn'
import { useInstall } from '../pwa'
import type { PendingGame } from '../storage'

const DEPTHS = [
  { value: 12, label: 'Rápida', hint: 'Boa para uma olhada. Pode deixar passar táticas longas.' },
  { value: 15, label: 'Normal', hint: 'O equilíbrio para a maioria das partidas.' },
  { value: 18, label: 'Profunda', hint: 'Mais lenta e mais confiável nas táticas.' },
]

interface HomeProps {
  pgn: string
  onPgnChange: (text: string) => void
  depth: number
  onDepthChange: (depth: number) => void
  username: string
  onUsernameChange: (username: string) => void
  error: string | null
  recent: GameAnalysis[]
  pending: PendingGame[]
  onAnalyze: () => void
  onSample: () => void
  onOpen: (analysis: GameAnalysis) => void
  onOpenPending: (game: PendingGame) => void
  onRemove: (id: string) => void
  onRemovePending: (id: string) => void
  onPlayBot: () => void
  onBrowse: () => void
}

const inputClass =
  'w-full rounded-md border border-line bg-surface text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink'

export function Home(props: HomeProps) {
  const { pgn, depth, username, error, recent, pending } = props
  const hint = DEPTHS.find((option) => option.value === depth)?.hint
  const [needsUser, setNeedsUser] = useState(false)
  const { mode: installMode, install } = useInstall()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-8 pb-12 lg:pt-16">
      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <main className="min-w-0">
          <header className="mb-8 flex items-start gap-4 sm:gap-6">
            <span aria-hidden="true" className="font-book -mt-2 text-6xl leading-none font-bold text-(--text-inaccuracy) sm:text-8xl sm:-mt-3">
              ?!
            </span>
            <div>
              <h1 className="font-book text-3xl leading-tight font-semibold sm:text-5xl">Onde a sua partida virou?</h1>
              <p className="mt-3 max-w-prose text-base text-muted">
                Cole o PGN e o Stockfish revisa cada lance aqui no seu navegador. Grátis, sem cadastro, e nada sai do seu aparelho.
              </p>
            </div>
          </header>

          <form
            className="mb-8"
            onSubmit={(event) => {
              event.preventDefault()
              if (!username.trim()) {
                setNeedsUser(true)
                return
              }
              props.onBrowse()
            }}
          >
            <label htmlFor="usuario" className="mb-1.5 block text-sm font-semibold">
              Seu usuário do chess.com
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="usuario"
                type="text"
                value={username}
                onChange={(event) => {
                  setNeedsUser(false)
                  props.onUsernameChange(event.target.value)
                }}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="username"
                spellCheck={false}
                aria-describedby="ajuda-usuario"
                className={`${inputClass} min-h-12 min-w-0 flex-1 px-3 text-base`}
              />
              <button type="submit" className="min-h-12 shrink-0 rounded-md bg-ink px-6 font-semibold text-bg">
                Buscar partidas
              </button>
            </div>
            <p id="ajuda-usuario" role={needsUser ? 'alert' : undefined} className={`mt-2 text-sm ${needsUser ? 'font-medium text-(--text-blunder)' : 'text-muted'}`}>
              {needsUser ? 'Digite seu usuário para buscar as partidas.' : 'Também serve para o tabuleiro abrir virado para o seu lado.'}
            </p>
          </form>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              props.onAnalyze()
            }}
          >
            <label htmlFor="pgn" className="mb-1.5 block text-sm font-semibold">
              Ou cole o PGN da partida
            </label>
            <textarea
              id="pgn"
              value={pgn}
              onChange={(event) => props.onPgnChange(event.target.value)}
              rows={5}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-describedby={error ? 'erro-pgn' : 'ajuda-pgn'}
              aria-invalid={Boolean(error)}
              placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ..."
              className={`${inputClass} font-book block resize-y p-3 text-base leading-relaxed`}
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
              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line">
                {DEPTHS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex min-h-11 cursor-pointer flex-col items-center justify-center px-1 py-1.5 text-center has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink ${
                      depth === option.value ? 'bg-ink text-bg' : 'bg-surface text-ink'
                    }`}
                  >
                    <input
                      type="radio"
                      name="profundidade"
                      value={option.value}
                      checked={depth === option.value}
                      onChange={() => props.onDepthChange(option.value)}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className="tabular text-xs opacity-80">{option.value}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-sm text-muted">{hint}</p>
            </fieldset>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="submit" className="min-h-12 flex-1 rounded-md border border-ink px-5 font-semibold sm:flex-none sm:px-8">
                Analisar partida
              </button>
              <button type="button" onClick={props.onSample} className="min-h-12 rounded-md border border-line px-5 font-semibold text-ink hover:bg-sunken">
                Partida de exemplo
              </button>
            </div>
          </form>

          <section className="mt-10 border-t border-line pt-6">
            <h2 className="font-book text-xl font-semibold">Prefere jogar agora?</h2>
            <p className="mt-1 max-w-prose text-muted">Enfrente um bot do seu nível, com o treinador avisando dos erros durante a partida. Depois, é só revisar.</p>
            <button type="button" onClick={props.onPlayBot} className="mt-3 min-h-12 w-full rounded-md border border-line px-5 font-semibold hover:bg-sunken sm:w-auto">
              Jogar contra um bot
            </button>
          </section>
        </main>

        <aside className="min-w-0 lg:pt-3">
          <h2 className="font-book text-xl font-semibold">Partidas recentes</h2>
          {recent.length === 0 && pending.length === 0 ? (
            <p className="mt-2 max-w-prose text-sm text-muted">As partidas que você analisar ficam guardadas aqui, neste aparelho, para abrir de novo sem esperar.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {pending.map((game) => (
                <li key={game.id} className="flex items-stretch">
                  <button type="button" onClick={() => props.onOpenPending(game)} className="min-w-0 flex-1 py-3 pr-2 text-left hover:bg-sunken">
                    <span className="block truncate font-semibold">{game.white}</span>
                    <span className="block truncate font-semibold">{game.black}</span>
                    <span className="tabular mt-0.5 block text-sm text-muted">{[game.result, formatDate(game.date), 'toque para analisar'].filter(Boolean).join(', ')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onRemovePending(game.id)}
                    aria-label={`Remover ${game.white} contra ${game.black}`}
                    className="flex w-11 shrink-0 items-center justify-center text-xl text-muted hover:bg-sunken hover:text-ink"
                  >
                    ×
                  </button>
                </li>
              ))}
              {recent.map((game) => (
                <li key={game.id} className="flex items-stretch">
                  <button type="button" onClick={() => props.onOpen(game)} className="min-w-0 flex-1 py-3 pr-2 text-left hover:bg-sunken">
                    <span className="block truncate font-semibold">{game.white}</span>
                    <span className="block truncate font-semibold">{game.black}</span>
                    <span className="tabular mt-0.5 block text-sm text-muted">
                      {[game.result === '*' ? '' : game.result, formatDate(game.date), `profundidade ${game.depth}`].filter(Boolean).join(', ')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onRemove(game.id)}
                    aria-label={`Remover ${game.white} contra ${game.black}`}
                    className="flex w-11 shrink-0 items-center justify-center text-xl text-muted hover:bg-sunken hover:text-ink"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {installMode !== 'none' && (
        <section className="mt-12 border-t border-line pt-6">
          <h2 className="font-book text-xl font-semibold">Use como um app</h2>
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
      )}

      <footer className="mt-16 text-sm text-muted">
        Análise feita pelo{' '}
        <a href="https://github.com/nmrugg/stockfish.js" className="underline" rel="noreferrer" target="_blank">
          Stockfish.js
        </a>{' '}
        (licença{' '}
        <a href="/engine/LICENSE.txt" className="underline" target="_blank">
          GPLv3
        </a>
        ).
      </footer>
    </div>
  )
}
