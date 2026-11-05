import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { BOTS } from './bots/bots'
import type { GameProgress, GameResult, GameSetup } from './bots/useBotGame'
import { type GameAnalysis, analyzeGame } from './chess/analyze'
import type { Color } from './chess/evaluation'
import { PgnError, type ParsedGame, parsePgn } from './chess/pgn'
import { SAMPLE_PGN } from './chess/sample'
import { Analyzing } from './components/Analyzing'
import { RevelationOverlay } from './components/Revelation'
import { CLASS_INFO } from './chess/classify'
import { turningPoint } from './chess/review'
import { BotGame } from './components/BotGame'
import { type BotChoice, BotSetup, type StartPoint } from './components/BotSetup'
import { DataScreen } from './components/DataScreen'
import { Games } from './components/Games'
import { Home } from './components/Home'
import { Shell } from './components/Shell'
import { Training } from './training/Training'
import { type GameRecord, addUnanalyzed, allRecords, colorOfUser, getAnalysis, initLibrary, recordKeyOf, saveAnalyzed, useAllRecords } from './data/library'
import { startLocalBackend } from './data/localBackend'
import { analysisQueue } from './data/queue'
import { EngineAbortError, getEngine } from './engine/stockfish'
import { gamePath, goBack, navigate, useRoute } from './route'
import { type ActiveGame, clearActiveGame, loadActiveGame, loadDepth, loadUsername, saveActiveGame, saveDepth, saveUsername } from './storage'

// O que tem gráfico fica fora do pacote inicial: a tela de abertura carrega bem mais rápido.
const AnalysisView = lazy(() => import('./components/AnalysisView').then((module) => ({ default: module.AnalysisView })))
const Progress = lazy(() => import('./components/Progress').then((module) => ({ default: module.Progress })))
const GuideHome = lazy(() => import('./guide/GuideScreens').then((module) => ({ default: module.GuideHome })))
const OpeningPage = lazy(() => import('./guide/GuideScreens').then((module) => ({ default: module.OpeningPage })))
const FamilyPage = lazy(() => import('./guide/GuideScreens').then((module) => ({ default: module.FamilyPage })))
const Practice = lazy(() => import('./guide/GuideScreens').then((module) => ({ default: module.Practice })))
const MyOpenings = lazy(() => import('./guide/GuideScreens').then((module) => ({ default: module.MyOpenings })))
const LessonScreen = lazy(() => import('./guide/LessonScreen').then((module) => ({ default: module.LessonScreen })))
const PuzzleScreen = lazy(() => import('./puzzles/PuzzleScreen').then((module) => ({ default: module.PuzzleScreen })))
const Session = lazy(() => import('./training/Session').then((module) => ({ default: module.Session })))

interface AnalysisJob {
  game: ParsedGame
  done: number
  total: number
  userColor: Color | null
}

interface StartOptions {
  /** Cor da pessoa quando não dá para saber pelo nome (partidas contra bots). */
  userColor?: Color | null
  source?: GameRecord['source']
  owner?: string
  key?: string
  playedAt?: number
  /** Troca a tela atual no histórico em vez de empilhar outra. */
  replace?: boolean
}

const loading = (
  <p role="status" className="p-6 text-muted">
    Carregando…
  </p>
)

/** Abre a análise pelo endereço. Sem análise guardada, mas com o PGN, analisa de novo. */
function GameRoute({ gameKey, username, notice, reveal, onRevealDone, onAnalyze, onPlayFrom }: { gameKey: string; username: string; notice: string | null; reveal: boolean; onRevealDone: () => void; onAnalyze: (record: GameRecord) => void; onPlayFrom: (start: StartPoint) => void }) {
  const [analysis, setAnalysis] = useState<GameAnalysis | null | undefined>(undefined)
  const records = useAllRecords()
  const record = records.find((item) => item.key === gameKey)
  const missing = analysis === null

  useEffect(() => {
    let alive = true
    setAnalysis(undefined)
    void getAnalysis(gameKey).then((found) => {
      if (alive) setAnalysis(found)
    })
    return () => {
      alive = false
    }
  }, [gameKey])

  useEffect(() => {
    if (missing && record && !record.deletedAt) onAnalyze(record)
    // Só quando descobre que falta a análise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing, record?.key])

  if (analysis === undefined) return loading
  if (!analysis) {
    if (record && !record.deletedAt) return loading
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="font-display text-3xl font-semibold">Partida não encontrada</h1>
        <p className="mt-2 text-muted">Ela não está guardada neste aparelho. Pode ter sido apagada, ou o link veio de outro aparelho.</p>
        <button type="button" onClick={() => navigate('#/partidas', { replace: true })} className="mt-4 min-h-12 w-full rounded-md bg-action font-semibold text-on-action">
          Ver minhas partidas
        </button>
      </main>
    )
  }
  const userColor = record?.userColor ?? analysis.userColor ?? colorOfUser(username, analysis.white, analysis.black)
  const turning = reveal ? turningPoint(analysis.moves) : null
  return (
    <Suspense fallback={loading}>
      {turning && (
        <RevelationOverlay
          fen={analysis.positions[turning.ply - 1].fen}
          uci={turning.uci}
          san={turning.san}
          moveNumber={turning.moveNumber}
          isUserMove={turning.color === userColor}
          label={CLASS_INFO[turning.cls].label}
          orientation={userColor === 'b' ? 'black' : 'white'}
          onDone={onRevealDone}
        />
      )}
      <AnalysisView
        key={analysis.id}
        analysis={analysis}
        record={record}
        userColor={userColor}
        notice={notice}
        onBack={goBack}
        onPlayFrom={onPlayFrom}
      />
    </Suspense>
  )
}

export default function App() {
  const route = useRoute()
  const [job, setJob] = useState<AnalysisJob | null>(null)
  const [pgn, setPgn] = useState('')
  const [depth, setDepth] = useState(loadDepth)
  const [username, setUsernameState] = useState(loadUsername)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [activeGame, setActiveGame] = useState(loadActiveGame)
  const [startPoint, setStartPoint] = useState<StartPoint | null>(null)
  const [revealKey, setRevealKey] = useState<string | null>(null)
  const running = useRef<AbortController | null>(null)

  const setUsername = useCallback((next: string) => {
    setUsernameState(next)
    saveUsername(next.trim())
  }, [])

  useEffect(() => {
    void initLibrary(username)
      .then(() => startLocalBackend())
      .then(() => analysisQueue.resume())
    // Só uma vez, ao abrir o app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Jogando ou esperando uma análise, o aparelho fica só para isso.
  useEffect(() => {
    analysisQueue.hold(route.name === 'bot-game' || route.name === 'analyzing')
  }, [route.name])

  // Saiu da tela de análise (voltar do celular, por exemplo): cancela. Recarregou no meio: volta ao início.
  useEffect(() => {
    if (route.name === 'analyzing') {
      if (!running.current) navigate('#/', { replace: true })
    } else if (running.current) {
      running.current.abort()
      running.current = null
    }
  }, [route])

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

      await initLibrary(username)
      const key = options.key ?? recordKeyOf(game)
      const saved = allRecords().find((record) => record.key === key && !record.deletedAt)
      // Já analisada com profundidade igual ou maior: não precisa esperar de novo.
      if (saved?.digest && saved.digest.depth >= depth && (await getAnalysis(key))) {
        navigate(gamePath(key), { replace: options.replace })
        return
      }

      const controller = new AbortController()
      running.current?.abort()
      running.current = controller
      const userColor = options.userColor ?? saved?.userColor ?? colorOfUser(username, game.white, game.black)
      setJob({ game, done: 0, total: game.positions.length, userColor })
      navigate('#/analisando', { replace: options.replace })

      try {
        const engine = getEngine()
        await engine.ready
        const analysis = await analyzeGame(engine, game, depth, {
          signal: controller.signal,
          onProgress: (done, total) => {
            if (!controller.signal.aborted) setJob({ game, done, total, userColor })
          },
        })
        if (controller.signal.aborted) return
        const { record, persisted } = await saveAnalyzed(
          { ...analysis, userColor: userColor ?? undefined, source: options.source === 'pgn' ? undefined : options.source },
          { pgn: text, key, userColor, source: options.source ?? saved?.source, owner: options.owner ?? saved?.owner, playedAt: options.playedAt ?? saved?.playedAt },
        )
        if (controller.signal.aborted) return
        if (!persisted) setNotice('Esta análise não foi salva: o navegador está sem espaço para guardar partidas.')
        running.current = null
        setRevealKey(record.key)
        navigate(gamePath(record.key), { replace: true })
      } catch (failure) {
        if (controller.signal.aborted || failure instanceof EngineAbortError) return
        running.current = null
        setError(`A análise parou. ${failure instanceof Error ? failure.message : 'O Stockfish não respondeu. Recarregue a página e tente de novo.'}`)
        goBack()
      }
    },
    [depth, username],
  )

  const openRecord = useCallback(
    (record: GameRecord, replace = false) => {
      if (record.digest) navigate(gamePath(record.key), { replace })
      else void start(record.pgn, { key: record.key, userColor: record.userColor, source: record.source, owner: record.owner, playedAt: record.playedAt, replace })
    },
    [start],
  )

  const playerName = username.trim() || 'Você'

  const startBotGame = useCallback(
    (choice: BotChoice) => {
      const active: ActiveGame = {
        botId: choice.bot.id,
        color: choice.color,
        coachOn: choice.coachOn,
        allowUndo: choice.allowUndo,
        playerName,
        startedAt: Date.now(),
        sans: startPoint?.sans ?? [],
        lockedPlies: startPoint?.sans?.length ?? 0,
        startFen: startPoint?.fen,
        time: choice.time,
      }
      saveActiveGame(active)
      setActiveGame(active)
      setStartPoint(null)
      navigate('#/jogo', { replace: true })
    },
    [playerName, startPoint],
  )

  const playFrom = useCallback((start: StartPoint) => {
    setStartPoint(start)
    navigate('#/jogar')
  }, [])

  const finishActive = useCallback(() => {
    clearActiveGame()
    setActiveGame(null)
  }, [])

  const onBotGameFinished = useCallback(
    (color: Color, result: GameResult) => {
      clearActiveGame()
      if (result.hasMoves) void addUnanalyzed({ pgn: result.pgn, userColor: color, source: 'bot', playedAt: Date.now() }).catch(() => undefined)
    },
    [],
  )

  const onBotGameProgress = useCallback((progress: GameProgress) => {
    const current = loadActiveGame()
    if (current) saveActiveGame({ ...current, ...progress })
  }, [])

  // ---------- Telas de tela cheia ----------

  if (route.name === 'analyzing') {
    if (!job) return loading
    return <Analyzing game={job.game} done={job.done} total={job.total} orientation={job.userColor === 'b' ? 'black' : 'white'} onCancel={goBack} />
  }

  if (route.name === 'game') {
    return <GameRoute gameKey={route.key} username={username} notice={notice} reveal={revealKey === route.key} onRevealDone={() => setRevealKey(null)} onAnalyze={(record) => void start(record.pgn, { key: record.key, userColor: record.userColor, source: record.source, owner: record.owner, playedAt: record.playedAt, replace: true })} onPlayFrom={playFrom} />
  }

  if (route.name === 'bot-game') {
    const bot = activeGame && BOTS.find((item) => item.id === activeGame.botId)
    if (!activeGame || !bot) {
      return (
        <main className="mx-auto max-w-md p-6">
          <h1 className="font-display text-3xl font-semibold">Nenhuma partida em andamento</h1>
          <button type="button" onClick={() => navigate('#/jogar', { replace: true })} className="mt-4 min-h-12 w-full rounded-md bg-action font-semibold text-on-action">
            Começar uma partida
          </button>
        </main>
      )
    }
    const setup: GameSetup = {
      bot,
      color: activeGame.color,
      coachOn: activeGame.coachOn,
      allowUndo: activeGame.allowUndo,
      playerName: activeGame.playerName,
      startFen: activeGame.startFen,
      initialSans: activeGame.sans,
      lockedPlies: activeGame.lockedPlies,
      time: activeGame.time,
      initialClocks: activeGame.clocks,
      initialStamps: activeGame.stamps,
    }
    return (
      <BotGame
        key={activeGame.startedAt}
        setup={setup}
        onFinished={(result) => onBotGameFinished(activeGame.color, result)}
        onProgress={onBotGameProgress}
        onReview={(result) => {
          finishActive()
          void start(result.pgn, { userColor: activeGame.color, source: 'bot', playedAt: Date.now(), replace: true })
        }}
        onRematch={() => {
          const next: ActiveGame = { ...activeGame, startedAt: Date.now(), sans: activeGame.sans.slice(0, activeGame.lockedPlies), clocks: undefined, stamps: undefined }
          saveActiveGame(next)
          setActiveGame(next)
        }}
        onLeave={() => {
          // Partida terminada sai da memória. Em andamento, continua para retomar depois.
          setActiveGame(loadActiveGame())
          navigate('#/', { replace: true })
        }}
      />
    )
  }

  if (route.name === 'session') {
    return (
      <Suspense fallback={loading}>
        <Session key={route.theme ?? 'hoje'} theme={route.theme} />
      </Suspense>
    )
  }

  if (route.name === 'lesson') {
    return (
      <Suspense fallback={loading}>
        <LessonScreen key={route.id} id={route.id} />
      </Suspense>
    )
  }

  if (route.name === 'practice') {
    return (
      <Suspense fallback={loading}>
        <Practice slug={route.slug} line={route.line} />
      </Suspense>
    )
  }

  if (route.name === 'bot-setup') {
    return (
      <BotSetup
        key={startPoint?.label ?? 'normal'}
        start={startPoint}
        onStart={startBotGame}
        onBack={() => {
          setStartPoint(null)
          goBack()
        }}
      />
    )
  }

  // ---------- Telas com a navegação do app ----------

  let content
  if (route.name === 'games') {
    content = <Games username={username} onUsernameChange={setUsername} onOpen={openRecord} />
  } else if (route.name === 'data') {
    content = <DataScreen username={username} />
  } else if (route.name === 'guide') {
    content = (
      <Suspense fallback={loading}>
        <GuideHome username={username} />
      </Suspense>
    )
  } else if (route.name === 'opening') {
    content = (
      <Suspense fallback={loading}>
        <OpeningPage key={route.slug} slug={route.slug} username={username} onPlayFrom={playFrom} />
      </Suspense>
    )
  } else if (route.name === 'family') {
    content = (
      <Suspense fallback={loading}>
        <FamilyPage key={route.id} id={route.id} onPlayFrom={playFrom} />
      </Suspense>
    )
  } else if (route.name === 'my-openings') {
    content = (
      <Suspense fallback={loading}>
        <MyOpenings username={username} />
      </Suspense>
    )
  } else if (route.name === 'puzzles') {
    content = (
      <Suspense fallback={loading}>
        <PuzzleScreen key={route.theme ?? 'lista'} theme={route.theme} username={username} />
      </Suspense>
    )
  } else if (route.name === 'training') {
    content = <Training username={username} />
  } else if (route.name === 'progress') {
    content = (
      <Suspense fallback={loading}>
        <Progress username={username} />
      </Suspense>
    )
  } else {
    content = (
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
        onUsernameChange={setUsername}
        error={error}
        activeGame={activeGame}
        onAbandonGame={finishActive}
        onAnalyze={() => void start(pgn)}
        onSample={() => {
          setPgn(SAMPLE_PGN)
          void start(SAMPLE_PGN)
        }}
        onOpen={openRecord}
      />
    )
  }

  return <Shell route={route}>{content}</Shell>
}
