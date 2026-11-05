import { Chess } from 'chess.js'
import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import type { GameAnalysis } from '../chess/analyze'
import type { GameRecord } from '../data/library'
import type { StartPoint } from './BotSetup'
import { formatOpening } from '../chess/book'
import type { Color } from '../chess/evaluation'
import { clocksAt, formatClock } from '../chess/clock'
import { materialState } from '../chess/material'
import { uciParts } from '../chess/notation'
import { formatDate, formatTimeControl } from '../chess/pgn'
import { REVIEW_SPEEDS, findKeyMoments, gameInsights } from '../chess/review'
import { BEST_ARROW_COLOR, Board } from './Board'
import { CapturedPieces } from './CapturedPieces'
import { ClockChart } from './ClockChart'
import { CoachCard, moveLabel } from './CoachCard'
import { EvalBar } from './EvalBar'
import { EvalChart } from './EvalChart'
import { LegendButton } from './Legend'
import { MoveList } from './MoveList'
import { RetryPanel } from './RetryPanel'
import { ReviewBar, ReviewEnd, ReviewIntro } from './ReviewPanels'
import { Summary, formatPercent } from './Summary'
import { VariantPanel } from './VariantPanel'
import { useBestLines } from './useBestLines'
import { useGuidedReview } from './useGuidedReview'
import { useIsDesktop } from './useLayout'
import { useRetry } from './useRetry'
import { type WalkTarget, useVariant } from './useVariant'

interface AnalysisViewProps {
  analysis: GameAnalysis
  userColor: Color | null
  notice: string | null
  onBack: () => void
  record?: GameRecord
  /** Continua jogando contra um bot a partir da posição na tela. */
  onPlayFrom?: (start: StartPoint) => void
}

interface PendingPromotion {
  from: string
  to: string
}

type MobileTab = 'coach' | 'chart' | 'moves' | 'summary'

const PROMOTIONS = [
  { piece: 'q', label: 'Dama' },
  { piece: 'r', label: 'Torre' },
  { piece: 'b', label: 'Bispo' },
  { piece: 'n', label: 'Cavalo' },
]

const LAST_MOVE_TINT = 'color-mix(in srgb, #d4a900 42%, transparent)'

/** Lances possíveis de uma casa, para a marcação no tabuleiro e o toque-para-mover. */
function legalMoves(fen: string, from: string) {
  try {
    return new Chess(fen).moves({ square: from as never, verbose: true })
  } catch {
    return []
  }
}

const arrowOf = (uci: string | null | undefined) => (uci ? [{ startSquare: uciParts(uci).from, endSquare: uciParts(uci).to, color: BEST_ARROW_COLOR }] : [])
const tintOf = (cls: string) => `color-mix(in srgb, var(--fill-${cls}) 48%, transparent)`

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="currentColor">
      <path d={d} />
    </svg>
  )
}

function NavButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-11 flex-1 items-center justify-center rounded-md bg-surface text-ink hover:bg-sunken disabled:opacity-35 disabled:hover:bg-surface"
    >
      {children}
    </button>
  )
}

export function AnalysisView({ analysis, userColor, notice, onBack, onPlayFrom }: AnalysisViewProps) {
  const { positions, moves } = analysis
  const isDesktop = useIsDesktop()
  const [ply, setPly] = useState(0)
  const [orientation, setOrientation] = useState<'white' | 'black'>(userColor === 'b' ? 'black' : 'white')
  const [tab, setTab] = useState<MobileTab>('coach')
  const [selected, setSelected] = useState<string | null>(null)
  const [promotion, setPromotion] = useState<PendingPromotion | null>(null)

  const position = positions[ply]
  const move = ply > 0 ? moves[ply - 1] : null
  const before = ply > 0 ? positions[ply - 1] : null

  // "Mostrar melhor" vale só para o lance atual: o próximo erro não deve vir com a resposta aberta.
  const [revealed, setRevealed] = useState(false)
  const bestLines = useBestLines(revealed ? (before ?? position).fen : null, analysis.depth)
  // A busca com 3 linhas pode discordar da análise. Mostrando as linhas, a primeira manda,
  // a não ser que o lance jogado já tenha sido o melhor: aí ele continua no topo.
  const storedBest = (before ?? position).bestUci
  const shownBest = move?.cls === 'best' ? storedBest : (bestLines.lines?.[0]?.pvUci[0] ?? storedBest)

  const { retry, start: startRetry, exit: exitRetry, again: retryAgain, reveal: retryReveal, play: retryPlay } = useRetry(positions)
  const { variant, current: variantStep, baseFen, liveEval, error: variantError, play: variantPlay, playAfter: variantPlayAfter, select: variantSelect, walk: variantWalk, exit: exitVariant } = useVariant(positions)
  const testing = variant !== null

  const moments = useMemo(() => findKeyMoments(analysis, userColor), [analysis, userColor])
  const insights = useMemo(() => gameInsights(analysis, userColor), [analysis, userColor])
  const moveTo = useCallback((next: number) => {
    setRevealed(false)
    setSelected(null)
    setPly(next)
  }, [])
  const review = useGuidedReview({ moves, moments, ply, moveTo })
  const reviewing = review.status !== 'idle'
  const playing = review.status === 'playing'
  const { pause: pauseReview, play: playReview } = review

  /** Retoma a revisão de onde a partida está, saindo do que estiver sendo testado. */
  const resumeReview = useCallback(() => {
    exitRetry()
    exitVariant()
    setSelected(null)
    setTab('coach')
    playReview()
  }, [exitRetry, exitVariant, playReview])

  const togglePlay = useCallback(() => {
    if (playing) pauseReview()
    else resumeReview()
  }, [pauseReview, playing, resumeReview])

  // Ir direto a um momento também sai de uma tentativa ou variante aberta.
  const jumpToMoment = useCallback(
    (target: number) => {
      exitRetry()
      exitVariant()
      setTab('coach')
      review.jump(target)
    },
    [exitRetry, exitVariant, review],
  )

  const go = useCallback(
    (next: number) => {
      exitRetry()
      exitVariant()
      pauseReview()
      setSelected(null)
      setRevealed(false)
      setPly(Math.max(0, Math.min(moves.length, next)))
    },
    [exitRetry, exitVariant, moves.length, pauseReview],
  )

  const walk = useCallback(
    (target: WalkTarget) => {
      if (retry) return
      setSelected(null)
      pauseReview()
      if (testing) {
        const atBase = variant?.cursor === -1
        if (!atBase || target === 'forward' || target === 'end') {
          variantWalk(target)
          return
        }
        // Já na posição da partida: mais um passo para trás sai da variante e segue pela partida.
        exitVariant()
      }
      setRevealed(false)
      setPly((value) => {
        const next = target === 'start' ? 0 : target === 'end' ? moves.length : target === 'back' ? value - 1 : value + 1
        return Math.max(0, Math.min(moves.length, next))
      })
    },
    [exitVariant, moves.length, pauseReview, retry, testing, variant?.cursor, variantWalk],
  )

  useEffect(() => {
    const keys: Record<string, WalkTarget> = { ArrowLeft: 'back', ArrowRight: 'forward', Home: 'start', End: 'end' }
    const onKeyDown = (event: KeyboardEvent) => {
      const { target } = event
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return
      if (event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === ' ' && !(target instanceof Element && target.closest('button, a, label'))) {
        event.preventDefault()
        togglePlay()
        return
      }
      const action = keys[event.key]
      if (!action) return
      event.preventDefault()
      walk(action)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlay, walk])

  // Em qual posição as peças podem ser movidas agora.
  const playableFen = retry
    ? retry.phase === 'evaluating'
      ? null
      : (retry.tried?.fen ?? positions[retry.ply - 1].fen)
    : (variantStep?.fen ?? baseFen ?? position.fen)

  const applyMove = (from: string, to: string, piece?: string): boolean => {
    setSelected(null)
    pauseReview()
    if (retry) {
      if (retry.phase === 'playing') return retryPlay(from, to, piece)
      // Depois da resposta, mover uma peça vira exploração a partir dali.
      const basePly = retry.ply - 1
      const ok = retry.tried ? variantPlayAfter(basePly, retry.tried, from, to, piece) : variantPlay(basePly, from, to, piece)
      if (ok) {
        exitRetry()
        setPly(basePly)
        setRevealed(false)
      }
      return ok
    }
    const ok = variantPlay(ply, from, to, piece)
    if (ok) {
      setRevealed(false)
      setTab('coach')
    }
    return ok
  }

  const attemptMove = (from: string, to: string): boolean => {
    if (!playableFen) return false
    const candidates = legalMoves(playableFen, from).filter((candidate) => candidate.to === to)
    if (candidates.length === 0) return false
    if (candidates.some((candidate) => candidate.promotion)) {
      setPromotion({ from, to })
      setSelected(null)
      return false
    }
    return applyMove(from, to)
  }

  const onSquareClick = (square: string) => {
    if (!playableFen) return
    if (selected && selected !== square && legalMoves(playableFen, selected).some((candidate) => candidate.to === square)) {
      attemptMove(selected, square)
      return
    }
    const hasMoves = legalMoves(playableFen, square).length > 0
    setSelected(selected === square || !hasMoves ? null : square)
  }

  const boardProps = useMemo(() => {
    const withSelection = (fen: string, styles: Record<string, CSSProperties>) => {
      if (!selected) return styles
      styles[selected] = { backgroundColor: 'color-mix(in srgb, #0e8a7d 45%, transparent)' }
      for (const candidate of legalMoves(fen, selected)) {
        styles[candidate.to] = {
          ...styles[candidate.to],
          backgroundImage: candidate.captured
            ? 'radial-gradient(circle, transparent 58%, rgb(14 138 125 / 0.65) 60%)'
            : 'radial-gradient(circle, rgb(14 138 125 / 0.65) 22%, transparent 24%)',
        }
      }
      return styles
    }

    if (retry) {
      const start = positions[retry.ply - 1]
      const squareStyles: Record<string, CSSProperties> = {}
      const tried = retry.tried
      if (tried) {
        const tint = retry.cls ? tintOf(retry.cls) : LAST_MOVE_TINT
        squareStyles[tried.from] = { backgroundColor: tint }
        squareStyles[tried.to] = { backgroundColor: tint }
      }
      const showArrow = retry.phase === 'found' || retry.phase === 'answer'
      return {
        fen: tried?.fen ?? start.fen,
        squareStyles: withSelection(tried?.fen ?? start.fen, squareStyles),
        arrows: showArrow ? arrowOf(start.bestUci) : [],
        badge: tried && retry.cls ? { square: tried.to, cls: retry.cls } : null,
        animateArrow: retry.phase === 'found',
      }
    }

    if (variant) {
      const squareStyles: Record<string, CSSProperties> = {}
      const step = variantStep
      if (step) {
        const tint = step.cls ? tintOf(step.cls) : LAST_MOVE_TINT
        squareStyles[step.from] = { backgroundColor: tint }
        squareStyles[step.to] = { backgroundColor: tint }
      }
      const fen = step?.fen ?? positions[variant.basePly].fen
      return {
        fen,
        squareStyles: withSelection(fen, squareStyles),
        arrows: step?.cls && step.cls !== 'best' ? arrowOf(step.before?.bestUci) : [],
        badge: step?.cls ? { square: step.to, cls: step.cls } : null,
        animateArrow: false,
      }
    }

    const squareStyles: Record<string, CSSProperties> = {}
    if (move) {
      squareStyles[move.from] = { backgroundColor: tintOf(move.cls) }
      squareStyles[move.to] = { backgroundColor: tintOf(move.cls) }
    }
    return {
      fen: position.fen,
      squareStyles: withSelection(position.fen, squareStyles),
      // Depois de um lance, a seta mostra o que era melhor jogar no lugar dele.
      arrows: revealed ? arrowOf(shownBest) : [],
      badge: move ? { square: move.to, cls: move.cls } : null,
      animateArrow: false,
    }
  }, [retry, positions, variant, variantStep, selected, move, position, revealed, shownBest])

  const barEval = retry
    ? (retry.after?.eval ?? positions[retry.ply - 1].eval)
    : variant
      ? (variantStep ? (variantStep.after?.eval ?? liveEval ?? variantStep.before?.eval ?? null) : positions[variant.basePly].eval)
      : position.eval

  const players = {
    w: { name: analysis.white, accuracy: analysis.summary.w.accuracy, color: 'w' as const },
    b: { name: analysis.black, accuracy: analysis.summary.b.accuracy, color: 'b' as const },
  }
  const top = orientation === 'white' ? players.b : players.w
  const bottom = orientation === 'white' ? players.w : players.b

  const clocks = analysis.clock ? clocksAt(analysis.clock, moves, retry ? retry.ply - 1 : variant ? variant.basePly : ply) : null

  // Acompanha o que está no tabuleiro: partida, lance testado ou nova tentativa.
  const material = useMemo(() => materialState(boardProps.fen, positions[0].fen), [boardProps.fen, positions])

  const colorDot = (color: Color) => (
    <span
      aria-hidden="true"
      className="size-3 shrink-0 rounded-full border border-muted"
      style={{ backgroundColor: color === 'w' ? 'var(--share-white)' : 'var(--share-black)' }}
    />
  )

  const playerStrip = (player: typeof top) => (
    <div className="flex h-8 items-center gap-2 text-sm">
      {colorDot(player.color)}
      <span className="min-w-0 truncate font-semibold">{player.name}</span>
      {userColor === player.color && <span className="shrink-0 text-muted">(você)</span>}
      <CapturedPieces color={player.color} pieces={material.captured[player.color]} advantage={material.advantage[player.color]} />
      <span className="tabular ml-auto shrink-0 text-muted">{formatPercent(player.accuracy)}</span>
      {clocks && <span className="tabular shrink-0 rounded-sm bg-surface px-1.5 font-semibold">{formatClock(clocks[player.color])}</span>}
    </div>
  )

  const atStart = Boolean(retry) || (variant ? variant.cursor === -1 && ply === 0 : ply === 0)
  const atEnd = Boolean(retry) || (variant ? variant.cursor === variant.steps.length - 1 : ply === moves.length)
  const details = [analysis.result === '*' ? '' : analysis.result, formatDate(analysis.date), formatTimeControl(analysis.timeControl)].filter(Boolean)
  const shortMeta = details.join(', ')
  const meta = [...details, `profundidade ${analysis.depth}`].join(', ')

  const backButton = (
    <button type="button" onClick={onBack} className="-ml-1 flex min-h-11 shrink-0 items-center gap-1 rounded-md pr-3 pl-1 font-semibold hover:bg-sunken">
      <Icon d="M15.4 6.4 14 5l-7 7 7 7 1.4-1.4L9.8 12z" />
      Voltar
    </button>
  )

  const noticeBox = notice && (
    <p role="status" className="mb-2 rounded-md bg-sunken p-3 text-sm">
      {notice}
    </p>
  )

  const boardWithBar = (
    <div className="flex gap-1 lg:gap-2">
      <EvalBar evaluation={barEval} orientation={orientation} />
      <div className="min-w-0 flex-1">
        <Board
          fen={boardProps.fen}
          orientation={orientation}
          arrows={boardProps.arrows}
          squareStyles={boardProps.squareStyles}
          badge={boardProps.badge}
          animateArrow={boardProps.animateArrow}
          animationMs={playing ? Math.min(140, (REVIEW_SPEEDS.find((item) => item.id === review.speed)?.ms ?? 550) * 0.7) : 140}
          interactive={Boolean(playableFen)}
          turn={playableFen ? (playableFen.split(' ')[1] as Color) : undefined}
          onPieceDrop={attemptMove}
          onSquareClick={playableFen ? onSquareClick : undefined}
        />
      </div>
    </div>
  )

  const navButtons = (
    <>
      <NavButton label="Ir para o início" onClick={() => walk('start')} disabled={atStart}>
        <Icon d="M6 5h2v14H6zm3.5 7L18 5.5v13z" />
      </NavButton>
      <NavButton label="Lance anterior" onClick={() => walk('back')} disabled={atStart}>
        <Icon d="M7 12l9-7v14z" />
      </NavButton>
      <NavButton label={playing ? 'Pausar revisão' : 'Tocar revisão'} onClick={togglePlay}>
        <Icon d={playing ? 'M7 5h4v14H7zm6 0h4v14h-4z' : 'M5 4l15 8-15 8z'} />
      </NavButton>
      <NavButton label="Próximo lance" onClick={() => walk('forward')} disabled={atEnd}>
        <Icon d="M17 12 8 5v14z" />
      </NavButton>
      <NavButton label="Ir para o fim" onClick={() => walk('end')} disabled={atEnd}>
        <Icon d="M16 5h2v14h-2zM14.5 12 6 5.5v13z" />
      </NavButton>
      <NavButton label="Virar o tabuleiro" onClick={() => setOrientation((value) => (value === 'white' ? 'black' : 'white'))}>
        <Icon d="M7 3 3 7h3v8h2V7h3zm10 18 4-4h-3V9h-2v8h-3z" />
      </NavButton>
    </>
  )

  const moment = reviewing && !playing && !variant && !retry ? review.current : null
  const momentIndex = moment ? moments.findIndex((item) => item.ply === moment.ply) + 1 : 0

  const reviewBar = reviewing && (
    <ReviewBar
      status={review.status}
      ply={ply}
      total={moves.length}
      moments={moments}
      moves={moves}
      speed={review.speed}
      hasNext={review.nextMoment !== null}
      onSpeed={review.setSpeed}
      onJump={jumpToMoment}
      onSkip={() => {
        exitRetry()
        exitVariant()
        setSelected(null)
        review.skip()
      }}
      onExit={review.exit}
    />
  )

  const coach = retry ? (
    <RetryPanel retry={retry} move={moves[retry.ply - 1]} before={positions[retry.ply - 1]} onAgain={retryAgain} onReveal={retryReveal} onExit={exitRetry} isUser={moves[retry.ply - 1].color === userColor} />
  ) : variant ? (
    <VariantPanel
      origin={variant.basePly > 0 ? `de ${moveLabel(moves[variant.basePly - 1])}` : 'da posição inicial'}
      step={variantStep}
      isUserColor={variantStep?.color === userColor}
      error={variantError}
      onExit={() => {
        exitVariant()
        setSelected(null)
      }}
    />
  ) : review.status === 'idle' && ply === 0 ? (
    <ReviewIntro insights={insights} moments={moments} onStart={resumeReview} />
  ) : review.status === 'done' ? (
    <ReviewEnd
      insights={insights}
      moments={moments}
      moves={moves}
      result={analysis.result}
      onJump={jumpToMoment}
      onRestart={() => {
        moveTo(0)
        playReview()
      }}
      onExit={review.exit}
    />
  ) : (
    <CoachCard
      move={move}
      before={before}
      current={position}
      previousMove={ply > 1 ? moves[ply - 2] : null}
      isUserMove={move?.color === userColor}
      revealed={revealed}
      bestUci={shownBest}
      bestLines={bestLines}
      onToggleBest={() => setRevealed((value) => !value)}
      onRetry={() => {
        setRevealed(false)
        setSelected(null)
        pauseReview()
        startRetry(ply)
      }}
      compact={playing}
      moment={moment && { title: moment.title, note: moment.note, index: momentIndex, total: moments.length }}
      onContinue={reviewing && !playing ? resumeReview : undefined}
    />
  )

  const chart = (
    <div className="flex flex-col gap-4">
      <EvalChart positions={positions} moves={moves} ply={ply} onSelect={go} showTitle={isDesktop} />
      {analysis.clock && <ClockChart data={analysis.clock} moves={moves} ply={ply} white={analysis.white} black={analysis.black} onSelect={go} />}
    </div>
  )
  const moveList = <MoveList moves={moves} ply={ply} onSelect={go} showTitle={isDesktop} variant={variant} onSelectVariant={variantSelect} spent={analysis.clock?.spent} />
  const canPlayFrom = onPlayFrom && !new Chess(boardProps.fen).isGameOver()
  const summary = (
    <>
      <Summary analysis={analysis} showTitle={isDesktop} userColor={userColor} />
      {canPlayFrom && (
        <button
          type="button"
          onClick={() => onPlayFrom({ label: `a posição do tabuleiro em ${analysis.white} x ${analysis.black}`, fen: boardProps.fen, color: boardProps.fen.split(' ')[1] as Color })}
          className="mt-3 min-h-11 w-full rounded-md border border-line px-4 font-semibold hover:bg-sunken"
        >
          Jogar desta posição
        </button>
      )}
    </>
  )

  const promotionDialog = promotion && (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Promover o peão">
      <div className="w-full max-w-xs rounded-md bg-surface p-4">
        <h2 className="mb-3 font-semibold">Promover o peão para</h2>
        <div className="grid grid-cols-2 gap-2">
          {PROMOTIONS.map(({ piece, label }, index) => (
            <button
              key={piece}
              type="button"
              autoFocus={index === 0}
              onClick={() => {
                applyMove(promotion.from, promotion.to, piece)
                setPromotion(null)
              }}
              className="min-h-12 rounded-md border border-line font-semibold hover:bg-sunken"
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setPromotion(null)} className="mt-2 min-h-11 w-full rounded-md font-semibold text-muted hover:bg-sunken">
          Cancelar
        </button>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <div className="mx-auto flex w-full max-w-[120rem] flex-col px-6 xl:h-dvh xl:overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3">
          {backButton}
          {analysis.opening && <p className="font-book min-w-0 truncate text-base">{formatOpening(analysis.opening)}</p>}
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <p className="tabular min-w-0 truncate text-sm text-muted">{meta}</p>
            <LegendButton />
          </div>
        </header>
        {noticeBox}

        <div className="flex min-h-0 flex-1 items-start gap-6 pb-6 xl:items-stretch">
          {/* A largura vem da altura da tela: o tabuleiro e os botões sempre cabem sem rolar. */}
          <div className="shrink-0" style={{ width: 'min(max(calc(100dvh - 11rem), 18rem), 56vw)' }}>
            <div className="ml-10">{playerStrip(top)}</div>
            {boardWithBar}
            <div className="ml-10">{playerStrip(bottom)}</div>
            <div className="flex gap-1.5">{navButtons}</div>
            <p className="mt-1.5 text-xs text-muted">Arraste uma peça para testar outro lance. Setas ← → navegam; a barra de espaço toca e pausa a revisão.</p>
          </div>

          <div className="grid min-w-0 flex-1 gap-5 xl:min-h-0 xl:grid-cols-2">
            <div className="-m-1 flex min-w-0 flex-col gap-3 p-1 xl:overflow-y-auto">
              {reviewBar}
              {coach}
              <div className="mt-2">{chart}</div>
            </div>
            <div className="-m-1 flex min-w-0 flex-col gap-5 p-1 xl:overflow-y-auto">
              <div className="h-80 xl:h-auto xl:min-h-48 xl:flex-1">{moveList}</div>
              {summary}
            </div>
          </div>
        </div>
        {promotionDialog}
      </div>
    )
  }

  // No celular não cabem precisão e relógio juntos: com relógio, a precisão fica só no Resumo.
  const mobileStrip = (player: typeof top) => (
    <div className="flex h-7 items-center gap-1.5 text-xs">
      {colorDot(player.color)}
      <span className="min-w-8 truncate font-semibold">{player.name}</span>
      {userColor === player.color && <span className="shrink-0 text-muted">(você)</span>}
      <CapturedPieces color={player.color} pieces={material.captured[player.color]} advantage={material.advantage[player.color]} />
      <span className={`tabular ml-auto shrink-0 ${clocks ? 'font-semibold' : 'text-muted'}`}>{clocks ? formatClock(clocks[player.color]) : formatPercent(player.accuracy)}</span>
    </div>
  )

  const tabs: { id: MobileTab; label: string }[] = [
    { id: 'coach', label: 'Treinador' },
    { id: 'chart', label: 'Gráfico' },
    { id: 'moves', label: 'Lances' },
    { id: 'summary', label: 'Resumo' },
  ]

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 px-2">
        {backButton}
        <p className={`ml-auto min-w-0 truncate text-right ${analysis.opening ? 'font-book text-sm' : 'tabular text-xs text-muted'}`}>{analysis.opening ? formatOpening(analysis.opening) : shortMeta}</p>
        <LegendButton compact />
      </header>
      {noticeBox}

      {/* O tabuleiro fica sempre à vista; só o painel abaixo dele muda ou rola. */}
      <div className="mx-auto w-full shrink-0 px-2" style={{ maxWidth: 'max(16rem, calc(100dvh - 24rem))' }}>
        <div className="ml-8">{mobileStrip(top)}</div>
        {boardWithBar}
        <div className="ml-8">{mobileStrip(bottom)}</div>
      </div>

      {reviewing && <div className="mt-1 shrink-0 px-2">{reviewBar}</div>}

      <div role="tablist" aria-label="Painéis da análise" className={`mt-1 shrink-0 border-b border-line px-2 ${reviewing ? 'hidden' : 'flex'}`}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`aba-${id}`}
            aria-selected={tab === id}
            aria-controls="painel-analise"
            onClick={() => setTab(id)}
            className={`-mb-px min-h-11 flex-1 border-b-2 text-sm font-semibold ${tab === id ? 'border-ink text-ink' : 'border-transparent text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div id="painel-analise" role="tabpanel" aria-labelledby={`aba-${tab}`} className="min-h-0 flex-1 overflow-y-auto p-2">
        {(tab === 'coach' || reviewing) && (
          <div className="flex flex-col gap-2">
            {coach}
            {!retry && !testing && !playing && <p className="px-1 text-sm text-muted">Toque numa peça e no destino para testar outro lance.</p>}
          </div>
        )}
        {!reviewing && tab === 'chart' && chart}
        {!reviewing && tab === 'moves' && moveList}
        {!reviewing && tab === 'summary' && summary}
      </div>

      <nav aria-label="Navegar pelos lances" className="flex shrink-0 gap-1 border-t border-line px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {navButtons}
      </nav>
      {promotionDialog}
    </div>
  )
}
