export interface OpeningInfo {
  eco: string
  name: string
}

export interface BookData {
  names: string[]
  positions: Record<string, number>
}

/** A chave é o FEN sem os contadores de lance: assim as transposições caem na mesma entrada. */
export const bookKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ')

let cached: Promise<BookData | null> | null = null

/** Carrega a base só quando precisa: ela é grande e fica num arquivo separado do app. */
export function loadBook(): Promise<BookData | null> {
  cached ??= import('./openings.generated.json')
    .then((module) => module.default as BookData)
    .catch(() => {
      cached = null
      return null
    })
  return cached
}

function openingAt(book: BookData, index: number | undefined): OpeningInfo | null {
  if (index === undefined || index < 0) return null
  const [eco, name] = book.names[index].split('|')
  return { eco, name }
}

export interface BookResult {
  /** bookMoves[i] é verdadeiro se o lance i ainda é de livro. */
  bookMoves: boolean[]
  /** A abertura mais profunda encontrada. */
  opening: OpeningInfo | null
}

/** Enquanto a posição estiver na base, o lance é de livro. Ao sair dela, não volta mais. */
export function findBookMoves(book: BookData | null, fensAfterEachMove: string[]): BookResult {
  const bookMoves = fensAfterEachMove.map(() => false)
  let opening: OpeningInfo | null = null
  if (!book) return { bookMoves, opening }
  for (let index = 0; index < fensAfterEachMove.length; index += 1) {
    const entry = book.positions[bookKey(fensAfterEachMove[index])]
    if (entry === undefined) break
    bookMoves[index] = true
    opening = openingAt(book, entry) ?? opening
  }
  return { bookMoves, opening }
}

export const formatOpening = (opening: OpeningInfo) => `${opening.eco} ${opening.name}`
