import { describe, expect, it } from 'vitest'
import { findBookMoves, formatOpening, loadBook } from './book'
import { classifyMoves, summarize } from './classify'
import { parsePgn } from './pgn'
import { SAMPLE_PGN } from './sample'

const fensOf = (pgn: string) => parsePgn(pgn).positions.slice(1).map((position) => position.fen)

describe('base de aberturas', async () => {
  const book = await loadBook()

  it('foi gerada com o tamanho esperado', () => {
    expect(book).not.toBeNull()
    expect(Object.keys(book!.positions).length).toBeGreaterThan(3000)
  })

  it.each([
    ['1. e4 e5 2. Nf3 Nc6 3. Bc4', 'C50', 'Abertura Italiana'],
    ['1. e4 c5', 'B20', 'Defesa Siciliana'],
    ['1. e4 e6', 'C00', 'Defesa Francesa'],
    ['1. e4 c6', 'B10', 'Defesa Caro-Kann'],
    ['1. d4 d5 2. c4', 'D06', 'Gambito da Dama'],
    ['1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6', 'E70', 'Defesa Índia do Rei'],
    ['1. c4', 'A10', 'Abertura Inglesa'],
    ['1. e4 e5 2. Nf3 Nc6 3. Bb5', 'C60', 'Ruy Lopez'],
  ])('%s é %s %s', (pgn, eco, name) => {
    const { opening, bookMoves } = findBookMoves(book, fensOf(pgn))
    expect(opening?.eco).toBe(eco)
    expect(opening?.name).toContain(name)
    expect(bookMoves.every(Boolean)).toBe(true)
  })

  it('formata como no exemplo', () => {
    expect(formatOpening(findBookMoves(book, fensOf('1. e4 e5 2. Nf3 Nc6 3. Bc4')).opening!)).toBe('C50 Abertura Italiana')
  })

  it('reconhece transposição: outra ordem, mesma abertura', () => {
    const a = findBookMoves(book, fensOf('1. e4 e5 2. Nf3 Nc6 3. Bc4'))
    const b = findBookMoves(book, fensOf('1. e4 e5 2. Bc4 Nc6 3. Nf3'))
    expect(b.bookMoves.every(Boolean)).toBe(true)
    expect(b.opening).toEqual(a.opening)
  })

  it('ao sair do livro não volta mais, mesmo que a posição reapareça', () => {
    const { bookMoves } = findBookMoves(book, fensOf('1. a3 h5 2. Nf3 Nf6 3. Ng1 Ng8'))
    expect(bookMoves.slice(0, 1)).toEqual([true])
    expect(bookMoves[bookMoves.length - 1]).toBe(false)
  })

  it('lance estranho já no início fica fora do livro', () => {
    const { bookMoves } = findBookMoves(book, fensOf('1. e4 e5 2. Qh5 Ke7 3. Qxe5+'))
    expect(bookMoves[0]).toBe(true)
    expect(bookMoves[bookMoves.length - 1]).toBe(false)
  })

  it('partida a partir de um FEN não está no livro', () => {
    expect(findBookMoves(book, fensOf('[FEN "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1"]\n\n1. Rd8#')).bookMoves).toEqual([false])
  })

  it('sem a base, nada é marcado', () => {
    expect(findBookMoves(null, fensOf('1. e4 e5'))).toEqual({ bookMoves: [false, false], opening: null })
  })

  it('a partida de teste começa no livro e sai antes do fim', () => {
    const { bookMoves, opening } = findBookMoves(book, fensOf(SAMPLE_PGN))
    expect(bookMoves[0]).toBe(true)
    expect(bookMoves[bookMoves.length - 1]).toBe(false)
    expect(opening?.name).toContain('Filidor')
  })
})

describe('lances de livro na classificação', () => {
  const position = (cp: number, bestUci: string | null = 'x') => ({ eval: { kind: 'cp' as const, cp }, bestUci })

  it('não contam para precisão nem para erros', () => {
    const moves = [
      { uci: 'a', color: 'w' as const },
      { uci: 'b', color: 'b' as const },
      { uci: 'c', color: 'w' as const },
    ]
    // O primeiro lance perde muito, mas é teoria (um gambito, por exemplo).
    const classified = classifyMoves(moves, [position(0), position(500), position(500), position(-700, null)], [true, true, false])
    expect(classified[0].cls).toBe('book')
    expect(classified[0].loss).toBe(0)
    expect(classified[1].cls).toBe('book')
    expect(classified[2].cls).not.toBe('book')

    const summary = summarize(classified.map((move, index) => ({ ...move, color: moves[index].color })))
    expect(summary.w.counts.book).toBe(1)
    expect(summary.w.counts.blunder).toBe(1)
    expect(summary.w.accuracy).toBeCloseTo(classified[2].accuracy)
    // As pretas só jogaram lances de livro: não há o que medir.
    expect(summary.b.accuracy).toBeNull()
  })

  it('um lance de livro nunca gera "chance perdida" no seguinte', () => {
    const moves = [
      { uci: 'a', color: 'w' as const },
      { uci: 'b', color: 'b' as const },
    ]
    const classified = classifyMoves(moves, [position(0), position(-500), position(500, null)], [true, false])
    expect(classified[1].cls).toBe('blunder')
  })
})
