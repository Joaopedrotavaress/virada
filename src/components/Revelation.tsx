import { Chess } from 'chess.js'
import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import { defaultPieces } from 'react-chessboard'
import { uciParts } from '../chess/notation'

const FILES = 'abcdefgh'
const FIRST_MOVE_AT = 1250

/** Quando a placa sobe: depois do último lance e de a peça sair voando. */
export const placaDelay = (moveCount: number) => FIRST_MOVE_AT + (Math.max(1, moveCount) - 1) * 700 + 300 + 500
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
  /** A casa de onde a luz parte e que fica amarela. */
  focus: string
  /** Qual lance acende a casa amarela. Padrão: o último. Negativo: ela já começa acesa. */
  focusAt?: number
  /** Falso mostra direto a posição final. */
  animate?: boolean
  /** Quando a última peça para de mexer, em ms. */
  onSettled?: (ms: number) => void
}

function place(square: string, orientation: 'white' | 'black') {
  const file = FILES.indexOf(square[0])
  const rank = 8 - Number(square[1])
  return orientation === 'white' ? { x: file, y: rank } : { x: 7 - file, y: 7 - rank }
}

/** O tabuleiro da Revelação. Sem animação, mostra direto a posição final: o estado de repouso é sempre o certo. */
export function RevelationBoard({ fen, moves: moveList, orientation = 'white', focus, focusAt, animate = true, onSettled }: RevelationBoardProps) {
  const root = useRef<HTMLDivElement>(null)
  // Compara pelo conteúdo: uma lista nova com os mesmos lances não reinicia a animação.
  const line = moveList.join(' ')
  const moves = useMemo(() => line.split(' ').filter(Boolean), [line])

  const { pieces, plan, matedSquare, matedKey } = useMemo(() => {
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
    // Se a sequência termina em mate, o rei de quem levou o mate também voa.
    let mated: string | undefined
    if (chess.isCheckmate()) {
      for (const row of chess.board()) for (const cell of row) if (cell?.type === 'k' && cell.color === chess.turn()) mated = cell.square
    }
    return { pieces: views, plan: steps, matedSquare: mated, matedKey: mated ? whereIs.get(mated) : undefined }
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
    if (!animate || reducedMotion()) {
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

    /** A peça sai em arco, girando: sobe, cruza o tabuleiro e cai para o lado mais perto da borda. */
    const flyAway = (node: HTMLElement, square: string, delay: number) => {
      const side = place(square, orientation).x < 4 ? -1 : 1
      const path = Array.from({ length: 21 }, (_, index) => {
        const t = index / 20
        const x = side * 800 * t
        const y = 300 * t - 1200 * t * (1 - t)
        const scale = 1 + 0.5 * Math.min(t / 0.3, 1)
        return { transform: `translate(${x}%, ${y}%) rotate(${side * 720 * t}deg) scale(${scale})`, opacity: t < 0.85 ? 1 : (1 - t) / 0.15, zIndex: 20 }
      })
      return node.animate(path, { duration: 1000, delay, fill: 'forwards' })
    }

    const arrivals: number[] = []
    let clock = FIRST_MOVE_AT
    const pieceElement = (key: string) => element.querySelector<HTMLElement>(`[data-piece-key="${key}"]`)

    for (const piece of pieces) {
      const node = pieceElement(piece.key)
      if (!node) continue
      const here = place(piece.square, orientation)
      // A peça capturada termina invisível: ela precisa continuar acesa até sair voando.
      animations.push(node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, delay: delayOf(here.x, here.y) + 200, fill: capturedKeys.has(piece.key) ? 'both' : 'backwards' }))
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
        if (taken) animations.push(flyAway(taken, finalSquare.get(step.captured) as string, clock + duration))
      }
      if (step.rook) {
        const rook = pieceElement(step.rook.key)
        if (rook) {
          const a = place(step.rook.from, orientation)
          const b = place(step.rook.to, orientation)
          animations.push(rook.animate([{ transform: `translate(${(a.x - b.x) * 100}%, ${(a.y - b.y) * 100}%)` }, { transform: 'none' }], { duration, delay: clock, fill: 'backwards' }))
        }
      }
      arrivals.push(clock + duration)
      clock += duration + 300
    })
    const impact = clock - 300
    const focusArrival = focusAt === undefined ? impact : (arrivals[focusAt] ?? FIRST_MOVE_AT)

    for (const mark of element.querySelectorAll<HTMLElement>('[data-mark]')) {
      const delay = mark.dataset.mark === 'focus' ? focusArrival - 120 : impact - 280
      animations.push(mark.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay, fill: 'backwards' }))
    }
    if (matedKey) {
      const king = pieceElement(matedKey)
      if (king && matedSquare) animations.push(flyAway(king, matedSquare, impact))
    }
    const wave = element.querySelector<HTMLElement>('[data-wave]')
    if (wave) {
      animations.push(wave.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(4.5)' }], { duration: 750, delay: focusArrival, easing: EASE_OUT }))
    }
    animations.push(element.animate([{ translate: '0 0' }, { translate: '0 5px', offset: 0.3 }, { translate: '0 0' }], { duration: 320, delay: impact, easing: 'ease-out' }))

    onSettled?.(impact + 150)
    return () => {
      for (const animation of animations) animation.cancel()
    }
    // Roda uma vez para cada posição.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, moves, orientation, focus, focusAt, animate])

  const percent = (square: string) => {
    const { x, y } = place(square, orientation)
    return { left: `${x * 12.5}%`, top: `${y * 12.5}%`, width: '12.5%', height: '12.5%' }
  }

  return (
    <div ref={root} className="relative z-20 aspect-square w-full" role="img" aria-label={last ? `Tabuleiro: o lance foi de ${last.from} para ${last.to}.` : 'Tabuleiro'}>
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
        {Array.from({ length: 64 }, (_, index) => {
          const x = index % 8
          const y = Math.floor(index / 8)
          return <div key={index} data-cell data-x={x} data-y={y} style={{ background: (x + y) % 2 === 0 ? 'var(--board-light)' : 'var(--board-dark)' }} />
        })}
      </div>
      {last && <div data-mark className="absolute" style={{ ...percent(last.from), background: 'var(--board-from)' }} />}
      <div data-mark="focus" className="absolute" style={{ ...percent(focus), background: 'var(--action)' }} />
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
      <div className="font-display tabular shrink-0 text-[6.5rem] leading-[0.85] font-extrabold tracking-tighter">{number}</div>
      <div className="min-w-0">
        <p className="font-display text-[1.75rem] leading-none font-extrabold text-balance">{title}</p>
        {note && <p className="mt-1.5 text-sm font-semibold">{note}</p>}
      </div>
    </div>
  )
}
