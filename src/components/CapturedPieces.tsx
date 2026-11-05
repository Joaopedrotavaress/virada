import { memo } from 'react'
import { defaultPieces } from 'react-chessboard'
import type { Color } from '../chess/evaluation'
import type { CapturedType } from '../chess/material'

const NAMES: Record<CapturedType, [string, string]> = {
  p: ['peão', 'peões'],
  n: ['cavalo', 'cavalos'],
  b: ['bispo', 'bispos'],
  r: ['torre', 'torres'],
  q: ['dama', 'damas'],
}

function describe(pieces: CapturedType[], advantage: number): string {
  const groups = (Object.keys(NAMES) as CapturedType[])
    .map((type) => [type, pieces.filter((piece) => piece === type).length] as const)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${count} ${NAMES[type][count === 1 ? 0 : 1]}`)
  const parts = [groups.length ? `Capturou ${groups.join(', ')}` : '', advantage > 0 ? `${advantage} ${advantage === 1 ? 'ponto' : 'pontos'} à frente` : ''].filter(Boolean)
  return parts.join('. ')
}

interface CapturedPiecesProps {
  /** Cor de quem capturou: as peças mostradas são do outro lado. */
  color: Color
  pieces: CapturedType[]
  advantage: number
}

/** Peças que um jogador tomou, agrupadas por tipo, e o placar de material. */
export const CapturedPieces = memo(function CapturedPieces({ color, pieces, advantage }: CapturedPiecesProps) {
  if (pieces.length === 0 && advantage === 0) return null
  const prefix = color === 'w' ? 'b' : 'w'
  const types = (Object.keys(NAMES) as CapturedType[]).filter((type) => pieces.includes(type))
  return (
    <span role="img" aria-label={describe(pieces, advantage)} title={describe(pieces, advantage)} className="flex shrink-0 items-center gap-1.5">
      {types.length > 0 && (
        <span aria-hidden="true" className="flex items-center gap-1">
          {types.map((type) => {
            const Piece = defaultPieces[`${prefix}${type.toUpperCase()}`]
            return (
              <span key={type} className="flex">
                {pieces
                  .filter((piece) => piece === type)
                  .map((_, index) => (
                    <span key={index} className={`size-4 ${prefix === 'b' ? 'captured-dark' : ''} ${index > 0 ? '-ml-2.5' : ''}`}>
                      <Piece />
                    </span>
                  ))}
              </span>
            )
          })}
        </span>
      )}
      {advantage > 0 && <span className="tabular text-xs font-semibold text-muted">+{advantage}</span>}
    </span>
  )
})
