import { describe, expect, it } from 'vitest'
import { parseRoute } from './route'

describe('endereços do app', () => {
  it('reconhece cada tela', () => {
    expect(parseRoute('')).toEqual({ name: 'home' })
    expect(parseRoute('#/')).toEqual({ name: 'home' })
    expect(parseRoute('#/partidas')).toEqual({ name: 'games' })
    expect(parseRoute('#/partida/abc-12')).toEqual({ name: 'game', key: 'abc-12' })
    expect(parseRoute('#/jogar')).toEqual({ name: 'bot-setup' })
    expect(parseRoute('#/jogo')).toEqual({ name: 'bot-game' })
    expect(parseRoute('#/treino')).toEqual({ name: 'training' })
    expect(parseRoute('#/treino/sessao')).toEqual({ name: 'session', theme: undefined })
    expect(parseRoute('#/treino/sessao/fork')).toEqual({ name: 'session', theme: 'fork' })
    expect(parseRoute('#/puzzles')).toEqual({ name: 'puzzles', theme: undefined })
    expect(parseRoute('#/puzzles/fork')).toEqual({ name: 'puzzles', theme: 'fork' })
    expect(parseRoute('#/guia/abertura/italiana')).toEqual({ name: 'opening', slug: 'italiana' })
    expect(parseRoute('#/guia/praticar/italiana/2')).toEqual({ name: 'practice', slug: 'italiana', line: 2 })
    expect(parseRoute('#/guia/licao/garfo')).toEqual({ name: 'lesson', id: 'garfo' })
  })

  it('endereço desconhecido ou incompleto cai numa tela válida', () => {
    expect(parseRoute('#/nao-existe')).toEqual({ name: 'home' })
    expect(parseRoute('#/partida')).toEqual({ name: 'games' })
    expect(parseRoute('#/guia/abertura')).toEqual({ name: 'guide' })
    expect(parseRoute('#/guia/praticar/italiana/x')).toEqual({ name: 'practice', slug: 'italiana', line: 0 })
  })

  it('a chave da partida pode ter caracteres especiais', () => {
    expect(parseRoute(`#/partida/${encodeURIComponent('a/b c')}`)).toEqual({ name: 'game', key: 'a/b c' })
  })
})
