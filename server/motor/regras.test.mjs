import { describe, expect, it } from 'vitest'
import { chaveDe, criarCota, fenValida, lerInfo, lerPedido, origemPermitida } from './regras.mjs'

const INICIO = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('o que o motor aceita', () => {
  it('aceita posições normais', () => {
    expect(fenValida(INICIO)).toBe(true)
    expect(fenValida('8/8/3k4/1p5p/1P5P/N5P1/8/4K3 b - - 3 49')).toBe(true)
    expect(fenValida('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2')).toBe(true)
  })

  it('recusa quem tenta mandar outro comando', () => {
    expect(fenValida(`${INICIO}\nquit`)).toBe(false)
    expect(fenValida(`${INICIO} ; quit`)).toBe(false)
    expect(fenValida('setoption name Threads value 64')).toBe(false)
  })

  it('recusa tabuleiro impossível, que derrubaria o motor', () => {
    expect(fenValida('8/8/8/8/8/8/8/8 w - - 0 1')).toBe(false)
    expect(fenValida('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQ1BNR w - - 0 1')).toBe(false)
    expect(fenValida('Pnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1')).toBe(false)
    expect(fenValida('rnbqkbnr/ppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1')).toBe(false)
    expect(fenValida(null)).toBe(false)
  })

  it('confere profundidade, linhas e quantidade', () => {
    expect(lerPedido({ fens: [INICIO], profundidade: 18, linhas: 2 })).toEqual({ fens: [INICIO], profundidade: 18, linhas: 2 })
    expect(lerPedido({ fens: [INICIO], profundidade: 99 }).erro).toBeTruthy()
    expect(lerPedido({ fens: [INICIO], profundidade: 18, linhas: 50 }).erro).toBeTruthy()
    expect(lerPedido({ fens: [], profundidade: 18 }).erro).toBeTruthy()
    expect(lerPedido({ fens: Array(401).fill(INICIO), profundidade: 18 }).erro).toBeTruthy()
    expect(lerPedido(null).erro).toBeTruthy()
  })

  it('só atende o site e o computador de quem desenvolve', () => {
    expect(origemPermitida('https://virada-kappa.vercel.app')).toBe(true)
    expect(origemPermitida('http://localhost:5173')).toBe(true)
    expect(origemPermitida('https://virada-kappa.vercel.app.golpe.com')).toBe(false)
    expect(origemPermitida('https://exemplo.com')).toBe(false)
    expect(origemPermitida(undefined)).toBe(false)
  })

  it('a mesma posição em lances diferentes usa a mesma busca, menos perto dos 50 lances', () => {
    const fen = (meio, inteiro) => `4k3/8/8/8/8/8/4P3/4K3 w - - ${meio} ${inteiro}`
    expect(chaveDe(fen(0, 10), 18, 2)).toBe(chaveDe(fen(5, 40), 18, 2))
    expect(chaveDe(fen(40, 90), 18, 2)).not.toBe(chaveDe(fen(0, 90), 18, 2))
    expect(chaveDe(fen(0, 10), 18, 2)).not.toBe(chaveDe(fen(0, 10), 20, 2))
  })

  it('lê a saída do Stockfish', () => {
    expect(lerInfo('info depth 18 seldepth 25 multipv 2 score cp -31 nodes 100 nps 10 time 5 pv e2e4 e7e5')).toEqual({ linha: 2, depth: 18, score: { type: 'cp', value: -31 }, pv: ['e2e4', 'e7e5'] })
    expect(lerInfo('info depth 18 multipv 1 score mate 3 pv a1a8')?.score).toEqual({ type: 'mate', value: 3 })
    expect(lerInfo('info depth 18 multipv 1 score cp 10 lowerbound pv a1a8')).toBeNull()
    expect(lerInfo('info string NNUE evaluation')).toBeNull()
  })

  it('a cota por endereço segura o excesso e renova com o tempo', () => {
    let agora = 0
    const cota = criarCota({ janelaMs: 1000, posicoes: 100, agora: () => agora })
    expect(cota.pode('a', 60)).toBe(true)
    expect(cota.pode('a', 60)).toBe(false)
    expect(cota.pode('b', 60)).toBe(true)
    agora = 2000
    expect(cota.pode('a', 60)).toBe(true)
  })
})
