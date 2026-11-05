import { type CSSProperties, useEffect, useRef } from 'react'
import { type Arrow, Chessboard } from 'react-chessboard'
import type { MoveClass } from '../chess/classify'
import { ClassBadge } from './ClassBadge'

// A biblioteca do tabuleiro usa a cor no identificador da seta: aqui precisa ser um valor literal.
export const BEST_ARROW_COLOR = '#0e8a7d'
export const THREAT_ARROW_COLOR = '#d12d2d'

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
  const container = useRef<HTMLDivElement>(null)
  // A biblioteca deixa cada peça focável, mesmo sem nome: 32 paradas de Tab inúteis antes dos botões.
  useEffect(() => {
    for (const element of container.current?.querySelectorAll('[tabindex="0"]') ?? []) element.setAttribute('tabindex', '-1')
  })
  return (
    <div ref={container} className={`w-full overflow-hidden rounded-sm ${animateArrow ? 'arrow-pop' : ''}`}>
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
          darkSquareStyle: { backgroundColor: 'var(--board-dark)' },
          lightSquareStyle: { backgroundColor: 'var(--board-light)' },
          darkSquareNotationStyle: { color: 'var(--board-notation-on-dark)' },
          lightSquareNotationStyle: { color: 'var(--board-notation-on-light)' },
          // As letras e os números ficam por cima das peças da borda.
          alphaNotationStyle: { position: 'absolute', right: '3%', bottom: '2%', zIndex: 5, fontSize: '11px', fontWeight: 700, lineHeight: 1, pointerEvents: 'none' },
          numericNotationStyle: { position: 'absolute', left: '3%', top: '2%', zIndex: 5, fontSize: '11px', fontWeight: 700, lineHeight: 1, pointerEvents: 'none' },
          onPieceDrop: ({ sourceSquare, targetSquare }) => (targetSquare && onPieceDrop ? onPieceDrop(sourceSquare, targetSquare) : false),
          onSquareClick: ({ square }) => onSquareClick?.(square),
          squareRenderer: ({ square, children }) => (
            // Com squareRenderer, a biblioteca ignora squareStyles: o estilo precisa ser aplicado aqui.
            <div style={{ position: 'relative', width: '100%', height: '100%', ...squareStyles[square], boxShadow: squareStyles[square]?.backgroundColor === 'var(--board-last)' ? 'inset 0 0 0 3px var(--zone-0)' : undefined }}>
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
