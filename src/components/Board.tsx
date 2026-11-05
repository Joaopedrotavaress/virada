import type { CSSProperties } from 'react'
import { type Arrow, Chessboard } from 'react-chessboard'
import type { MoveClass } from '../chess/classify'
import { ClassBadge } from './ClassBadge'

export const BEST_ARROW_COLOR = '#0e8a7d'

interface BoardProps {
  fen: string
  orientation: 'white' | 'black'
  arrows?: Arrow[]
  squareStyles?: Record<string, CSSProperties>
  badge?: { square: string; cls: MoveClass } | null
  /** Destaca a seta quando ela aparece ("Achou!"). */
  animateArrow?: boolean
  /** Duração da animação das peças, em ms. */
  animationMs?: number
  /** Quando verdadeiro, as peças podem ser movidas. */
  interactive?: boolean
  /** De quem é a vez: só essas peças podem ser arrastadas. */
  turn?: 'w' | 'b'
  onPieceDrop?: (from: string, to: string) => boolean
  onSquareClick?: (square: string) => void
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function Board({ fen, orientation, arrows = [], squareStyles = {}, badge, animateArrow = false, animationMs = 140, interactive = false, turn, onPieceDrop, onSquareClick }: BoardProps) {
  return (
    <div className={`w-full overflow-hidden rounded-sm ${animateArrow ? 'arrow-pop' : ''}`}>
      <Chessboard
        options={{
          id: 'tabuleiro',
          position: fen,
          boardOrientation: orientation,
          arrows,
          squareStyles,
          allowDragging: interactive,
          canDragPiece: ({ piece }) => !turn || piece.pieceType[0] === turn,
          allowDrawingArrows: false,
          animationDurationInMs: reducedMotion() ? 0 : animationMs,
          darkSquareStyle: { backgroundColor: '#6f8da1' },
          lightSquareStyle: { backgroundColor: '#dfe6eb' },
          darkSquareNotationStyle: { color: '#dfe6eb' },
          lightSquareNotationStyle: { color: '#55707f' },
          onPieceDrop: ({ sourceSquare, targetSquare }) => (targetSquare && onPieceDrop ? onPieceDrop(sourceSquare, targetSquare) : false),
          onSquareClick: ({ square }) => onSquareClick?.(square),
          squareRenderer: ({ square, children }) => (
            // Com squareRenderer, a biblioteca ignora squareStyles: o estilo precisa ser aplicado aqui.
            <div style={{ position: 'relative', width: '100%', height: '100%', ...squareStyles[square] }}>
              {children}
              {badge?.square === square && (
                <ClassBadge cls={badge.cls} className="pointer-events-none absolute top-[1%] right-[1%] z-10 w-[42%]" />
              )}
            </div>
          ),
        }}
      />
    </div>
  )
}
