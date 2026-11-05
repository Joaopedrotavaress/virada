import { describe, expect, it } from 'vitest'
import type { GameRecord } from '../data/library'
import { guideBySlug } from './openings'
import { movesOfPgn, progressOf, recordLineDone, toggleRepertoire, usageByGuide, usageSentence } from './repertoire'

const record = (pgn: string, patch: Partial<GameRecord> = {}): GameRecord => ({
  key: pgn,
  pgn,
  white: 'a',
  black: 'b',
  result: '1-0',
  date: '',
  timeControl: '',
  playedAt: 0,
  source: 'pgn',
  userColor: 'w',
  outcome: 'win',
  tags: [],
  note: '',
  createdAt: 0,
  updatedAt: 0,
  ...patch,
})

const ITALIAN = '[White "a"]\n[Black "b"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O 1-0'
const CARO = '[White "a"]\n\n1. e4 c6 2. d4 d5 1-0'

describe('repertório', () => {
  it('adiciona e tira uma abertura', () => {
    const added = toggleRepertoire({}, 'italiana', 5)
    expect(added.italiana).toEqual({ slug: 'italiana', addedAt: 5, linesDone: {} })
    expect(toggleRepertoire(added, 'italiana')).toEqual({})
  })

  it('progresso conta as linhas diferentes já praticadas', () => {
    const guide = guideBySlug('italiana')!
    expect(progressOf(undefined, guide)).toBe(0)
    let repertoire = toggleRepertoire({}, 'italiana', 0)
    repertoire = recordLineDone(repertoire, 'italiana', 0)
    repertoire = recordLineDone(repertoire, 'italiana', 0)
    expect(repertoire.italiana.linesDone[0]).toBe(2)
    expect(progressOf(repertoire.italiana, guide)).toBe(0.5)
    repertoire = recordLineDone(repertoire, 'italiana', 1)
    expect(progressOf(repertoire.italiana, guide)).toBe(1)
  })

  it('praticar sem ter adicionado também fica registrado', () => {
    expect(recordLineDone({}, 'petrov', 0, 9).petrov).toEqual({ slug: 'petrov', addedAt: 9, linesDone: { 0: 1 } })
  })

  it('lê os lances do PGN', () => {
    expect(movesOfPgn(ITALIAN).slice(0, 5)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])
  })

  it('reúne partidas por abertura e cor, com o aproveitamento', () => {
    const usage = usageByGuide([record(ITALIAN), record(ITALIAN, { key: 'x', outcome: 'loss' }), record(ITALIAN, { key: 'y', userColor: 'b', outcome: 'win' }), record(CARO, { key: 'z' }), record(CARO, { key: 'w', userColor: null })])
    expect(usage[0]).toMatchObject({ color: 'w' })
    expect(usage[0].guide.slug).toBe('italiana')
    expect(usage[0].totals.games).toBe(2)
    expect(usage[0].totals.score).toBe(50)
    expect(usage.map((item) => item.guide.slug)).toEqual(['italiana', 'italiana', 'caro-kann'])
  })

  it('frase para a página da abertura', () => {
    const usage = usageByGuide([record(ITALIAN), record(ITALIAN, { key: 'x', outcome: 'loss' })])
    expect(usageSentence(usage)).toBe('Você tem 2 partidas de brancas, com 50% de aproveitamento.')
    expect(usageSentence([])).toBeNull()
  })
})
