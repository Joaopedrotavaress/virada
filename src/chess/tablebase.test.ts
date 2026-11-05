import { describe, expect, it } from 'vitest'
import { describeTablebase, inTablebase, pieceCount, queryTablebase } from './tablebase'

const ENDGAME = '8/8/8/8/8/5k2/8/4K2R w - - 0 1'
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const respond = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch

describe('banco de finais', () => {
  it('conta as peças e só consulta com até 7', () => {
    expect(pieceCount(ENDGAME)).toBe(3)
    expect(pieceCount(START)).toBe(32)
    expect(inTablebase(ENDGAME)).toBe(true)
    expect(inTablebase(START)).toBe(false)
  })

  it('não pergunta nada fora da base', async () => {
    let called = false
    const fake = (async () => {
      called = true
      return { ok: true, json: async () => ({}) }
    }) as unknown as typeof fetch
    expect(await queryTablebase(START, { fetch: fake })).toBeNull()
    expect(called).toBe(false)
  })

  it('sem internet, responde vazio sem erro', async () => {
    expect(await queryTablebase('8/8/8/8/8/5k2/8/4K2Q w - - 0 1', { isOnline: () => false })).toBeNull()
  })

  it('falha de rede ou resposta ruim não quebra nada', async () => {
    const fail = (async () => {
      throw new Error('rede')
    }) as unknown as typeof fetch
    expect(await queryTablebase('8/8/8/8/8/4k3/8/4K2Q w - - 0 1', { fetch: fail })).toBeNull()
    expect(await queryTablebase('8/8/8/8/8/4k3/8/4K2Q b - - 0 1', { fetch: respond({}, false) })).toBeNull()
    expect(await queryTablebase('8/8/8/8/3k4/8/8/4K2Q w - - 0 1', { fetch: respond({ category: 'unknown' }) })).toBeNull()
  })

  it('lê a resposta e guarda para não perguntar de novo', async () => {
    let calls = 0
    const fake = (async () => {
      calls += 1
      return { ok: true, json: async () => ({ category: 'win', dtm: 21, moves: [{ san: 'Rh3+' }] }) }
    }) as unknown as typeof fetch
    const answer = await queryTablebase(ENDGAME, { fetch: fake })
    expect(answer).toEqual({ category: 'win', bestSan: 'Rh3+', dtm: 21 })
    await queryTablebase(ENDGAME, { fetch: fake })
    expect(calls).toBe(1)
  })

  it('diz quem ganha, do ponto de vista certo, em português', () => {
    expect(describeTablebase({ category: 'win', bestSan: 'Rh3+', dtm: 21 }, ENDGAME)).toBe('Pelo banco de finais, as brancas ganham. Mate em 11. Melhor lance: Th3+.')
    expect(describeTablebase({ category: 'loss', bestSan: 'Ke1', dtm: -20 }, ENDGAME)).toBe('Pelo banco de finais, as pretas ganham. Mate em 10. Melhor lance: Re1.')
    expect(describeTablebase({ category: 'draw', bestSan: null, dtm: null }, ENDGAME)).toBe('Pelo banco de finais, é empate com o melhor jogo.')
    expect(describeTablebase({ category: 'cursed-win', bestSan: null, dtm: null }, ENDGAME)).toBe('Pelo banco de finais, é empate pela regra dos 50 lances.')
    expect(describeTablebase({ category: 'win', bestSan: null, dtm: null }, ENDGAME.replace(' w ', ' b '))).toBe('Pelo banco de finais, as pretas ganham.')
  })
})
