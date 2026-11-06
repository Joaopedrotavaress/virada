import { Chess, type Square } from 'chess.js'
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { BEST_ARROW_COLOR, Board, THREAT_ARROW_COLOR } from '../components/Board'
import { Icon } from '../components/Icons'
import { Professor } from '../components/Professor'
import type { Frame } from '../guide/aulas'
import { framesWithFens } from './roadmap'

const LAST_MOVE_TINT = 'var(--board-last)'
const GOOD_TINT = 'var(--mark-good)'
const BAD_TINT = 'var(--mark-bad)'
const FOCUS_TINT = 'var(--mark-focus)'
const MIN_FRAME_MS = 1800
const MS_PER_LETTER = 45

const stylesOf = (frame: Frame, fen: string, last: { from: string; to: string } | null) => {
  const styles: Record<string, CSSProperties> = {}
  if (last) {
    styles[last.from] = { backgroundColor: LAST_MOVE_TINT }
    styles[last.to] = { backgroundColor: LAST_MOVE_TINT }
  }
  if (frame.reach) {
    const moves = new Chess(fen).moves({ square: frame.reach as Square, verbose: true })
    for (const move of moves) styles[move.to] = { backgroundColor: GOOD_TINT }
    styles[frame.reach] = { backgroundColor: FOCUS_TINT }
  }
  for (const square of frame.good ?? []) styles[square] = { backgroundColor: GOOD_TINT }
  for (const square of frame.bad ?? []) styles[square] = { backgroundColor: BAD_TINT }
  for (const square of frame.focus ?? []) styles[square] = { backgroundColor: FOCUS_TINT }
  return styles
}

const arrowsOf = (frame: Frame) => [
  ...(frame.arrows ?? []).map(([startSquare, endSquare]) => ({ startSquare, endSquare, color: BEST_ARROW_COLOR })),
  ...(frame.threats ?? []).map(([startSquare, endSquare]) => ({ startSquare, endSquare, color: THREAT_ARROW_COLOR })),
]

/** Peças de quem começa a aula ficam embaixo. */
export const orientationOf = (fen: string): 'white' | 'black' => (fen.split(' ')[1] === 'b' ? 'black' : 'white')

export interface DemoState {
  index: number
  total: number
  frame: Frame
  fen: string
  styles: Record<string, CSSProperties>
  arrows: { startSquare: string; endSquare: string; color: string }[]
  playing: boolean
  atEnd: boolean
  next: () => void
  previous: () => void
  toggle: () => void
}

/** Controla a demonstração: um quadro por vez, à mão ou sozinha, no ritmo da leitura. */
export function useDemo(frames: Frame[]): DemoState {
  const steps = useMemo(() => framesWithFens(frames), [frames])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const atEnd = index === frames.length - 1
  const frame = frames[index]
  const { fen, last } = steps[index]

  useEffect(() => {
    if (!playing) return
    if (atEnd) {
      setPlaying(false)
      return
    }
    const timer = setTimeout(() => setIndex((current) => Math.min(current + 1, frames.length - 1)), Math.max(MIN_FRAME_MS, frame.say.length * MS_PER_LETTER))
    return () => clearTimeout(timer)
  }, [atEnd, frame.say.length, frames.length, index, playing])

  return {
    index,
    total: frames.length,
    frame,
    fen,
    styles: stylesOf(frame, fen, last),
    arrows: arrowsOf(frame),
    playing,
    atEnd,
    next: () => {
      setPlaying(false)
      setIndex((current) => Math.min(current + 1, frames.length - 1))
    },
    previous: () => {
      setPlaying(false)
      setIndex((current) => Math.max(current - 1, 0))
    },
    toggle: () => setPlaying((current) => !current),
  }
}

export function DemoBoard({ demo, orientation }: { demo: DemoState; orientation: 'white' | 'black' }) {
  return <Board fen={demo.fen} orientation={orientation} arrows={demo.arrows} squareStyles={demo.styles} animationMs={260} />
}

/** A fala do professor e os controles. Fica embaixo do tabuleiro no celular, ao lado no computador. */
export function DemoPanel({ demo, onFinish, finishLabel }: { demo: DemoState; onFinish: () => void; finishLabel: string }) {
  const nextButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        if (demo.atEnd) onFinish()
        else demo.next()
      } else if (event.key === 'ArrowLeft') demo.previous()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [demo, onFinish])

  return (
    <div className="flex flex-col gap-3">
      <Professor say={demo.frame.say} large>
        <p aria-live="polite" className="min-h-28 rounded-md bg-surface p-3 text-lg leading-snug">
          {demo.frame.say}
        </p>
      </Professor>
      <div className="flex items-center gap-2">
        <button type="button" onClick={demo.previous} disabled={demo.index === 0} aria-label="Quadro anterior" className="flex size-12 shrink-0 items-center justify-center rounded-md border border-line hover:bg-sunken disabled:opacity-40">
          <Icon name="previous" className="size-6" />
        </button>
        <button type="button" onClick={demo.toggle} disabled={demo.atEnd} aria-label={demo.playing ? 'Pausar' : 'Tocar sozinho'} aria-pressed={demo.playing} className="flex size-12 shrink-0 items-center justify-center rounded-md border border-line hover:bg-sunken disabled:opacity-40">
          {demo.playing ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="currentColor">
              <path d="M7 5h4v14H7zm6 0h4v14h-4z" />
            </svg>
          ) : (
            <Icon name="next" className="size-6" />
          )}
        </button>
        <p className="tabular flex-1 text-center text-sm text-muted">
          {demo.index + 1} de {demo.total}
        </p>
        <button ref={nextButton} type="button" onClick={demo.atEnd ? onFinish : demo.next} className="min-h-12 shrink-0 rounded-md bg-action px-5 font-semibold text-on-action">
          {demo.atEnd ? finishLabel : 'Próximo'}
        </button>
      </div>
    </div>
  )
}
