import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GameResult, GameSetup } from './bots/useBotGame'
import { type GameAnalysis, analyzeGame, gameId, gameKey } from './chess/analyze'
import type { Color } from './chess/evaluation'
import { PgnError, type ParsedGame, parsePgn } from './chess/pgn'
import { SAMPLE_PGN } from './chess/sample'
import { AnalysisView } from './components/AnalysisView'
import { Analyzing } from './components/Analyzing'
import { BotGame } from './components/BotGame'
import { type BotChoice, BotSetup } from './components/BotSetup'
import { Home } from './components/Home'
import { type BrowserMemo, GameBrowser } from './components/GameBrowser'
import type { ChessComGame } from './chesscom/api'
import { viewGame } from './chesscom/api'
import { EngineAbortError, getEngine } from './engine/stockfish'
import { loadDepth, loadPending, loadRecent, loadUsername, removeAnalysis, removePending, saveAnalysis, saveDepth, savePending, saveUsername } from './storage'

type Screen =
  | { name: 'home' }
  | { name: 'analyzing'; game: ParsedGame; done: number; total: number; userColor: Color | null }
  | { name: 'analysis'; analysis: GameAnalysis }
  | { name: 'bot-setup' }
  | { name: 'browse'; username: string }
  | { name: 'bot-game'; setup: GameSetup; round: number }

interface StartOptions {
  /** Cor da pessoa quando não dá para saber pelo nome (partidas contra bots). */
  userColor?: Color
  source?: GameAnalysis['source']
  /** Troca a tela atual no histórico em vez de empilhar outra. */
  replace?: boolean
}

/** Cor do usuário nesta partida, comparando o nome sem diferenciar maiúsculas. */
function colorOfUser(username: string, white: string, black: string): Color | null {
  const name = username.trim().toLowerCase()
  if (!name) return null
  if (white.trim().toLowerCase() === name) return 'w'
  if (black.trim().toLowerCase() === name) return 'b'
  return null
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [pgn, setPgn] = useState('')
  const [depth, setDepth] = useState(loadDepth)
  const [username, setUsername] = useState(loadUsername)
  const [recent, setRecent] = useState(loadRecent)
  const [pending, setPending] = useState(loadPending)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const running = useRef<AbortController | null>(null)

  // Voltar do navegador (ou do celular) leva para a tela inicial, sem sair do app.
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      running.current?.abort()
      running.current = null
      const state = event.state as { tela?: string; usuario?: string } | null
      // Quem abriu uma partida da lista volta para a lista, não para o início.
      setScreen(state?.tela === 'partidas' && state.usuario ? { name: 'browse', username: state.usuario } : { name: 'home' })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const leave = useCallback(() => window.history.back(), [])

  const open = useCallback((analysis: GameAnalysis) => {
    window.history.pushState({ tela: 'analise' }, '')
    setScreen({ name: 'analysis', analysis })
  }, [])

  const start = useCallback(
    async (text: string, options: StartOptions = {}) => {
      setError(null)
      setNotice(null)

      let game: ParsedGame
      try {
        game = parsePgn(text)
      } catch (failure) {
        setError(failure instanceof PgnError ? failure.message : 'Não consegui ler este PGN. Confira se o texto foi copiado inteiro.')
        return
      }

      const saved = recent.find((analysis) => analysis.id === gameId(game, depth))
      if (saved) {
        if (options.replace) {
          window.history.replaceState({ tela: 'analise' }, '')
          setScreen({ name: 'analysis', analysis: saved })
          return
        }
        return open(saved)
      }

      const controller = new AbortController()
      running.current = controller
      if (options.replace) window.history.replaceState({ tela: 'analisando' }, '')
      else window.history.pushState({ tela: 'analisando' }, '')
      const userColor = options.userColor ?? colorOfUser(username, game.white, game.black)
      setScreen({ name: 'analyzing', game, done: 0, total: game.positions.length, userColor })

      try {
        const engine = getEngine()
        await engine.ready
        const analysis = await analyzeGame(engine, game, depth, {
          signal: controller.signal,
          onProgress: (done, total) => {
            if (!controller.signal.aborted) setScreen({ name: 'analyzing', game, done, total, userColor })
          },
        })
        if (controller.signal.aborted) return
        running.current = null
        const stored: GameAnalysis = { ...analysis, userColor: options.userColor, source: options.source }
        if (!saveAnalysis(stored)) setNotice('Esta análise não foi salva: o navegador está sem espaço para guardar partidas.')
        setRecent(loadRecent())
        setPending(removePending(gameKey(game)))
        setScreen({ name: 'analysis', analysis: stored })
      } catch (failure) {
        if (controller.signal.aborted || failure instanceof EngineAbortError) return
        running.current = null
        setError(`A análise parou. ${failure instanceof Error ? failure.message : 'O Stockfish não respondeu. Recarregue a página e tente de novo.'}`)
        leave()
      }
    },
    [depth, leave, open, recent, username],
  )

  const playerName = username.trim() || 'Você'
  const browserMemo = useRef<BrowserMemo | null>(null)
  const analyzedLinks = useMemo(() => new Set(recent.flatMap((analysis) => (analysis.link ? [analysis.link] : []))), [recent])

  const openChessComGame = useCallback(
    (game: ChessComGame, user: string) => {
      const saved = recent.find((analysis) => analysis.link === game.url)
      if (saved) return open(saved)
      void start(game.pgn, { userColor: viewGame(game, user).myColor, source: 'chesscom' })
    },
    [open, recent, start],
  )

  const startBotGame = useCallback(
    (choice: BotChoice) => {
      window.history.replaceState({ tela: 'jogo' }, '')
      setScreen({ name: 'bot-game', setup: { ...choice, playerName }, round: Date.now() })
    },
    [playerName],
  )

  const onBotGameFinished = useCallback(
    (setup: GameSetup, result: GameResult) => {
      if (!result.hasMoves) return
      const game = parsePgn(result.pgn)
      setPending(
        savePending({
          id: gameKey(game),
          pgn: result.pgn,
          white: game.white,
          black: game.black,
          result: game.result,
          date: game.date,
          userColor: setup.color,
          playedAt: Date.now(),
        }),
      )
    },
    [],
  )

  if (screen.name === 'analyzing') {
    return <Analyzing game={screen.game} done={screen.done} total={screen.total} orientation={screen.userColor === 'b' ? 'black' : 'white'} onCancel={leave} />
  }

  if (screen.name === 'analysis') {
    return (
      <AnalysisView
        key={screen.analysis.id}
        analysis={screen.analysis}
        userColor={screen.analysis.userColor ?? colorOfUser(username, screen.analysis.white, screen.analysis.black)}
        notice={notice}
        onBack={leave}
      />
    )
  }

  if (screen.name === 'browse') {
    return (
      <GameBrowser
        key={screen.username}
        username={screen.username}
        memo={browserMemo}
        analyzedLinks={analyzedLinks}
        onOpen={(game) => openChessComGame(game, screen.username)}
        onBack={leave}
      />
    )
  }

  if (screen.name === 'bot-setup') {
    return <BotSetup onStart={startBotGame} onBack={leave} />
  }

  if (screen.name === 'bot-game') {
    const { setup } = screen
    return (
      <BotGame
        key={screen.round}
        setup={setup}
        onFinished={(result) => onBotGameFinished(setup, result)}
        onReview={(result) => void start(result.pgn, { userColor: setup.color, source: 'bot', replace: true })}
        onRematch={() => setScreen({ name: 'bot-game', setup, round: Date.now() })}
        onLeave={leave}
      />
    )
  }

  return (
    <Home
      pgn={pgn}
      onPgnChange={(text) => {
        setPgn(text)
        setError(null)
      }}
      depth={depth}
      onDepthChange={(next) => {
        setDepth(next)
        saveDepth(next)
      }}
      username={username}
      onUsernameChange={(next) => {
        setUsername(next)
        saveUsername(next.trim())
      }}
      error={error}
      recent={recent}
      pending={pending}
      onAnalyze={() => void start(pgn)}
      onSample={() => {
        setPgn(SAMPLE_PGN)
        void start(SAMPLE_PGN)
      }}
      onOpen={open}
      onBrowse={() => {
        const user = username.trim()
        window.history.pushState({ tela: 'partidas', usuario: user }, '')
        setScreen({ name: 'browse', username: user })
      }}
      onOpenPending={(game) => void start(game.pgn, { userColor: game.userColor, source: 'bot' })}
      onRemove={(id) => setRecent(removeAnalysis(id))}
      onRemovePending={(id) => setPending(removePending(id))}
      onPlayBot={() => {
        window.history.pushState({ tela: 'bots' }, '')
        setScreen({ name: 'bot-setup' })
      }}
    />
  )
}
