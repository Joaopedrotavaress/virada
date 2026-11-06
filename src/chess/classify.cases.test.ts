import { describe, expect, it } from 'vitest'
import { type GameAnalysis, ratingsOf } from './analyze'
import { classifyMoves, classifyPointsLost, greatGapFor, type PositionEval } from './classify'
import type { Color, Eval } from './evaluation'
import { expectedPoints, slopeFor, standingOf, toModelRating } from './expectedPoints'

const cp = (value: number): Eval => ({ kind: 'cp', cp: value })
const mate = (moves: number, winner: Color): Eval => ({ kind: 'mate', moves, winner })

type Position = PositionEval & { fen?: string }
const QUIET = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'
const pos = (value: Eval, bestUci: string | null = 'x', extra: Partial<Position> = {}): Position => ({ eval: value, bestUci, ...extra })

/** Um lance só das brancas: avaliação antes, avaliação depois. */
const one = (before: Eval, after: Eval, rating = 1500, extra: Partial<Position> = {}, uci = 'a') =>
  classifyMoves([{ uci, color: 'w' }], [pos(before, 'x', extra), pos(after, null)], [], { w: rating })[0]

describe('a tabela pública de pontos perdidos', () => {
  it.each([
    [0, 'excellent'],
    [0.0199, 'excellent'],
    [0.02, 'good'],
    [0.0499, 'good'],
    [0.05, 'inaccuracy'],
    [0.0999, 'inaccuracy'],
    [0.1, 'mistake'],
    [0.1999, 'mistake'],
    [0.2, 'blunder'],
    [1, 'blunder'],
  ])('%f de ponto perdido é %s', (lost, cls) => {
    expect(classifyPointsLost(lost)).toBe(cls)
  })
})

describe('a curva depende do rating', () => {
  it('sobe com o rating e fica perto da do Lichess nos fortes', () => {
    expect(slopeFor(800)).toBeLessThan(slopeFor(1500))
    expect(slopeFor(1500)).toBeLessThan(slopeFor(2300))
    expect(slopeFor(2500)).toBeGreaterThan(0.0032)
    expect(slopeFor(2500)).toBeLessThan(0.00368 + 0.0004)
  })

  it('a mesma vantagem vale mais para quem joga melhor', () => {
    expect(expectedPoints(cp(300), 'w', 2200)).toBeGreaterThan(expectedPoints(cp(300), 'w', 900))
  })

  it('é simétrica: o que um ganha, o outro perde', () => {
    expect(expectedPoints(cp(250), 'w', 1200) + expectedPoints(cp(250), 'b', 1200)).toBeCloseTo(1)
  })

  it('o mesmo lance pesa mais para o jogador forte', () => {
    expect(one(cp(0), cp(-300), 800).cls).toBe('mistake')
    expect(one(cp(0), cp(-300), 2200).cls).toBe('blunder')
  })

  it('o rating do Chess.com é levado para a escala do Lichess', () => {
    expect(toModelRating(1000, true)).toBe(1200)
    expect(toModelRating(2000, true)).toBe(2090)
    expect(toModelRating(1000, false)).toBe(1000)
  })

  it('lê o rating do PGN e trata o que falta', () => {
    expect(ratingsOf({ WhiteElo: '1500', BlackElo: '?' })).toEqual({ w: 1500, b: null })
    expect(ratingsOf({ Site: 'Chess.com', WhiteElo: '1000' }).w).toBe(1200)
  })

  it('os estados mudam com o rating', () => {
    expect(standingOf(expectedPoints(cp(250), 'w', 2200))).toBe('winning')
    expect(standingOf(expectedPoints(cp(250), 'w', 800))).toBe('equal')
    expect(standingOf(expectedPoints(cp(-350), 'w', 2200))).toBe('losing')
  })

  it('o "!" é mais generoso com quem tem rating baixo', () => {
    expect(greatGapFor(800)).toBeLessThan(greatGapFor(1500))
    expect(greatGapFor(1500)).toBeLessThan(greatGapFor(2400))
  })
})

describe('posição equilibrada', () => {
  it('o lance do motor é Melhor', () => {
    expect(classifyMoves([{ uci: 'x', color: 'w' }], [pos(cp(20)), pos(cp(15), null)])[0].cls).toBe('best')
  })

  it('outro lance que custa quase nada é Ótimo: Melhor é só o primeiro do motor', () => {
    expect(one(cp(20), cp(18)).cls).toBe('excellent')
  })

  it('perda pequena é Ótimo, depois Bom', () => {
    expect(one(cp(20), cp(0)).cls).toBe('excellent')
    expect(one(cp(20), cp(-20)).cls).toBe('good')
  })

  it('perda maior é Imprecisão, Erro e Erro grosseiro', () => {
    expect(one(cp(20), cp(-60)).cls).toBe('inaccuracy')
    expect(one(cp(20), cp(-150)).cls).toBe('mistake')
    expect(one(cp(20), cp(-500)).cls).toBe('blunder')
  })
})

describe('vantagem grande', () => {
  it('+28 para +24 não é erro: a partida segue ganha', () => {
    expect(one(cp(2800), cp(2400)).cls).toBe('excellent')
  })

  it('+9 para +8 custa pouco; +9 para +6 já é Imprecisão', () => {
    expect(one(cp(900), cp(800)).cls).toBe('good')
    expect(one(cp(900), cp(600)).cls).toBe('inaccuracy')
  })

  it('jogar fora a vitória é Erro grosseiro', () => {
    expect(one(cp(900), cp(0)).cls).toBe('blunder')
  })

  it('quem já perdeu tudo quase não tem ponto a perder', () => {
    expect(one(cp(-1200), cp(-1500)).cls).toBe('excellent')
  })
})

describe('mate', () => {
  it('manter o mate no ritmo certo é Melhor, mesmo sem ser o lance do motor', () => {
    expect(one(mate(4, 'w'), mate(3, 'w')).cls).toBe('best')
  })

  it('demorar um lance a mais é Ótimo; muitos, Imprecisão', () => {
    expect(one(mate(3, 'w'), mate(3, 'w')).cls).toBe('excellent')
    expect(one(mate(3, 'w'), mate(5, 'w')).cls).toBe('good')
    expect(one(mate(2, 'w'), mate(9, 'w')).cls).toBe('inaccuracy')
  })

  it('largar o mate ficando muito ganho custa pouco', () => {
    expect(['excellent', 'good']).toContain(one(mate(3, 'w'), cp(800)).cls)
  })

  it('largar o mate e ficar igual é Erro grosseiro', () => {
    expect(one(mate(3, 'w'), cp(0)).cls).toBe('blunder')
  })

  it('trocar o seu mate pelo do adversário é Erro grosseiro', () => {
    expect(one(mate(3, 'w'), mate(2, 'b')).cls).toBe('blunder')
  })

  it('permitir mate numa posição boa é Erro grosseiro', () => {
    expect(one(cp(100), mate(2, 'b')).cls).toBe('blunder')
  })

  it('numa posição já perdida, permitir mate curto ainda é Erro; longo, Imprecisão', () => {
    expect(one(cp(-1500), mate(2, 'b')).cls).toBe('mistake')
    expect(one(cp(-1500), mate(8, 'b')).cls).toBe('inaccuracy')
  })

  it('quem já vai levar mate e não encurta faz o Melhor', () => {
    expect(one(mate(3, 'b'), mate(2, 'b')).cls).toBe('best')
    expect(one(mate(5, 'b'), mate(2, 'b')).cls).toBe('good')
  })

  it('o lance que dá mate é Melhor', () => {
    expect(classifyMoves([{ uci: 'x', color: 'w' }], [pos(mate(1, 'w')), pos(mate(0, 'w'), null)])[0].cls).toBe('best')
  })
})

describe('Chance perdida', () => {
  const line = [
    { uci: 'a', color: 'w' as const },
    { uci: 'b', color: 'b' as const },
  ]

  it('o adversário erra, havia vitória e o lance deixa passar', () => {
    const [first, second] = classifyMoves(line, [pos(cp(0)), pos(cp(-500)), pos(cp(-20), null)])
    expect(first.cls).toBe('blunder')
    expect(second.cls).toBe('miss')
  })

  it('mesmo ficando um pouco melhor, sem posição ganha, é chance perdida', () => {
    expect(classifyMoves(line, [pos(cp(0)), pos(cp(-500)), pos(cp(-120), null)])[1].cls).toBe('miss')
  })

  it('não vale quando a posição continua ganha', () => {
    expect(classifyMoves(line, [pos(cp(0)), pos(cp(-900)), pos(cp(-500), null)])[1].cls).not.toBe('miss')
  })

  it('não vale sem erro do adversário: é erro comum', () => {
    expect(classifyMoves(line, [pos(cp(-480)), pos(cp(-500)), pos(cp(-20), null)])[1].cls).toBe('blunder')
  })

  it('não vale sem posição ganha na mesa', () => {
    expect(classifyMoves(line, [pos(cp(150)), pos(cp(-150)), pos(cp(200), null)])[1].cls).not.toBe('miss')
  })

  it('não vale quando o lance jogado foi o do motor', () => {
    const moves = [line[0], { uci: 'x', color: 'b' as const }]
    expect(classifyMoves(moves, [pos(cp(0)), pos(cp(-500)), pos(cp(-20), null)])[1].cls).toBe('best')
  })

  it('um lance de livro nunca abre chance perdida', () => {
    expect(classifyMoves(line, [pos(cp(0)), pos(cp(-500)), pos(cp(-20), null)], [true])[1].cls).not.toBe('miss')
  })
})

describe('o "!" (Excelente)', () => {
  const FEN = '6k1/5ppp/8/8/8/5N2/5PPP/6K1 w - - 0 1'
  const great = (before: Eval, after: Eval, second: Eval | undefined, rating = 1500, fen = FEN, uci = 'f3e5') =>
    classifyMoves([{ uci, color: 'w' }], [pos(before, uci, { fen, secondEval: second }), pos(after, null)], [], { w: rating })[0].cls

  it('de igual para ganho: só este lance leva à vitória', () => {
    expect(great(cp(450), cp(450), cp(40))).toBe('great')
  })

  it('de perdido para igual: só este lance salva', () => {
    expect(great(cp(0), cp(0), cp(-500))).toBe('great')
  })

  it('o único lance bom, mesmo sem mudar de estado', () => {
    expect(great(cp(150), cp(150), cp(-180))).toBe('great')
  })

  it('não vale se a alternativa era quase igual', () => {
    expect(great(cp(50), cp(50), cp(20))).toBe('best')
  })

  it('não vale com a partida ganha de qualquer jeito', () => {
    expect(great(cp(1500), cp(1500), cp(800))).toBe('best')
  })

  it('não vale numa posição que continua perdida', () => {
    expect(great(cp(-400), cp(-400), cp(-900))).toBe('best')
  })

  it('não vale sem a segunda linha, como nas análises antigas', () => {
    expect(great(cp(450), cp(450), undefined)).toBe('best')
  })

  it('não vale para capturar peça solta', () => {
    expect(great(cp(450), cp(450), cp(40), 1500, '6k1/5ppp/8/4n3/8/5N2/5PPP/6K1 w - - 0 1', 'f3e5')).toBe('best')
  })

  it('não vale para retomar a peça que acabou de chegar', () => {
    const fen = '6k1/5ppp/8/4n3/8/5N2/5PPP/6K1 w - - 0 1'
    const moves = [{ uci: 'c6e5', color: 'b' as const }, { uci: 'f3e5', color: 'w' as const }]
    const positions = [pos(cp(0), 'c6e5', { fen: '6k1/5ppp/2n5/8/8/5N2/5PPP/6K1 b - - 0 1' }), pos(cp(450), 'f3e5', { fen, secondEval: cp(40) }), pos(cp(450), null)]
    expect(classifyMoves(moves, positions)[1].cls).toBe('best')
  })

  it('não vale para trocar peça de mesmo valor', () => {
    expect(great(cp(450), cp(450), cp(40), 1500, '6k1/5ppp/6p1/4n3/8/5N2/5PPP/6K1 w - - 0 1'.replace('6p1', '3p2p1'), 'f3e5')).toBe('best')
  })

  it('num xeque perpétuo, só a primeira vez vale', () => {
    const fen = '6k1/5ppp/8/8/8/5N2/5PPP/6K1 w - - 0 1'
    const moves = [
      { uci: 'f3e5', color: 'w' as const },
      { uci: 'g8h8', color: 'b' as const },
      { uci: 'e5f3', color: 'w' as const },
      { uci: 'h8g8', color: 'b' as const },
      { uci: 'f3e5', color: 'w' as const },
    ]
    const at = (bestUci: string) => pos(cp(0), bestUci, { fen, secondEval: cp(-500) })
    const positions = [at('f3e5'), at('g8h8'), at('e5f3'), at('h8g8'), at('f3e5'), pos(cp(0), null)]
    const classes = classifyMoves(moves, positions).map((move) => move.cls)
    expect(classes[0]).toBe('great')
    expect(classes[4]).toBe('best')
  })

  it('não vale para o mate no lance', () => {
    expect(great(mate(1, 'w'), mate(0, 'w'), cp(0), 1500, '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', 'd1d8')).toBe('best')
  })

  it('não vale para o único lance legal', () => {
    expect(great(cp(0), cp(0), cp(-500), 1500, '7k/8/8/8/8/8/6P1/r6K w - - 0 1', 'h1h2')).toBe('best')
  })

  it('não vale para promover a dama', () => {
    expect(great(cp(800), cp(800), cp(100), 1500, '6k1/P4ppp/8/8/8/8/5PPP/6K1 w - - 0 1', 'a7a8q')).toBe('best')
  })

  it('com rating baixo, capturar a peça que decide conta; com rating alto, não', () => {
    const fen = '6k1/5ppp/8/4n3/8/5N2/5PPP/6K1 w - - 0 1'
    expect(great(cp(450), cp(450), cp(40), 700, fen, 'f3e5')).toBe('great')
    expect(great(cp(450), cp(450), cp(40), 1500, fen, 'f3e5')).toBe('best')
  })

  it('o limite muda com o rating: o mesmo lance vale para o iniciante e não para o forte', () => {
    expect(great(cp(150), cp(150), cp(-100), 900)).toBe('great')
    expect(great(cp(150), cp(150), cp(-100), 2400)).toBe('best')
  })
})

describe('sacrifícios', () => {
  const OPERA = '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16'
  const GREEK = 'r1bq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 0 8'
  const of = (fen: string, uci: string, before: Eval, after: Eval, second?: Eval, best = uci) =>
    classifyMoves([{ uci, color: 'w' }], [pos(before, best, { fen, secondEval: second }), pos(after, null)])[0].cls

  it('bom sacrifício, sendo o melhor lance, é Brilhante', () => {
    expect(of(GREEK, 'd3h7', cp(120), cp(120), cp(20))).toBe('brilliant')
  })

  it('Brilhante vence o "!" quando as duas regras valem', () => {
    expect(of(GREEK, 'd3h7', cp(450), cp(450), cp(40))).toBe('brilliant')
  })

  it('quase o melhor também vale', () => {
    expect(of(GREEK, 'd3h7', cp(120), cp(118), undefined, 'x')).toBe('brilliant')
  })

  it('sacrifício que piora a posição não é Brilhante', () => {
    expect(of(GREEK, 'd3h7', cp(20), cp(-300), undefined, 'x')).toBe('blunder')
  })

  it('sacrifício de quem está pior não é Brilhante', () => {
    expect(of(GREEK, 'd3h7', cp(-200), cp(-200), cp(-400))).not.toBe('brilliant')
  })

  it('sacrifício com vitória fácil de outro jeito não é Brilhante', () => {
    expect(of(GREEK, 'd3h7', cp(900), cp(900), cp(800))).toBe('best')
  })

  it('o mate da Ópera é Brilhante quando a alternativa não mata', () => {
    expect(of(OPERA, 'b3b8', mate(2, 'w'), mate(1, 'w'), cp(300))).toBe('brilliant')
  })

  it('não é Brilhante se outro lance também dá mate', () => {
    expect(of(OPERA, 'b3b8', mate(2, 'w'), mate(1, 'w'), mate(3, 'w'))).not.toBe('brilliant')
  })

  it('gambito de peão não é sacrifício de peça', () => {
    expect(of('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'f2f4', cp(20), cp(20), cp(10))).toBe('best')
  })
})

describe('perda de material', () => {
  it('entregar a dama numa posição igual é Erro grosseiro', () => {
    expect(one(cp(0), cp(-900)).cls).toBe('blunder')
  })

  it('perder um peão é Imprecisão para o jogador médio e Erro para o forte', () => {
    expect(one(cp(30), cp(-90), 1500).cls).toBe('inaccuracy')
    expect(one(cp(30), cp(-90), 2300).cls).toBe('mistake')
  })
})

describe('lances forçados', () => {
  it('com um lance legal só, é Melhor e não pesa na precisão', () => {
    const [move] = classifyMoves([{ uci: 'h1h2', color: 'w' }], [pos(cp(-300), 'x', { fen: '7k/8/8/8/8/8/6P1/r6K w - - 0 1' }), pos(cp(-900), null)])
    expect(move.cls).toBe('best')
    expect(move.loss).toBe(0)
    expect(move.accuracy).toBe(100)
  })

  it('com várias opções, segue a regra normal', () => {
    const [move] = classifyMoves([{ uci: 'a', color: 'w' }], [pos(cp(0), 'x', { fen: QUIET }), pos(cp(-900), null)])
    expect(move.cls).toBe('blunder')
  })
})

describe('abertura', () => {
  it('teoria não se julga, mesmo que a avaliação caia', () => {
    const [move] = classifyMoves([{ uci: 'a', color: 'w' }], [pos(cp(30)), pos(cp(-80), null)], [true])
    expect(move.cls).toBe('book')
    expect(move.accuracy).toBe(100)
  })

  it('fora da teoria, volta a julgar', () => {
    expect(classifyMoves([{ uci: 'a', color: 'w' }], [pos(cp(30)), pos(cp(-80), null)], [false])[0].cls).not.toBe('book')
  })
})

describe('final', () => {
  it('largar o empate num final é Erro grosseiro, e a vitória também', () => {
    expect(one(cp(0), cp(-700)).cls).toBe('blunder')
    expect(one(cp(700), cp(0)).cls).toBe('blunder')
  })

  it('num final de base de finais (±10000 ou mate), o que vale é o resultado', () => {
    expect(one(cp(9000), mate(20, 'w')).cls).toBe('excellent')
  })
})

describe('tipos', () => {
  it('a análise guarda versão e rating', () => {
    const fields: (keyof GameAnalysis)[] = ['classVersion', 'ratings']
    expect(fields).toHaveLength(2)
  })
})
