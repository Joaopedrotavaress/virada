import { describe, expect, it } from 'vitest'
import { formatLinePt, pvToSan, sanToPt, uciToSan } from './notation'
import { PgnError, formatDate, formatTimeControl, parsePgn, tokenizeMoves } from './pgn'
import { SAMPLE_PGN } from './sample'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const CHESS_COM = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.03.15"]
[White "joao"]
[Black "Rival"]
[Result "0-1"]
[TimeControl "180+2"]
[Termination "Rival venceu por xeque-mate"]

1. f3 {[%clk 0:02:59.9]} 1... e5 {[%clk 0:02:58]} 2. g4?? {[%clk 0:02:58.3]} $4 2... Qh4# {[%clk 0:02:57]} 0-1
`

describe('tokenizeMoves', () => {
  it('limpa relógio, números "1...", NAGs e anotações', () => {
    expect(tokenizeMoves('1. f3 {[%clk 0:02:59.9]} 1... e5 {x} 2. g4?? $4 2... Qh4# 0-1')).toEqual(['f3', 'e5', 'g4', 'Qh4#'])
  })

  it('remove variações aninhadas, mesmo com parênteses em comentários', () => {
    expect(tokenizeMoves('1. e4 (1. d4 d5 (1... Nf6 {tem ) aqui} 2. c4) 2. c4) e5 {fim (ok} 2. Nf3 *')).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('aceita lances sem espaço após o número e roque com zeros', () => {
    expect(tokenizeMoves('1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.0-0 Nf6 5.d3 0-0 1-0')).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd3', 'O-O'])
  })

  it('aceita "1. ... e5", com espaço, e reticências', () => {
    expect(tokenizeMoves('1. e4 1. ... e5 2. Nf3 2… Nc6 *')).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])
    expect(tokenizeMoves('1. ... e5 2. Nf3 *')).toEqual(['e5', 'Nf3'])
  })

  it('não confunde o resultado 0-1 com roque', () => {
    expect(tokenizeMoves('1. e4 e5 0-1')).toEqual(['e4', 'e5'])
  })

  it('para no primeiro resultado (PGN com várias partidas)', () => {
    expect(tokenizeMoves('1. e4 1-0\n\n[Event "b"]\n\n1. d4 0-1')).toEqual(['e4'])
  })
})

describe('parsePgn', () => {
  it('lê o formato do chess.com com cabeçalhos', () => {
    const game = parsePgn(CHESS_COM)
    expect(game.white).toBe('joao')
    expect(game.black).toBe('Rival')
    expect(game.result).toBe('0-1')
    expect(game.date).toBe('2024.03.15')
    expect(game.timeControl).toBe('180+2')
    expect(game.moves.map((move) => move.san)).toEqual(['f3', 'e5', 'g4', 'Qh4#'])
    expect(game.moves[3].uci).toBe('d8h4')
    expect(game.positions).toHaveLength(5)
    expect(game.positions[4].terminal).toBe('checkmate')
    expect(game.positions[3].terminal).toBeNull()
  })

  it('lê a partida de teste inteira, com roque grande e mate', () => {
    const game = parsePgn(SAMPLE_PGN)
    expect(game.moves).toHaveLength(33)
    const castle = game.moves.find((move) => move.san === 'O-O-O')
    expect(castle?.uci).toBe('e1c1')
    expect(castle?.moveNumber).toBe(12)
    expect(game.moves[32].san).toBe('Rd8#')
    expect(game.positions[33].terminal).toBe('checkmate')
  })

  it('lê PGN só com lances, sem cabeçalhos', () => {
    const game = parsePgn('1. e4 e5 2. Nf3 d6')
    expect(game.white).toBe('Brancas')
    expect(game.moves).toHaveLength(4)
  })

  it('aceita CRLF e cabeçalhos numa linha só', () => {
    const game = parsePgn('[White "A"] [Black "B"]\r\n\r\n1. e4\r\n1... e5\r\n*')
    expect(game.white).toBe('A')
    expect(game.black).toBe('B')
    expect(game.moves).toHaveLength(2)
  })

  it('aceita aspas no nome, escapadas ou não', () => {
    expect(parsePgn('[White "Fulano \\"o Rei\\" Silva"]\n\n1. e4 *').white).toBe('Fulano "o Rei" Silva')
    const game = parsePgn('[White "Fulano "o Rei" Silva"]\n[Black "B"]\n\n1. e4 *')
    expect(game.white).toBe('Fulano "o Rei" Silva')
    expect(game.black).toBe('B')
    expect(game.moves).toHaveLength(1)
  })

  it('nome desconhecido no PGN vira a cor', () => {
    const game = parsePgn('[White "?"]\n[Black "-"]\n\n1. e4 *')
    expect(game.white).toBe('Brancas')
    expect(game.black).toBe('Pretas')
  })

  it('aplica o FEN inicial do cabeçalho e numera a partir dele', () => {
    const game = parsePgn('[FEN "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 30"]\n\n30. Rd8# 1-0')
    expect(game.moves[0].moveNumber).toBe(30)
    expect(game.positions[1].terminal).toBe('checkmate')
  })

  it('detecta afogamento', () => {
    const game = parsePgn('[FEN "7k/5Q2/6K1/8/8/8/8/8 w - - 0 1"]\n\n1. Qf6 1/2-1/2')
    expect(game.positions[1].terminal).toBeNull()
    const stalemate = parsePgn('[FEN "k7/8/1K6/8/8/8/8/2Q5 w - - 0 1"]\n\n1. Qc7 1/2-1/2')
    expect(stalemate.positions[1].terminal).toBe('stalemate')
  })

  it('só marca repetição como empate na última posição', () => {
    const shuffle = '1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8'
    const game = parsePgn(shuffle)
    expect(game.positions[8].terminal).toBe('draw')
    const continued = parsePgn(`${shuffle} 5. e4`)
    expect(continued.positions[8].terminal).toBeNull()
  })

  it('informa qual lance falhou', () => {
    expect(() => parsePgn('1. e4 e5 2. Nf3 Qh1')).toThrow(/2\.\.\. Qh1 \(pretas\)/)
    expect(() => parsePgn('1. e4 e5 2. Ke3 Nf6 3. Kz9')).toThrow(/2\. Ke3 \(brancas\)/)
    expect(() => parsePgn('1. Nf6')).toThrow(/primeiro lance/)
  })

  it('recusa lance nulo, texto vazio, texto sem lances e FEN inválido', () => {
    expect(() => parsePgn('1. e4 -- 2. d4')).toThrow(PgnError)
    expect(() => parsePgn('   ')).toThrow(/Cole o PGN/)
    expect(() => parsePgn('[White "A"]\n\n*')).toThrow(/nenhum lance/)
    expect(() => parsePgn('[FEN "isto não é fen"]\n\n1. e4')).toThrow(/FEN/)
  })
})

describe('formatações', () => {
  it('data', () => {
    expect(formatDate('2024.03.15')).toBe('15/03/2024')
    expect(formatDate('1858.??.??')).toBe('1858')
    expect(formatDate('????.??.??')).toBe('')
  })

  it('controle de tempo', () => {
    expect(formatTimeControl('600')).toBe('10 min')
    expect(formatTimeControl('180+2')).toBe('3 min + 2 s')
    expect(formatTimeControl('30')).toBe('30 s')
    expect(formatTimeControl('10+0.1')).toBe('10 s + 0,1 s')
    expect(formatTimeControl('1/86400')).toBe('1 dia por lance')
    expect(formatTimeControl('-')).toBe('')
  })
})

describe('notação', () => {
  it('traduz as peças para o português sem encadear trocas', () => {
    expect(sanToPt('Nf3')).toBe('Cf3')
    expect(sanToPt('Qxd5+')).toBe('Dxd5+')
    expect(sanToPt('Rd8#')).toBe('Td8#')
    expect(sanToPt('Ke2')).toBe('Re2')
    expect(sanToPt('Bb5')).toBe('Bb5')
    expect(sanToPt('bxa8=Q+')).toBe('bxa8=D+')
    expect(sanToPt('O-O-O')).toBe('O-O-O')
    expect(sanToPt('Nbd7')).toBe('Cbd7')
  })

  it('converte UCI para SAN, inclusive roque e promoção', () => {
    expect(uciToSan(START, 'g1f3')).toBe('Nf3')
    expect(uciToSan('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1c1')).toBe('O-O-O')
    expect(uciToSan('8/P6k/8/8/8/8/8/K7 w - - 0 1', 'a7a8q')).toBe('a8=Q')
    expect(uciToSan(START, 'e2e5')).toBeNull()
    expect(uciToSan(START, null)).toBeNull()
  })

  it('converte a linha e para em lance que não encaixa', () => {
    expect(pvToSan(START, ['e2e4', 'e7e5', 'g1f3'])).toEqual(['e4', 'e5', 'Nf3'])
    expect(pvToSan(START, ['e2e4', 'e2e4', 'g1f3'])).toEqual(['e4'])
    expect(pvToSan(START, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'g8f6'])).toHaveLength(6)
  })

  it('numera a linha conforme quem joga', () => {
    expect(formatLinePt(START, ['e4', 'e5', 'Nf3'])).toBe('1. e4 e5 2. Cf3')
    expect(formatLinePt('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', ['e5', 'Nf3'])).toBe('1... e5 2. Cf3')
  })
})
