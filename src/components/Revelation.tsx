import { Chess, type Square } from 'chess.js'
import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import { defaultPieces } from 'react-chessboard'
import { sanToPt, uciParts } from '../chess/notation'
import { ZoneRamp } from './Logo'

const FILES = 'abcdefgh'
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'

interface Step {
  from: string
  to: string
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface PieceView {
  key: string
  code: string
  square: string
}

interface RevelationBoardProps {
  fen: string
  /** Lances a mostrar, em notação UCI. */
  moves: string[]
  orientation?: 'white' | 'black'
  /** A casa de onde a luz parte e que termina em amarelo. */
  focus: string
  /** Rei em xeque-mate, quando o último lance for mate. */
  matedSquare?: string
  /** Quando a última peça para de mexer, em ms. */
  onSettled?: (ms: number) => void
}

function place(square: string, orientation: 'white' | 'black') {
  const file = FILES.indexOf(square[0])
  const rank = 8 - Number(square[1])
  return orientation === 'white' ? { x: file, y: rank } : { x: 7 - file, y: 7 - rank }
}

/** O tabuleiro da Revelação. Sem animação, mostra direto a posição final: o estado de repouso é sempre o certo. */
export function RevelationBoard({ fen, moves, orientation = 'white', focus, matedSquare, onSettled }: RevelationBoardProps) {
  const root = useRef<HTMLDivElement>(null)

  const { pieces, plan } = useMemo(() => {
    const chess = new Chess(fen)
    const views: PieceView[] = []
    for (const row of chess.board()) {
      for (const cell of row) {
        if (cell) views.push({ key: cell.square, code: `${cell.color}${cell.type.toUpperCase()}`, square: cell.square })
      }
    }
    // De cada peça, onde ela está agora, para seguir o caminho dela ao longo dos lances.
    const whereIs = new Map(views.map((view) => [view.square as string, view.key]))
    const steps: { key: string; from: string; to: string; captured?: string; rook?: { key: string; from: string; to: string } }[] = []
    for (const uci of moves) {
      const move = chess.move(uciParts(uci))
      const key = whereIs.get(move.from) as string
      const capturedSquare = move.isEnPassant() ? `${move.to[0]}${move.from[1]}` : move.to
      const captured = move.captured ? whereIs.get(capturedSquare) : undefined
      whereIs.delete(move.from)
      whereIs.set(move.to, key)
      let rook
      if (move.isKingsideCastle() || move.isQueensideCastle()) {
        const rank = move.from[1]
        const from = (move.isKingsideCastle() ? 'h' : 'a') + rank
        const to = (move.isKingsideCastle() ? 'f' : 'd') + rank
        rook = { key: whereIs.get(from) as string, from, to }
        whereIs.delete(from)
        whereIs.set(to, rook.key)
      }
      steps.push({ key, from: move.from, to: move.to, captured, rook })
    }
    return { pieces: views, plan: steps }
  }, [fen, moves])

  const last: Step | undefined = plan[plan.length - 1]
  const finalSquare = useMemo(() => {
    const result = new Map(pieces.map((piece) => [piece.key, piece.square]))
    for (const step of plan) {
      result.set(step.key, step.to)
      if (step.rook) result.set(step.rook.key, step.rook.to)
    }
    return result
  }, [pieces, plan])
  const capturedKeys = useMemo(() => new Set(plan.flatMap((step) => (step.captured ? [step.captured] : []))), [plan])

  useEffect(() => {
    const element = root.current
    if (!element) return
    if (reducedMotion()) {
      onSettled?.(0)
      return
    }
    const animations: Animation[] = []
    const target = place(focus, orientation)
    const delayOf = (x: number, y: number) => 150 + Math.hypot(x - target.x, y - target.y) * 85

    for (const square of element.querySelectorAll<HTMLElement>('[data-cell]')) {
      const x = Number(square.dataset.x)
      const y = Number(square.dataset.y)
      animations.push(
        square.animate(
          [
            { opacity: 0, filter: 'brightness(0.2)' },
            { opacity: 1, filter: 'brightness(1.6)', offset: 0.6 },
            { opacity: 1, filter: 'brightness(1)' },
          ],
          { duration: 650, delay: delayOf(x, y), easing: 'ease-out', fill: 'backwards' },
        ),
      )
    }
    animations.push(element.animate([{ transform: 'rotate(-1.6deg) scale(0.97)' }, { transform: 'none' }], { duration: 900, delay: 700, easing: EASE_OUT, fill: 'backwards' }))

    let clock = 1250
    const pieceElement = (key: string) => element.querySelector<HTMLElement>(`[data-piece-key="${key}"]`)

    for (const piece of pieces) {
      const node = pieceElement(piece.key)
      if (!node) continue
      const here = place(piece.square, orientation)
      animations.push(node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, delay: delayOf(here.x, here.y) + 200, fill: 'backwards' }))
    }

    plan.forEach((step, index) => {
      const duration = index === plan.length - 1 ? 300 : 400
      const node = pieceElement(step.key)
      if (node) {
        const from = place(step.from, orientation)
        const final = place(finalSquare.get(step.key) as string, orientation)
        const to = place(step.to, orientation)
        const at = (square: { x: number; y: number }, scale = 1) => `translate(${(square.x - final.x) * 100}%, ${(square.y - final.y) * 100}%) scale(${scale})`
        const near = { x: from.x + (to.x - from.x) * 0.75, y: from.y + (to.y - from.y) * 0.75 }
        animations.push(
          node.animate([{ transform: at(from) }, { transform: at(near, 1.2), offset: 0.6 }, { transform: at(to) }], { duration, delay: clock, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'backwards' }),
        )
        node.style.zIndex = '4'
      }
      if (step.captured) {
        const taken = pieceElement(step.captured)
        if (taken) {
          // A peça capturada some no lance: fica visível até a outra chegar.
          animations.push(taken.animate([{ opacity: 1 }, { opacity: 1 }], { duration: clock + duration, fill: 'backwards' }))
          animations.push(taken.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 60, delay: clock + duration, fill: 'forwards' }))
        }
      }
      if (step.rook) {
        const rook = pieceElement(step.rook.key)
        if (rook) {
          const a = place(step.rook.from, orientation)
          const b = place(step.rook.to, orientation)
          animations.push(rook.animate([{ transform: `translate(${(a.x - b.x) * 100}%, ${(a.y - b.y) * 100}%)` }, { transform: 'none' }], { duration, delay: clock, fill: 'backwards' }))
        }
      }
      clock += duration + 300
    })
    const impact = clock - 300

    for (const mark of element.querySelectorAll<HTMLElement>('[data-mark]')) {
      animations.push(mark.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: impact - 280, fill: 'backwards' }))
    }
    const wave = element.querySelector<HTMLElement>('[data-wave]')
    if (wave) {
      animations.push(wave.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(4.5)' }], { duration: 750, delay: impact, easing: EASE_OUT }))
    }
    animations.push(element.animate([{ translate: '0 0' }, { translate: '0 5px', offset: 0.3 }, { translate: '0 0' }], { duration: 320, delay: impact, easing: 'ease-out' }))

    onSettled?.(impact + 150)
    return () => {
      for (const animation of animations) animation.cancel()
    }
    // Roda uma vez para cada posição.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, moves, orientation, focus])

  const percent = (square: string) => {
    const { x, y } = place(square, orientation)
    return { left: `${x * 12.5}%`, top: `${y * 12.5}%`, width: '12.5%', height: '12.5%' }
  }

  return (
    <div ref={root} className="relative aspect-square w-full" role="img" aria-label={last ? `Tabuleiro: o lance foi de ${last.from} para ${last.to}.` : 'Tabuleiro'}>
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
        {Array.from({ length: 64 }, (_, index) => {
          const x = index % 8
          const y = Math.floor(index / 8)
          return <div key={index} data-cell data-x={x} data-y={y} style={{ background: (x + y) % 2 === 0 ? 'var(--board-light)' : 'var(--board-dark)' }} />
        })}
      </div>
      {last && <div data-mark className="absolute" style={{ ...percent(last.from), background: 'var(--board-from)' }} />}
      <div data-mark className="absolute" style={{ ...percent(focus), background: 'var(--action)' }} />
      {matedSquare && <div data-mark className="absolute" style={{ ...percent(matedSquare), background: 'var(--board-mated)' }} />}
      {pieces.map((piece) => {
        const Piece = defaultPieces[piece.code as keyof typeof defaultPieces]
        const square = finalSquare.get(piece.key) as string
        return (
          <div key={piece.key} data-piece-key={piece.key} className="absolute" style={{ ...percent(square), visibility: capturedKeys.has(piece.key) && reducedMotion() ? 'hidden' : undefined, opacity: capturedKeys.has(piece.key) ? 0 : undefined }}>
            {Piece ? <Piece /> : null}
          </div>
        )
      })}
      <div data-wave className="pointer-events-none absolute opacity-0" style={{ ...percent(focus), border: '4px solid var(--action)' }} />
    </div>
  )
}

/** A placa amarela: o número grande e o que ele quer dizer. Sobe de baixo no fim da revelação. */
export function Placa({ number, title, note, delayMs = 0, animate = true }: { number: ReactNode; title: string; note?: string; delayMs?: number; animate?: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!animate || !root.current || reducedMotion()) return
    const animation = root.current.animate([{ transform: 'translateY(110vh)' }, { transform: 'none' }], { duration: 550, delay: delayMs, easing: EASE_OUT, fill: 'backwards' })
    return () => animation.cancel()
  }, [animate, delayMs])
  return (
    <div ref={root} className="flex items-center gap-3 bg-action px-5 py-3 text-on-action">
      <div className="font-display tabular shrink-0 text-[6.5rem] leading-[0.8] font-extrabold tracking-tighter">{number}</div>
      <div className="min-w-0">
        <p className="font-display text-[1.75rem] leading-none font-extrabold text-balance">{title}</p>
        {note && <p className="mt-1.5 text-sm font-semibold">{note}</p>}
      </div>
    </div>
  )
}

/** Tela cheia ao terminar uma análise: mostra onde a partida virou e sai sozinha. Um toque pula. */
export function RevelationOverlay({ fen, uci, san, moveNumber, isUserMove, label, orientation, onDone }: { fen: string; uci: string; san: string; moveNumber: number; isUserMove: boolean; label: string; orientation: 'white' | 'black'; onDone: () => void }) {
  const moves = useMemo(() => [uci], [uci])
  const { to } = uciParts(uci)
  const done = useRef(onDone)
  done.current = onDone
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    button.current?.focus()
    if (reducedMotion()) {
      const timer = setTimeout(() => done.current(), 1800)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(() => done.current(), 4300)
    return () => clearTimeout(timer)
  }, [])
  return (
    <button ref={button} type="button" onClick={onDone} aria-label="Pular e ver a análise" className="fixed inset-0 z-30 flex flex-col bg-bg text-left text-ink">
      <ZoneRamp />
      <div className="mx-auto flex min-h-0 w-full max-w-[min(100%,calc(100dvh-14rem))] flex-1 flex-col justify-center px-4 lg:max-w-[min(32rem,calc(100dvh-14rem))]">
        <RevelationBoard fen={fen} moves={moves} orientation={orientation} focus={to} />
      </div>
      <Placa number={moveNumber} title={isUserMove ? 'Foi aqui que a sua partida virou.' : 'Foi aqui que a partida virou.'} note={`${sanToPt(san)}, ${label}. Toque para ver a análise.`} delayMs={1900} />
    </button>
  )
}

export const OPERA_FEN = '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16'
export const OPERA_MOVES = ['b3b8', 'd7b8', 'd1d8']
export const OPERA_MATED: Square = 'e8'
