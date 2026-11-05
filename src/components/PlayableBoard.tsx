import { Chess } from 'chess.js'
import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from 'react'
import type { Arrow } from 'react-chessboard'
import type { MoveClass } from '../chess/classify'
import { Board } from './Board'

const PROMOTIONS = [
  { piece: 'q', label: 'Dama' },
  { piece: 'r', label: 'Torre' },
  { piece: 'b', label: 'Bispo' },
  { piece: 'n', label: 'Cavalo' },
]

function legalMoves(fen: string, from: string) {
  try {
    return new Chess(fen).moves({ square: from as never, verbose: true })
  } catch {
    return []
  }
}

interface PlayableBoardProps {
  fen: string
  orientation: 'white' | 'black'
  /** Sem isto, o tabuleiro só mostra. */
  canMove: boolean
  onMove: (from: string, to: string, promotion?: string) => boolean
  arrows?: Arrow[]
  squareStyles?: Record<string, CSSProperties>
  badge?: { square: string; cls: MoveClass } | null
  animateArrow?: boolean
  /** Casa do lance certo: a onda amarela sai dela. */
  celebrate?: string | null
}

const FILES = 'abcdefgh'

/** O acerto: uma onda amarela sai da casa do lance. Decorativa, e some sozinha. */
function Acerto({ square, orientation }: { square: string; orientation: 'white' | 'black' }) {
  const file = FILES.indexOf(square[0])
  const rank = 8 - Number(square[1])
  const x = orientation === 'white' ? file : 7 - file
  const y = orientation === 'white' ? rank : 7 - rank
  const style = { left: `${x * 12.5}%`, top: `${y * 12.5}%` }
  return (
    <>
      <span aria-hidden="true" className="acerto-casa" style={style} />
      <span aria-hidden="true" className="acerto-onda" style={style} />
    </>
  )
}

/** Tabuleiro que aceita arrastar ou tocar na peça e no destino, com a escolha de promoção. */
export function PlayableBoard({ fen, orientation, canMove, onMove, arrows, squareStyles, badge, animateArrow, celebrate }: PlayableBoardProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null)
  const turn = fen.split(' ')[1] as 'w' | 'b'

  useEffect(() => setSelected(null), [fen])

  const attempt = (from: string, to: string): boolean => {
    if (!canMove) return false
    const candidates = legalMoves(fen, from).filter((candidate) => candidate.to === to)
    if (candidates.length === 0) return false
    setSelected(null)
    if (candidates.some((candidate) => candidate.promotion)) {
      setPromotion({ from, to })
      return false
    }
    return onMove(from, to)
  }

  const onSquareClick = (square: string) => {
    if (!canMove) return
    if (selected && selected !== square && legalMoves(fen, selected).some((candidate) => candidate.to === square)) {
      attempt(selected, square)
      return
    }
    const hasMoves = legalMoves(fen, square).length > 0
    setSelected(selected === square || !hasMoves ? null : square)
  }

  const styles = useMemo(() => {
    const result: Record<string, CSSProperties> = { ...squareStyles }
    if (selected) {
      result[selected] = { backgroundColor: 'var(--board-select)' }
      for (const candidate of legalMoves(fen, selected)) {
        result[candidate.to] = {
          ...result[candidate.to],
          backgroundImage: candidate.captured ? 'radial-gradient(circle, transparent 58%, var(--board-hint) 60%)' : 'radial-gradient(circle, var(--board-hint) 22%, transparent 24%)',
        }
      }
    }
    return result
  }, [fen, selected, squareStyles])

  return (
    <>
      <div className="relative">
        <Board fen={fen} orientation={orientation} arrows={arrows} squareStyles={styles} badge={badge} animateArrow={animateArrow} interactive={canMove} turn={turn} onPieceDrop={attempt} onSquareClick={canMove ? onSquareClick : undefined} />
        {celebrate && <Acerto key={celebrate} square={celebrate} orientation={orientation} />}
      </div>
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
                    onMove(promotion.from, promotion.to, piece)
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
    </>
  )
}

/** Tela de exercício: o tabuleiro sempre à vista e o texto ao lado, ou embaixo no celular. */
export function BoardScreen({ title, status, onBack, board, children }: { title: string; status?: string; onBack: () => void; board: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-6xl flex-col overflow-hidden lg:px-6">
      <header className="flex min-h-12 shrink-0 items-center gap-2 px-2 lg:px-0">
        <button type="button" onClick={onBack} className="-ml-1 flex min-h-11 shrink-0 items-center gap-1 rounded-md pr-3 pl-1 font-semibold hover:bg-sunken">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="currentColor">
            <path d="M15.4 6.4 14 5l-7 7 7 7 1.4-1.4L9.8 12z" />
          </svg>
          Voltar
        </button>
        <h1 className="min-w-0 flex-1 truncate text-right text-sm font-semibold lg:text-base">{title}</h1>
        {status && <p className="tabular shrink-0 text-sm text-muted">{status}</p>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-start lg:gap-6 lg:pb-6">
        <div className="mx-auto w-full shrink-0 px-2 lg:mx-0 lg:px-0 lg:[--board:min(max(calc(100dvh-5rem),18rem),56vw)] lg:w-(--board)" style={{ maxWidth: 'max(16rem, calc(100dvh - 21rem))' }}>
          {board}
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 self-stretch overflow-y-auto p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:p-0">{children}</div>
      </div>
    </div>
  )
}
