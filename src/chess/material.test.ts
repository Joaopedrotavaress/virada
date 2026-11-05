import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { materialState } from './material'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function play(moves: string, from = START) {
  const chess = new Chess(from)
  for (const move of moves.split(' ')) chess.move(move)
  return chess.fen()
}

describe('peças capturadas e placar', () => {
  it('no início ninguém capturou nada', () => {
    expect(materialState(START, START)).toEqual({ captured: { w: [], b: [] }, advantage: { w: 0, b: 0 } })
  })

  it('mostra o que cada lado tomou e quem está à frente', () => {
    const state = materialState(play('e4 d5 exd5'), START)
    expect(state.captured.w).toEqual(['p'])
    expect(state.captured.b).toEqual([])
    expect(state.advantage).toEqual({ w: 1, b: 0 })
  })

  it('troca igual zera o placar, mas as peças continuam na lista', () => {
    const state = materialState(play('e4 d5 exd5 Qxd5'), START)
    expect(state.captured.w).toEqual(['p'])
    expect(state.captured.b).toEqual(['p'])
    expect(state.advantage).toEqual({ w: 0, b: 0 })
  })

  it('funciona para as pretas e soma pelo valor das peças', () => {
    const state = materialState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RN2KB1R w KQkq - 0 1', START)
    expect(state.captured.b).toEqual(['n', 'b', 'q'])
    expect(state.advantage).toEqual({ w: 0, b: 15 })
  })

  it('ordena da menos para a mais valiosa', () => {
    const state = materialState('4k3/8/8/8/8/8/8/4K3 w - - 0 1', START)
    expect(state.captured.w).toEqual(['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'n', 'n', 'b', 'b', 'r', 'r', 'q'])
  })

  it('peão promovido não conta como capturado, mas a dama nova conta no placar', () => {
    const start = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1'
    const state = materialState(play('a8=Q+', start), start)
    expect(state.captured.b).toEqual([])
    expect(state.captured.w).toEqual([])
    expect(state.advantage).toEqual({ w: 9, b: 0 })
  })

  it('peça tomada depois de promover aparece como peça comum do outro lado', () => {
    const start = 'r3k3/P7/8/8/8/8/8/4K3 w - - 0 1'
    // O peão branco promoveu, tomou a torre e a dama nova foi capturada: sobraram só os reis.
    const taken = materialState('4k3/8/8/8/8/8/8/4K3 w - - 0 1', start)
    expect(taken.captured.w).toEqual(['r'])
    expect(taken.captured.b).toEqual(['p'])
    expect(taken.advantage).toEqual({ w: 0, b: 0 })
  })

  it('em partida a partir de uma posição, compara com o início dela, não com o padrão', () => {
    const start = '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1'
    expect(materialState(start, start).captured).toEqual({ w: [], b: [] })
    expect(materialState(play('exd5', start), start).captured.w).toEqual(['p'])
  })
})
