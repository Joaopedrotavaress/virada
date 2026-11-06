import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { uciParts } from './notation'
import { FAMOUS_MOMENTS, momentLine, pickMoment } from './famous'

describe('jogadas famosas', () => {
  it('tem umas 120 jogadas, de partidas diferentes', () => {
    expect(FAMOUS_MOMENTS.length).toBeGreaterThanOrEqual(110)
    const keys = FAMOUS_MOMENTS.map((moment) => moment.fen + moment.moves.join(' '))
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(FAMOUS_MOMENTS.map((moment) => moment.note)).size).toBeGreaterThan(FAMOUS_MOMENTS.length - 8)
  })

  it('cada jogada tem 3 lances legais a partir da posição', () => {
    for (const moment of FAMOUS_MOMENTS) {
      expect(moment.moves.length, moment.note).toBe(3)
      const chess = new Chess(moment.fen)
      for (const uci of moment.moves) expect(() => chess.move(uciParts(uci)), `${moment.note}: ${uci}`).not.toThrow()
    }
  })

  it('a casa amarela é o destino do lance destacado', () => {
    for (const moment of FAMOUS_MOMENTS) {
      expect(moment.focusAt, moment.note).toBeGreaterThanOrEqual(0)
      expect(moment.moves[moment.focusAt].slice(2, 4), moment.note).toBe(moment.focus)
    }
  })

  it('o número da placa é o lance de verdade da partida', () => {
    for (const moment of FAMOUS_MOMENTS) {
      const start = Number(moment.fen.split(' ')[5])
      const whiteToMove = moment.fen.split(' ')[1] === 'w'
      const plies = moment.focusAt + (whiteToMove ? 0 : 1)
      expect(moment.number, moment.note).toBe(start + Math.floor(plies / 2))
    }
  })

  it('o título entrega uma peça só quando o lance entrega mesmo, e não cita a virada', () => {
    for (const moment of FAMOUS_MOMENTS) {
      expect(moment.title, moment.note).toMatch(/^(Entregou (a dama|a torre|o bispo|o cavalo) e (deu mate|venceu).|Deu mate.|O erro saiu caro.|O rei marchou e venceu.)$/)
      expect(moment.title).not.toMatch(/virou|virada/i)
    }
  })

  it('traz os clássicos, nos lances certos', () => {
    const opera = FAMOUS_MOMENTS.find((moment) => moment.note.startsWith('A Partida da Ópera'))
    expect(opera).toMatchObject({ number: 16, focus: 'b8', title: 'Entregou a dama e deu mate.', orientation: 'white' })
    expect(FAMOUS_MOMENTS.find((moment) => moment.note.startsWith('O Jogo do Século'))).toMatchObject({ number: 17, focus: 'e6', orientation: 'black', title: 'Entregou a dama e venceu.' })
    expect(FAMOUS_MOMENTS.find((moment) => moment.note.startsWith('A Imortal de Kasparov'))).toMatchObject({ number: 24, focus: 'd4', orientation: 'white' })
    expect(FAMOUS_MOMENTS.some((moment) => moment.note.startsWith('A Imortal: Anderssen x Kieseritzky'))).toBe(true)
  })

  it('o sorteio cobre a lista e não repete a que está na tela', () => {
    expect(pickMoment(null, () => 0)).toBe(0)
    expect(pickMoment(null, () => 0.999)).toBe(FAMOUS_MOMENTS.length - 1)
    expect(pickMoment(0, () => 0)).toBe(1)
    expect(pickMoment(FAMOUS_MOMENTS.length - 1, () => 0.999)).toBe(0)
  })

  it('o professor tem uma frase para qualquer jogada', () => {
    for (let index = 0; index < FAMOUS_MOMENTS.length; index += 1) expect(momentLine(index)).toContain('chefia')
  })
})
