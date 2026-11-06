import { Chess, type Move } from 'chess.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type MoveClass, classOf, gradeMove } from '../chess/classify'
import { type PositionResult, evaluatePosition } from '../chess/evaluate'
import { type Color, type Eval, whiteWinPercent, winPercentFor } from '../chess/evaluation'
import { detectMotifs, explainMotifs, materialGain, pieceName } from '../chess/motifs'
import { sanToPt, uciParts, uciToSan } from '../chess/notation'
import { EngineAbortError, getBotEngine, getEngine } from '../engine/stockfish'
import { type BotConfig, buildBotPgn, pickBotMove, swapSideFen, thinkingDelay } from './bots'

export interface GameSetup {
  bot: BotConfig
  /** Cor da pessoa, já resolvido o sorteio. */
  color: Color
  coachOn: boolean
  allowUndo: boolean
  playerName: string
  /** Posição de partida, quando não é a inicial. */
  startFen?: string
  /** Lances a repetir antes de começar: partida retomada ou linha de abertura. */
  initialSans?: string[]
  /** Destes lances, quantos a pessoa não pode desfazer. */
  lockedPlies?: number
  /** Relógio em segundos. Sem ele, não há limite de tempo. */
  time?: { base: number; increment: number }
  /** Tempo restante ao retomar, em ms. */
  initialClocks?: { w: number; b: number }
  initialStamps?: (number | null)[]
}

export interface GameProgress {
  sans: string[]
  clocks?: { w: number; b: number }
  stamps?: (number | null)[]
}

export type GamePhase = 'starting' | 'player' | 'checking' | 'warning' | 'bot' | 'over'

export interface GameResult {
  outcome: 'win' | 'loss' | 'draw'
  reason: string
  score: string
  pgn: string
  /** Desistir antes de qualquer lance não deixa partida para guardar ou revisar. */
  hasMoves: boolean
}

export interface LastGrade {
  square: string
  cls: MoveClass
}

export interface Hint {
  level: 1 | 2
  uci: string | null
}

export interface Threat {
  uci: string | null
  text: string
}

const BOT_ERROR_LOSS = 10

function drawReason(chess: Chess): string {
  if (chess.isStalemate()) return 'Afogamento'
  if (chess.isThreefoldRepetition()) return 'Repetição de posição'
  if (chess.isInsufficientMaterial()) return 'Material insuficiente'
  return 'Regra dos 50 lances'
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** A partida contra o bot: dois motores, um joga e o outro comenta sem limite de força. */
export function useBotGame(setup: GameSetup, onFinished: (result: GameResult) => void, onProgress?: (progress: GameProgress) => void) {
  const { bot, color, coachOn, startFen, time } = setup
  // Com relógio correndo, voltar lance não faz sentido.
  const allowUndo = setup.allowUndo && !time
  const lockedPlies = setup.lockedPlies ?? 0
  const game = useRef<Chess>(null as unknown as Chess)
  if (!game.current) {
    const chess = startFen ? new Chess(startFen) : new Chess()
    for (const san of setup.initialSans ?? []) chess.move(san)
    game.current = chess
  }
  if (import.meta.env.DEV) (window as unknown as { __game: Chess }).__game = game.current
  const [version, setVersion] = useState(0)
  const initialClocks = time ? (setup.initialClocks ?? { w: time.base * 1000, b: time.base * 1000 }) : null
  const [clocks, setClocks] = useState(initialClocks)
  const clockRef = useRef(initialClocks)
  const stamps = useRef<(number | null)[]>(setup.initialStamps ?? (setup.initialSans ?? []).map(() => null))
  const [phase, setPhase] = useState<GamePhase>('starting')
  const [lastGrade, setLastGrade] = useState<LastGrade | null>(null)
  const [comment, setComment] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [hint, setHint] = useState<Hint | null>(null)
  const [threat, setThreat] = useState<Threat | null>(null)
  const [busy, setBusy] = useState<'hint' | 'threat' | null>(null)
  const [result, setResult] = useState<GameResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [evaluation, setEvaluation] = useState<Eval | null>(null)

  const session = useRef(0)
  const controller = useRef(new AbortController())
  const botTurn = useRef<AbortController | null>(null)
  const cache = useRef(new Map<string, Promise<PositionResult>>())

  const refresh = useCallback(() => setVersion((value) => value + 1), [])

  const coachEval = useCallback((fen: string) => {
    const known = cache.current.get(fen)
    if (known) return known
    const promise = evaluatePosition(getEngine(), fen, { signal: controller.current.signal })
    cache.current.set(fen, promise)
    promise.catch(() => cache.current.delete(fen))
    return promise
  }, [])

  /** Atualiza a barra de avaliação. Até o motor responder, ela fica no último valor conhecido. */
  const trackEval = useCallback(() => {
    if (!coachOn) return
    const fen = game.current.fen()
    coachEval(fen)
      .then((result) => {
        if (game.current.fen() === fen) setEvaluation(result.eval)
      })
      .catch(() => {})
  }, [coachEval, coachOn])

  const finish = useCallback(
    (forced?: { outcome: GameResult['outcome']; reason: string }) => {
      const chess = game.current
      let outcome: GameResult['outcome']
      let reason: string
      if (forced) {
        outcome = forced.outcome
        reason = forced.reason
      } else if (chess.isCheckmate()) {
        outcome = chess.turn() === color ? 'loss' : 'win'
        reason = 'Xeque-mate'
      } else {
        outcome = 'draw'
        reason = drawReason(chess)
      }
      const whiteWon = (outcome === 'win') === (color === 'w')
      const score = outcome === 'draw' ? '1/2-1/2' : whiteWon ? '1-0' : '0-1'
      const botName = `${bot.name} (${bot.rating})`
      const pgn = buildBotPgn(chess.history(), {
        white: color === 'w' ? setup.playerName : botName,
        black: color === 'w' ? botName : setup.playerName,
        result: score,
        date: new Date(),
        termination: reason,
        startFen,
        stamps: time ? stamps.current : undefined,
        timeControl: time ? (time.increment ? `${time.base}+${time.increment}` : String(time.base)) : undefined,
      })
      const finished = { outcome, reason, score, pgn, hasMoves: chess.history().length > lockedPlies }
      setResult(finished)
      setPhase('over')
      onFinished(finished)
    },
    [bot.name, bot.rating, color, lockedPlies, onFinished, setup.playerName, startFen, time],
  )

  const fail = useCallback((failure: unknown, current: number) => {
    if (failure instanceof EngineAbortError || current !== session.current) return
    setError(failure instanceof Error ? failure.message : 'O Stockfish parou de responder. Recarregue a página.')
  }, [])

  /** Depois de cada lance: soma o incremento e anota o relógio para a análise do tempo. */
  const stampClock = useCallback(
    (side: Color) => {
      if (!time || !clockRef.current) return
      const next = { ...clockRef.current, [side]: clockRef.current[side] + time.increment * 1000 }
      clockRef.current = next
      setClocks(next)
      stamps.current = [...stamps.current, next[side] / 1000]
    },
    [time],
  )

  /** Depois do lance do bot: prepara a dica e avisa se ele errou. */
  const reviewBotMove = useCallback(
    async (current: number, played: Move) => {
      if (!coachOn) return
      const [before, after] = await Promise.all([coachEval(played.before), coachEval(played.after)])
      if (current !== session.current || game.current.fen() !== played.after) return
      const graded = gradeMove(played.lan, played.color, before, after)
      if (graded.isBest || graded.loss < BOT_ERROR_LOSS) return
      if (after.eval.kind === 'mate' && after.eval.winner === color) {
        setComment(`O bot errou: agora você tem mate em ${after.eval.moves}. Consegue achar?`)
        return
      }
      const motifs = detectMotifs({
        color: played.color,
        uci: played.lan,
        beforeFen: played.before,
        afterFen: played.after,
        beforeEval: before.eval,
        afterEval: after.eval,
        bestUci: before.bestUci,
        beforePv: before.pvUci,
        afterPv: after.pvUci,
      })
      const hanging = motifs.find((motif) => motif.kind === 'hanging')
      setComment(
        hanging && hanging.kind === 'hanging'
          ? `O bot errou: deixou ${pieceName(hanging.piece)} em ${hanging.square} pendurad${hanging.piece === 'r' || hanging.piece === 'q' ? 'a' : 'o'}. Você tem chance de ganhar.`
          : 'O bot errou e você tem chance de ganhar. Procure o melhor lance.',
      )
    },
    [coachEval, color, coachOn],
  )

  const runBot = useCallback(
    async (current: number) => {
      const fen = game.current.fen()
      const turn = new AbortController()
      botTurn.current = turn
      setPhase('bot')
      setHint(null)
      setThreat(null)
      try {
        const started = Date.now()
        // Com pouco tempo, o bot também precisa jogar rápido.
        const budget = clockRef.current ? Math.min(bot.movetime, Math.max(50, clockRef.current[game.current.turn()] / 20)) : bot.movetime
        const answer = await getBotEngine().analyze(fen, null, { movetime: budget, multiPv: bot.multiPv, signal: turn.signal })
        const uci = pickBotMove(answer, bot, fen)
        if (!uci) throw new Error('o bot não encontrou lance')
        const delay = time ? 0 : thinkingDelay() - (Date.now() - started)
        if (delay > 0) await wait(delay)
        if (current !== session.current || turn.signal.aborted) return
        const played = game.current.move(uciParts(uci))
        stampClock(played.color)
        setLastGrade(null)
        refresh()
        trackEval()
        if (game.current.isGameOver()) {
          finish()
          return
        }
        setPhase('player')
        void reviewBotMove(current, played).catch((failure) => fail(failure, current))
      } catch (failure) {
        fail(failure, current)
      }
    },
    [bot, fail, finish, refresh, reviewBotMove, stampClock, time, trackEval],
  )

  useEffect(() => {
    const current = ++session.current
    const active = new AbortController()
    controller.current = active
    const init = async () => {
      const engine = getBotEngine()
      await engine.ready
      await engine.configure(bot.options)
      await engine.newGame()
      if (coachOn) await getEngine().newGame()
      if (current !== session.current) return
      if (game.current.isGameOver()) {
        finish()
      } else if (game.current.turn() !== color) {
        await runBot(current)
      } else {
        setPhase('player')
        trackEval()
      }
    }
    init().catch((failure) => fail(failure, current))
    return () => {
      session.current += 1
      active.abort()
      botTurn.current?.abort()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cada lance fica guardado na hora: recarregar a página não perde a partida.
  useEffect(() => {
    if (phase === 'over' || phase === 'starting') return
    onProgress?.({ sans: game.current.history(), clocks: clockRef.current ?? undefined, stamps: time ? stamps.current : undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, phase])

  // O relógio só corre na vez de pensar: o tempo do treinador conferindo o lance não conta.
  useEffect(() => {
    if (!time || (phase !== 'player' && phase !== 'bot')) return
    let last = performance.now()
    const timer = setInterval(() => {
      const now = performance.now()
      const side = game.current.turn()
      const current = clockRef.current
      if (!current) return
      const left = current[side] - (now - last)
      last = now
      const next = { ...current, [side]: Math.max(0, left) }
      clockRef.current = next
      setClocks(next)
      if (left <= 0) {
        session.current += 1
        botTurn.current?.abort()
        finish({ outcome: side === color ? 'loss' : 'win', reason: 'Tempo esgotado' })
      }
    }, 200)
    return () => clearInterval(timer)
  }, [color, finish, phase, time])

  /** Depois do lance da pessoa: classifica, avisa do erro e só então libera o bot. */
  const checkPlayerMove = useCallback(
    async (current: number, played: Move) => {
      setPhase('checking')
      try {
        const [before, after] = await Promise.all([coachEval(played.before), coachEval(played.after)])
        if (current !== session.current || game.current.fen() !== played.after) return
        const graded = gradeMove(played.lan, played.color, before, after)
        const cls = classOf(graded, { fen: played.before, uci: played.lan, color: played.color, evalBefore: before.eval, evalAfter: after.eval })
        setLastGrade({ square: played.to, cls })

        const explanation = explainMotifs(
          detectMotifs({
            color,
            uci: played.lan,
            beforeFen: played.before,
            afterFen: played.after,
            beforeEval: before.eval,
            afterEval: after.eval,
            bestUci: before.bestUci,
            beforePv: before.pvUci,
            afterPv: after.pvUci,
          }),
          { color, isUser: true, revealBest: false },
        )

        if (cls === 'mistake' || cls === 'blunder') {
          setWarning(explanation)
          setPhase('warning')
          return
        }
        if (cls === 'inaccuracy' && explanation) setComment(explanation)
        else if (played.captured) {
          const gain = materialGain(color, played.before, played.after, after.pvUci)
          if (gain) setComment(`Boa! Você ganhou ${gain}.`)
        }
        await runBot(current)
      } catch (failure) {
        fail(failure, current)
      }
    },
    [coachEval, color, fail, runBot],
  )

  const playMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      if (phase !== 'player') return false
      let played: Move
      try {
        played = game.current.move({ from, to, promotion })
      } catch {
        return false
      }
      const current = session.current
      stampClock(played.color)
      setComment(null)
      setHint(null)
      setThreat(null)
      setLastGrade(null)
      refresh()
      trackEval()
      if (game.current.isGameOver()) {
        finish()
        return true
      }
      if (coachOn) void checkPlayerMove(current, played)
      else void runBot(current)
      return true
    },
    [checkPlayerMove, coachOn, finish, phase, refresh, runBot, stampClock, trackEval],
  )

  const continueAnyway = useCallback(() => {
    setWarning(null)
    void runBot(session.current)
  }, [runBot])

  /** Volta até ser a vez da pessoa de novo. */
  const undo = useCallback(() => {
    if (!allowUndo || phase === 'over' || phase === 'starting') return
    const chess = game.current
    botTurn.current?.abort()
    session.current += 1
    setWarning(null)
    setHint(null)
    setThreat(null)
    setComment(null)
    setLastGrade(null)
    if (chess.turn() !== color) {
      if (chess.history().length <= lockedPlies) return
      chess.undo()
    } else {
      if (chess.history().length - lockedPlies < 2) return
      chess.undo()
      chess.undo()
    }
    refresh()
    setPhase('player')
    trackEval()
  }, [allowUndo, color, lockedPlies, phase, refresh, trackEval])

  const requestHint = useCallback(async () => {
    if (phase !== 'player' || !coachOn) return
    const fen = game.current.fen()
    const level = hint?.level === 1 ? 2 : 1
    setThreat(null)
    setBusy('hint')
    try {
      const position = await coachEval(fen)
      if (game.current.fen() === fen) setHint({ level, uci: position.bestUci })
    } catch (failure) {
      fail(failure, session.current)
    } finally {
      setBusy(null)
    }
  }, [coachEval, coachOn, fail, hint?.level, phase])

  const requestThreat = useCallback(async () => {
    if (phase !== 'player' || !coachOn) return
    const fen = game.current.fen()
    const swapped = swapSideFen(fen)
    if (!swapped) return
    setHint(null)
    setBusy('threat')
    try {
      const [current, position] = await Promise.all([coachEval(fen), coachEval(swapped)])
      if (game.current.fen() !== fen) return
      const san = uciToSan(swapped, position.bestUci)
      if (!san || !position.bestUci) {
        setThreat({ uci: null, text: 'O adversário não tem nenhuma ameaça agora.' })
        return
      }
      const move = sanToPt(san)
      const opponent: Color = color === 'w' ? 'b' : 'w'
      const gain = winPercentFor(position.eval, opponent) - winPercentFor(current.eval, opponent)
      const captured = new Chess(swapped).move(uciParts(position.bestUci)).captured
      let text: string
      if (position.eval.kind === 'mate' && position.eval.winner === opponent) {
        text = position.eval.moves === 1 ? `O adversário ameaça ${move}, que é xeque-mate.` : `O adversário ameaça ${move}, com mate em ${position.eval.moves}.`
      } else if (gain < 3 && whiteWinPercent(position.eval) !== whiteWinPercent(current.eval)) {
        text = `Nenhuma ameaça séria. A ideia do adversário seria ${move}.`
      } else if (captured) {
        text = `O adversário ameaça ${move}, capturando ${pieceName(captured)}.`
      } else {
        text = `O adversário quer jogar ${move}.`
      }
      setThreat({ uci: position.bestUci, text })
    } catch (failure) {
      fail(failure, session.current)
    } finally {
      setBusy(null)
    }
  }, [coachEval, coachOn, color, fail, phase])

  const resign = useCallback(() => {
    if (phase === 'over') return
    botTurn.current?.abort()
    session.current += 1
    setWarning(null)
    finish({ outcome: 'loss', reason: 'Você desistiu' })
  }, [finish, phase])

  const chess = game.current
  return {
    fen: chess.fen(),
    history: chess.history({ verbose: true }),
    inCheck: chess.inCheck(),
    clocks,
    lockedPlies,
    allowUndo,
    turn: chess.turn(),
    evaluation,
    phase,
    lastGrade,
    comment,
    warning,
    hint,
    threat,
    busy,
    result,
    error,
    playMove,
    continueAnyway,
    undo,
    requestHint,
    requestThreat,
    resign,
  }
}
