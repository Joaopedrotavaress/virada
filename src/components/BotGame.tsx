import { Chess } from 'chess.js'
import { type CSSProperties, useMemo, useState } from 'react'
import { type GameProgress, type GameResult, type GameSetup, useBotGame } from '../bots/useBotGame'
import { formatClock } from '../chess/clock'
import type { Color } from '../chess/evaluation'
import { materialState } from '../chess/material'
import { sanToPt, uciParts } from '../chess/notation'
import { BEST_ARROW_COLOR, Board, THREAT_ARROW_COLOR } from './Board'
import { BotAvatar } from './BotAvatar'
import { CapturedPieces } from './CapturedPieces'
import { EvalBar } from './EvalBar'
import { LegendButton } from './Legend'
import { useIsDesktop } from './useLayout'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const LAST_MOVE_TINT = 'var(--board-last)'
const PROMOTIONS = [
  { piece: 'q', label: 'Dama' },
  { piece: 'r', label: 'Torre' },
  { piece: 'b', label: 'Bispo' },
  { piece: 'n', label: 'Cavalo' },
]

interface BotGameProps {
  setup: GameSetup
  onFinished: (result: GameResult) => void
  onProgress?: (progress: GameProgress) => void
  onReview: (result: GameResult) => void
  onRematch: () => void
  onLeave: () => void
}

const OUTCOME_TITLE: Record<GameResult['outcome'], string> = { win: 'Você venceu!', loss: 'Você perdeu', draw: 'Empate' }

function legalMoves(fen: string, from: string) {
  try {
    return new Chess(fen).moves({ square: from as never, verbose: true })
  } catch {
    return []
  }
}

export function BotGame({ setup, onFinished, onProgress, onReview, onRematch, onLeave }: BotGameProps) {
  const { bot, color, coachOn } = setup
  const game = useBotGame(setup, onFinished, onProgress)
  const { allowUndo } = game
  const isDesktop = useIsDesktop()
  const [selected, setSelected] = useState<string | null>(null)
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null)
  const [confirmResign, setConfirmResign] = useState(false)

  const canMove = game.phase === 'player'
  const lastMove = game.history[game.history.length - 1]

  const attemptMove = (from: string, to: string): boolean => {
    if (!canMove) return false
    const candidates = legalMoves(game.fen, from).filter((candidate) => candidate.to === to)
    if (candidates.length === 0) return false
    if (candidates.some((candidate) => candidate.promotion)) {
      setPromotion({ from, to })
      setSelected(null)
      return false
    }
    setSelected(null)
    return game.playMove(from, to)
  }

  const onSquareClick = (square: string) => {
    if (!canMove) return
    if (selected && selected !== square && legalMoves(game.fen, selected).some((candidate) => candidate.to === square)) {
      attemptMove(selected, square)
      return
    }
    const piece = new Chess(game.fen).get(square as never)
    setSelected(selected === square || piece?.color !== color ? null : square)
  }

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {}
    if (lastMove) {
      const tint = game.lastGrade && game.lastGrade.square === lastMove.to ? `color-mix(in srgb, var(--fill-${game.lastGrade.cls}) 48%, transparent)` : LAST_MOVE_TINT
      styles[lastMove.from] = { backgroundColor: tint }
      styles[lastMove.to] = { backgroundColor: tint }
    }
    if (game.hint?.level === 1 && game.hint.uci) {
      styles[uciParts(game.hint.uci).from] = { backgroundColor: 'var(--board-from)' }
    }
    if (selected) {
      styles[selected] = { backgroundColor: 'var(--board-select)' }
      for (const candidate of legalMoves(game.fen, selected)) {
        styles[candidate.to] = {
          ...styles[candidate.to],
          backgroundImage: candidate.captured
            ? 'radial-gradient(circle, transparent 58%, var(--board-hint) 60%)'
            : 'radial-gradient(circle, var(--board-hint) 22%, transparent 24%)',
        }
      }
    }
    return styles
  }, [game.fen, game.hint, game.lastGrade, lastMove, selected])

  const arrows = useMemo(() => {
    if (game.hint?.level === 2 && game.hint.uci) {
      const { from, to } = uciParts(game.hint.uci)
      return [{ startSquare: from, endSquare: to, color: BEST_ARROW_COLOR }]
    }
    if (game.threat?.uci) {
      const { from, to } = uciParts(game.threat.uci)
      return [{ startSquare: from, endSquare: to, color: THREAT_ARROW_COLOR }]
    }
    return []
  }, [game.hint, game.threat])

  const opponentColor: Color = color === 'w' ? 'b' : 'w'
  const material = useMemo(() => materialState(game.fen, setup.startFen ?? START_FEN), [game.fen, setup.startFen])
  const strip = (name: string, side: Color, you: boolean) => (
    <div className="flex h-8 items-center gap-2 text-sm">
      <span
        aria-hidden="true"
        className="size-3 shrink-0 rounded-full border border-muted"
        style={{ backgroundColor: side === 'w' ? 'var(--share-white)' : 'var(--share-black)' }}
      />
      {!you && <BotAvatar id={bot.id} className="size-6" />}
      <span className="min-w-0 truncate font-semibold">{name}</span>
      {you && name !== 'Você' && <span className="shrink-0 text-muted">(você)</span>}
      <CapturedPieces color={side} pieces={material.captured[side]} advantage={material.advantage[side]} />
      {game.clocks && (
        <span className={`tabular ml-auto shrink-0 rounded-sm px-1.5 font-semibold ${game.turn === side && game.phase !== 'over' ? 'bg-ink text-bg' : 'bg-surface'} ${game.clocks[side] < 20_000 ? 'text-(--text-blunder)' : ''}`}>
          {formatClock(game.clocks[side] / 1000)}
        </span>
      )}
    </div>
  )

  const statusText =
    game.phase === 'starting'
      ? 'Arrumando as peças…'
      : game.phase === 'bot'
        ? `${bot.name} está pensando…`
        : game.phase === 'checking'
          ? 'Deixa eu ver esse lance…'
          : game.phase === 'player'
            ? game.inCheck
              ? 'Xeque! Sua vez.'
              : 'Sua vez.'
            : ''

  const orientation = color === 'w' ? 'white' : 'black'
  const board = (
    <div className={isDesktop ? 'flex gap-2' : 'flex flex-col gap-1'}>
      {/* A barra vem com o treinador: sem ele, a partida é sem ajuda nenhuma. */}
      {coachOn && <EvalBar evaluation={game.evaluation} orientation={orientation} horizontal={!isDesktop} />}
      <div className={isDesktop ? 'min-w-0 flex-1' : 'min-w-0'}>
        <Board
          fen={game.fen}
          orientation={orientation}
          arrows={arrows}
          squareStyles={squareStyles}
          badge={game.lastGrade}
          interactive={canMove}
          turn={color}
          onPieceDrop={attemptMove}
          onSquareClick={canMove ? onSquareClick : undefined}
        />
      </div>
    </div>
  )

  const coachPanel = (
    <section aria-label="Treinador" aria-live="polite" className="rounded-md bg-surface p-4">
      {game.error ? (
        <p role="alert" className="text-sm font-medium text-(--text-blunder)">
          {game.error}
        </p>
      ) : game.phase === 'warning' ? (
        <>
          <h2 className="font-display text-xl leading-snug font-semibold text-(--text-mistake)">Opa, calma. Tem um lance bem melhor aqui.</h2>
          {game.warning && <p className="mt-2 max-w-prose text-base leading-relaxed">{game.warning}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {allowUndo && (
              <button type="button" onClick={game.undo} className="min-h-11 flex-1 rounded-md bg-action px-4 font-semibold whitespace-nowrap text-on-action">
                Voltar lance
              </button>
            )}
            <button type="button" onClick={game.continueAnyway} className="min-h-11 flex-1 rounded-md border border-line px-4 font-semibold whitespace-nowrap hover:bg-sunken">
              Continuar assim mesmo
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="font-semibold">{statusText}</p>
          {game.comment && <p className="mt-1 max-w-prose text-base leading-relaxed">{game.comment}</p>}
          {game.threat && <p className="mt-1 max-w-prose text-base leading-relaxed">{game.threat.text}</p>}
          {game.hint && (
            <p className="mt-1 text-sm text-muted">
              {game.hint.level === 1 ? 'A peça destacada é a que deve se mexer. Toque em "Dica" de novo para ver o lance.' : 'A seta mostra o melhor lance.'}
            </p>
          )}
        </>
      )}
    </section>
  )

  const coachButtons = coachOn && (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => void game.requestHint()}
        disabled={!canMove || game.busy !== null || game.hint?.level === 2}
        className="min-h-11 flex-1 rounded-md bg-surface px-2 font-semibold hover:bg-sunken disabled:opacity-40"
      >
        {game.busy === 'hint' ? 'Pensando…' : 'Dica'}
      </button>
      <button
        type="button"
        onClick={() => void game.requestThreat()}
        disabled={!canMove || game.busy !== null || game.inCheck}
        title={game.inCheck ? 'Em xeque, a ameaça já está no tabuleiro.' : undefined}
        className="min-h-11 flex-1 rounded-md bg-surface px-2 font-semibold hover:bg-sunken disabled:opacity-40"
      >
        {game.busy === 'threat' ? 'Pensando…' : 'Qual a ameaça?'}
      </button>
    </div>
  )

  const gameButtons = (
    <div className="flex gap-1.5">
      {allowUndo && (
        <button
          type="button"
          onClick={game.undo}
          disabled={game.phase === 'over' || game.phase === 'starting' || game.history.length <= game.lockedPlies || (game.history.length - game.lockedPlies < 2 && game.turn === color)}
          className="min-h-11 flex-1 rounded-md bg-surface px-2 font-semibold hover:bg-sunken disabled:opacity-40"
        >
          Voltar lance
        </button>
      )}
      {confirmResign ? (
        <button
          type="button"
          onClick={() => {
            setConfirmResign(false)
            game.resign()
          }}
          className="min-h-11 flex-1 rounded-md bg-action px-2 font-semibold text-on-action"
        >
          Confirmar desistência
        </button>
      ) : (
        <button type="button" onClick={() => setConfirmResign(true)} disabled={game.phase === 'over'} className="min-h-11 flex-1 rounded-md bg-surface px-2 font-semibold hover:bg-sunken disabled:opacity-40">
          Desistir
        </button>
      )}
    </div>
  )

  const moveText = (
    <ol className="flex flex-wrap gap-x-2 text-base leading-relaxed" aria-label="Lances da partida">
      {game.history.map((move, index) =>
        index % 2 === 0 ? (
          <li key={index}>
            <span className="tabular text-sm text-muted">{index / 2 + 1}.</span> {sanToPt(move.san)} {game.history[index + 1] ? sanToPt(game.history[index + 1].san) : ''}
          </li>
        ) : null,
      )}
    </ol>
  )

  const leaveButton = (
    <button type="button" onClick={onLeave} className="-ml-1 flex min-h-11 shrink-0 items-center gap-1 rounded-md pr-3 pl-1 font-semibold hover:bg-sunken">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="currentColor">
        <path d="M15.4 6.4 14 5l-7 7 7 7 1.4-1.4L9.8 12z" />
      </svg>
      Sair
    </button>
  )

  const dialogs = (
    <>
      {promotion && (
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
                    game.playMove(promotion.from, promotion.to, piece)
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
      )}
      {game.result && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Resultado da partida">
          <div className="w-full max-w-sm rounded-md bg-surface p-5 text-center">
            <p className="font-display text-4xl leading-tight font-bold">{OUTCOME_TITLE[game.result.outcome]}</p>
            <p className="mt-1 text-muted">
              {game.result.reason}{game.history.length > game.lockedPlies ? `, ${Math.ceil(game.history.length / 2)} ${game.history.length > 2 ? 'lances' : 'lance'}` : ''}.
            </p>
            {game.result.hasMoves && (
              <button type="button" autoFocus onClick={() => onReview(game.result!)} className="mt-4 min-h-12 w-full rounded-md bg-action font-semibold text-on-action">
                Revisar partida
              </button>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={onRematch} className="min-h-11 rounded-md border border-line font-semibold hover:bg-sunken">
                Jogar de novo
              </button>
              <button type="button" onClick={onLeave} className="min-h-11 rounded-md border border-line font-semibold hover:bg-sunken">
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  if (isDesktop) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 xl:h-dvh">
        <header className="flex h-14 shrink-0 items-center justify-between">
          {leaveButton}
          {coachOn && <LegendButton />}
        </header>
        <div className="flex min-h-0 flex-1 items-start gap-6 pb-6">
          <div className="shrink-0" style={{ width: `min(max(calc(100dvh - ${coachOn ? '8' : '10'}rem), 18rem), 56vw)` }}>
            <div className={coachOn ? 'ml-8' : ''}>{strip(`${bot.name} (${bot.rating})`, opponentColor, false)}</div>
            {board}
            <div className={coachOn ? 'ml-8' : ''}>{strip(setup.playerName, color, true)}</div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {coachPanel}
            {coachButtons}
            {gameButtons}
            <div className="min-h-24 overflow-y-auto rounded-md bg-surface p-3">{game.history.length > 0 ? moveText : <p className="text-sm text-muted">Os lances aparecem aqui.</p>}</div>
          </div>
        </div>
        {dialogs}
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 px-2">
        {leaveButton}
        {coachOn && <LegendButton compact />}
      </header>
      <div className="mx-auto w-full shrink-0 px-2" style={{ maxWidth: 'max(16rem, calc(100dvh - 24rem))' }}>
        <div>{strip(`${bot.name} (${bot.rating})`, opponentColor, false)}</div>
        {board}
        <div>{strip(setup.playerName, color, true)}</div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {coachPanel}
        {game.history.length > 0 && <div className="rounded-md bg-surface p-3">{moveText}</div>}
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 border-t border-line px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {coachButtons}
        {gameButtons}
      </div>
      {dialogs}
    </div>
  )
}
