import { Chess } from 'chess.js'

const PT_PIECES: Record<string, string> = { N: 'C', B: 'B', R: 'T', Q: 'D', K: 'R' }

/** Nf3 → Cf3, Qxd5+ → Dxd5+, Rd8# → Td8#, e8=Q → e8=D. O roque não muda. */
export function sanToPt(san: string): string {
  return san.replace(/[NBRQK]/g, (piece) => PT_PIECES[piece])
}

export function uciParts(uci: string): { from: string; to: string; promotion?: string } {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }
}

/** Converte um lance UCI em SAN (inglês) na posição dada. Retorna null se for ilegal. */
export function uciToSan(fen: string, uci: string | null): string | null {
  if (!uci) return null
  try {
    return new Chess(fen).move(uciParts(uci)).san
  } catch {
    return null
  }
}

/** Converte uma linha de lances UCI em SAN, parando no primeiro lance que não encaixar. */
export function pvToSan(fen: string, pv: string[], limit = 6): string[] {
  const chess = new Chess(fen)
  const line: string[] = []
  for (const uci of pv.slice(0, limit)) {
    try {
      line.push(chess.move(uciParts(uci)).san)
    } catch {
      break
    }
  }
  return line
}

/** Linha com numeração, em português: "12. Cf3 e5 13. Bc4" ou "12... e5 13. Cf3". */
export function formatLinePt(fen: string, sans: string[]): string {
  const [, side, , , , fullMove] = fen.split(' ')
  let number = Number(fullMove)
  let isWhite = side === 'w'
  const parts: string[] = []
  sans.forEach((san, index) => {
    if (isWhite) parts.push(`${number}. ${sanToPt(san)}`)
    else if (index === 0) parts.push(`${number}... ${sanToPt(san)}`)
    else parts.push(sanToPt(san))
    if (!isWhite) number += 1
    isWhite = !isWhite
  })
  return parts.join(' ')
}
