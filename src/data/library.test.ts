import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { type GameAnalysis, analyzeGame } from '../chess/analyze'
import { type GameDigest, digestAnalysis, phaseOf, pgnFromAnalysis } from '../chess/digest'
import { STORES, writeMany } from './db'
import { type GameRecord, publishForTest } from './library'
import { parsePgn } from '../chess/pgn'
import type { ChessComGame } from '../chesscom/api'
import type { EngineLike, EngineResult } from '../engine/stockfish'
import { loadCards } from '../training/cards'
import { exportAll, mergeBackup, parseBackup } from './backup'
import { resetConnection } from './db'
import { refreshOldDigests } from './library'
import { allRecords, addUnanalyzed, getAnalysis, ingestChessCom, initLibrary, migrateLegacy, openingFromPgn, outcomeOf, recordsFor, removeRecord, resetLibrary, saveAnalyzed, updateRecord } from './library'
import { loadBook } from '../chess/book'

const PGN = `[White "ana"]
[Black "bia"]
[Date "2026.10.01"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7 Kxf7 7. Qf3+ Ke6 1-0`

/** Motor de mentira: avaliação fixa, para testar o armazenamento sem depender do Stockfish. */
const fakeEngine: EngineLike = {
  newGame: async () => undefined,
  analyze: async (fen): Promise<EngineResult> => {
    const side = fen.split(' ')[1]
    return { eval: { kind: 'cp', cp: side === 'w' ? 40 : -40 }, bestUci: 'e2e4', pvUci: ['e2e4'], depth: 10, lines: [] }
  },
}

const updateOld = async (key: string, digest: GameDigest) => {
  const record = allRecords().find((item) => item.key === key) as GameRecord
  publishForTest({ ...record, digest })
  await writeMany(STORES.games, [{ value: { ...record, digest } }])
}

const analyzed = (depth: number, pgn = PGN) => analyzeGame(fakeEngine, parsePgn(pgn), depth)

const chessComGame = (id: number, extra: Partial<ChessComGame> = {}): ChessComGame => ({
  url: `https://www.chess.com/game/live/${id}`,
  pgn: `[White "ana"]\n[Black "bia"]\n[Date "2026.10.0${(id % 9) + 1}"]\n[Result "0-1"]\n[TimeControl "600"]\n\n1. d4 d5 2. c4 e6 0-1`,
  time_class: 'rapid',
  end_time: 1_790_000_000 + id,
  white: { username: 'ana', rating: 1200, result: 'resigned' },
  black: { username: 'bia', rating: 1250, result: 'win' },
  ...extra,
})

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  resetConnection()
  resetLibrary()
})

describe('biblioteca de partidas', () => {
  it('refaz os resumos de regras antigas, sem chamar o motor e sem repetir', async () => {
    await initLibrary('')
    const { record } = await saveAnalyzed(await analyzed(12), { pgn: PGN, userColor: 'w' })
    const old = record.digest as NonNullable<typeof record.digest>
    await updateOld(record.key, { ...old, classVersion: 1, accuracy: { w: 99, b: 99 } })
    expect(await refreshOldDigests()).toBe(1)
    const fresh = allRecords().find((item) => item.key === record.key)
    expect(fresh?.digest?.classVersion).toBe(old.classVersion)
    expect(fresh?.digest?.accuracy.w).toBe(old.accuracy.w)
    expect(await refreshOldDigests()).toBe(0)
  })

  it('guarda a partida e a análise, e a análise volta do banco', async () => {
    const analysis = await analyzed(12)
    const { record, persisted } = await saveAnalyzed(analysis, { pgn: PGN, userColor: 'w' })
    expect(persisted).toBe(true)
    expect(record.outcome).toBe('win')
    expect(record.digest?.depth).toBe(12)
    resetLibrary()
    await initLibrary('')
    expect(allRecords()).toHaveLength(1)
    expect(allRecords()[0].pgn).toBe(PGN)
    const stored = await getAnalysis(record.key)
    expect(stored?.moves.length).toBe(analysis.moves.length)
  })

  it('a mesma partida em duas profundidades fica uma só, com a análise mais profunda', async () => {
    await saveAnalyzed(await analyzed(18), { pgn: PGN, userColor: 'w' })
    const second = await saveAnalyzed(await analyzed(12), { pgn: PGN, userColor: 'w' })
    expect(allRecords()).toHaveLength(1)
    expect(second.analysis.depth).toBe(18)
    const third = await saveAnalyzed(await analyzed(20), { pgn: PGN, userColor: 'w' })
    expect(third.record.digest?.depth).toBe(20)
    expect(allRecords()).toHaveLength(1)
  })

  it('analisar de novo não perde marcas e notas', async () => {
    const { record } = await saveAnalyzed(await analyzed(12), { pgn: PGN, userColor: 'w' })
    await updateRecord(record.key, { tags: ['torneio'], note: 'Boa partida' })
    await saveAnalyzed(await analyzed(15), { pgn: PGN, userColor: 'w' })
    expect(allRecords()[0].tags).toEqual(['torneio'])
    expect(allRecords()[0].note).toBe('Boa partida')
  })

  it('uma partida apagada não volta quando o chess.com a traz de novo', async () => {
    const game = chessComGame(1)
    expect(await ingestChessCom('ana', [game])).toBe(1)
    const key = allRecords()[0].key
    await removeRecord(key)
    expect(recordsFor(allRecords(), 'ana')).toHaveLength(0)
    expect(await ingestChessCom('ana', [game])).toBe(0)
    expect(recordsFor(allRecords(), 'ana')).toHaveLength(0)
  })

  it('chess.com: guarda os dados da partida, não repete e não apaga a análise', async () => {
    const game = chessComGame(2, { accuracies: { white: 71.5, black: 88.2 }, time_control: '600', rated: true })
    await ingestChessCom('Ana', [game])
    const [record] = allRecords()
    expect(record.owner).toBe('ana')
    expect(record.accuracies?.black).toBe(88.2)
    expect(record.rated).toBe(true)
    expect(record.outcome).toBe('loss')
    expect(record.whiteRating).toBe(1200)
    expect(record.opening?.eco).toMatch(/^D/)

    const analysis = await analyzeGame(fakeEngine, parsePgn(`[Link "${game.url}"]\n${game.pgn}`), 12)
    const saved = await saveAnalyzed(analysis, { pgn: `[Link "${game.url}"]\n${game.pgn}`, userColor: 'w', source: 'chesscom' })
    expect(saved.record.key).toBe(record.key)
    expect(allRecords()).toHaveLength(1)
    expect(saved.record.whiteRating).toBe(1200)

    await ingestChessCom('ana', [game])
    expect(allRecords()).toHaveLength(1)
    expect(allRecords()[0].digest?.depth).toBe(12)
  })

  it('partidas de outro usuário do chess.com ficam fora da lista', async () => {
    await ingestChessCom('ana', [chessComGame(3)])
    await addUnanalyzed({ pgn: PGN, userColor: 'w', source: 'bot' })
    expect(recordsFor(allRecords(), 'ana')).toHaveLength(2)
    expect(recordsFor(allRecords(), 'bia')).toHaveLength(1)
  })

  it('resultado do ponto de vista da pessoa', () => {
    expect(outcomeOf('1-0', 'w')).toBe('win')
    expect(outcomeOf('1-0', 'b')).toBe('loss')
    expect(outcomeOf('0-1', 'b')).toBe('win')
    expect(outcomeOf('1/2-1/2', 'b')).toBe('draw')
    expect(outcomeOf('*', 'b')).toBeNull()
    expect(outcomeOf('1-0', null)).toBeNull()
  })
})

describe('resumo da análise', () => {
  it('fase da partida', () => {
    expect(phaseOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 5)).toBe('opening')
    expect(phaseOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 20)).toBe('middlegame')
    expect(phaseOf('8/5k2/8/8/8/8/1R3K2/8 w - - 0 50', 50)).toBe('endgame')
  })

  it('só guarda os erros da pessoa', async () => {
    const analysis = await analyzed(12)
    const errors = digestAnalysis(analysis, 'w').errors
    expect(errors.every((error) => analysis.moves[error.ply - 1].color === 'w')).toBe(true)
    expect(digestAnalysis(analysis, null).errors).toHaveLength(0)
  })

  it('refaz o PGN de uma análise antiga, com os mesmos lances', async () => {
    const analysis = await analyzed(12)
    const again = parsePgn(pgnFromAnalysis(analysis))
    expect(again.moves.map((move) => move.uci)).toEqual(analysis.moves.map((move) => move.uci))
    expect(again.white).toBe('ana')
    expect(again.result).toBe('1-0')
  })

  it('reconhece a abertura sem analisar', async () => {
    const book = await loadBook()
    expect(openingFromPgn(book!, PGN)?.eco).toMatch(/^C5/)
    expect(openingFromPgn(book!, '[White "x"]\n\n1. h4 h5 *')?.eco).toBeDefined()
    expect(openingFromPgn(book!, '[White "x"]\n\n*')).toBeNull()
  })
})

describe('migração do histórico antigo', () => {
  it('passa as partidas do localStorage para o banco, sem duplicar e sem deixar lixo', async () => {
    const low = await analyzed(12)
    const high = await analyzed(15)
    const items = new Map<string, string>([
      ['treinador:partidas:v1', JSON.stringify([high, low, { lixo: true }])],
      ['treinador:partidas-bot:v1', JSON.stringify([{ id: 'x', pgn: '[White "ana"]\n[Black "Bot"]\n[Date "2026.10.02"]\n[Result "*"]\n\n1. e4 *', userColor: 'w', playedAt: 5 }])],
    ])
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (key: string) => items.get(key) ?? null,
      removeItem: (key: string) => items.delete(key),
    }
    try {
      expect(await migrateLegacy('ana')).toBe(3)
      const records = allRecords()
      expect(records).toHaveLength(2)
      const migrated = records.find((record) => record.digest)!
      expect(migrated.digest?.depth).toBe(15)
      expect(migrated.userColor).toBe('w')
      expect(records.find((record) => !record.digest)?.source).toBe('bot')
      expect(items.size).toBe(0)
      expect(await migrateLegacy('ana')).toBe(0)
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage
    }
  })
})

describe('backup', () => {
  it('exporta e restaura tudo em outro aparelho', async () => {
    const analysis: GameAnalysis = await analyzed(12)
    const { record } = await saveAnalyzed(analysis, { pgn: PGN, userColor: 'w' })
    await updateRecord(record.key, { note: 'nota' })
    const text = JSON.stringify(await exportAll())

    globalThis.indexedDB = new IDBFactory()
    resetConnection()
    resetLibrary()
    await initLibrary('')
    expect(allRecords()).toHaveLength(0)

    const report = await mergeBackup(parseBackup(text))
    expect(report.games).toBe(1)
    expect(report.analyses).toBe(1)
    expect(allRecords()[0].note).toBe('nota')
    expect((await getAnalysis(record.key))?.moves.length).toBe(analysis.moves.length)
  })

  it('ao juntar, fica a versão mais nova de cada item', async () => {
    const { record } = await saveAnalyzed(await analyzed(12), { pgn: PGN, userColor: 'w' })
    const older = await exportAll()
    await new Promise((resolve) => setTimeout(resolve, 5))
    await updateRecord(record.key, { note: 'mais nova' })
    const report = await mergeBackup(older)
    expect(report.games).toBe(0)
    expect(allRecords()[0].note).toBe('mais nova')
  })

  it('a remoção mais nova vale em outro aparelho', async () => {
    const { record } = await saveAnalyzed(await analyzed(12), { pgn: PGN, userColor: 'w' })
    const before = await exportAll()
    await new Promise((resolve) => setTimeout(resolve, 5))
    await removeRecord(record.key)
    const removed = await exportAll()

    globalThis.indexedDB = new IDBFactory()
    resetConnection()
    resetLibrary()
    await initLibrary('')
    await mergeBackup(before)
    expect(recordsFor(allRecords(), '')).toHaveLength(1)
    await mergeBackup(removed)
    expect(recordsFor(allRecords(), '')).toHaveLength(0)
    expect(await getAnalysis(record.key)).toBeNull()
  })

  it('recusa arquivos que não são backup, sem tocar nos dados', () => {
    expect(() => parseBackup('isto não é json')).toThrow(/não consegui ler/)
    expect(() => parseBackup('{"app":"outro"}')).toThrow(/não é um backup/)
    expect(() => parseBackup('{"app":"treinador-xadrez","version":99}')).toThrow(/versão mais nova/)
    const parsed = parseBackup('{"app":"treinador-xadrez","version":1,"games":[{"lixo":1}],"cards":"x"}')
    expect(parsed.games).toEqual([])
    expect(parsed.cards).toEqual([])
  })
})

describe('exercícios a partir dos erros', () => {
  it('não cria exercício repetido ao analisar de novo', async () => {
    const engine: EngineLike = {
      newGame: async () => undefined,
      // A cada posição de brancas, finge que a posição piorou muito depois do lance.
      analyze: async (fen): Promise<EngineResult> => {
        const whiteToMove = fen.split(' ')[1] === 'w'
        return { eval: { kind: 'cp', cp: whiteToMove ? 300 : -300 }, bestUci: whiteToMove ? 'a2a3' : 'a7a6', pvUci: [], depth: 10, lines: [] }
      },
    }
    const analysis = await analyzeGame(engine, parsePgn(PGN), 12)
    await saveAnalyzed(analysis, { pgn: PGN, userColor: 'w' })
    const first = await loadCards()
    await saveAnalyzed({ ...analysis, depth: 15 }, { pgn: PGN, userColor: 'w' })
    const second = await loadCards()
    expect(second.map((card) => card.id).sort()).toEqual(first.map((card) => card.id).sort())
    expect(first.length).toBeLessThanOrEqual(3)
  })
})
