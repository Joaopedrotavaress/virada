import { describe, expect, it } from 'vitest'
import type { Eval } from './evaluation'
import { type MotifInput, detectMotifs, explainMotifs, materialGain } from './motifs'

const cp = (value: number): Eval => ({ kind: 'cp', cp: value })
const mate = (moves: number, winner: 'w' | 'b'): Eval => ({ kind: 'mate', moves, winner })

function input(overrides: Partial<MotifInput> & Pick<MotifInput, 'beforeFen' | 'afterFen' | 'uci'>): MotifInput {
  return { color: 'w', beforeEval: cp(0), afterEval: cp(-500), bestUci: null, beforePv: [], afterPv: [], ...overrides }
}

const kinds = (motifs: { kind: string }[]) => motifs.map((motif) => motif.kind)

describe('peça pendurada', () => {
  const blunder = input({
    beforeFen: '3qk3/8/8/8/8/2N5/8/4K3 w - - 0 1',
    afterFen: '3qk3/8/8/3N4/8/8/8/4K3 b - - 1 1',
    uci: 'c3d5',
    afterPv: ['d8d5'],
    beforePv: ['e1e2'],
    bestUci: 'e1e2',
  })

  it('aponta a peça atacada e sem defesa', () => {
    const motifs = detectMotifs(blunder)
    expect(motifs[0]).toEqual({ kind: 'hanging', piece: 'n', square: 'd5' })
    expect(explainMotifs(motifs, { color: 'w' })).toBe('O cavalo em d5 ficou pendurado: está atacado e sem defesa.')
  })

  it('não aponta se a peça está defendida', () => {
    const motifs = detectMotifs({ ...blunder, afterFen: '3qk3/8/8/3N4/4P3/8/8/4K3 b - - 1 1', beforeFen: '3qk3/8/8/8/4P3/2N5/8/4K3 w - - 0 1' })
    expect(kinds(motifs)).not.toContain('hanging')
  })

  it('não afirma se a linha do motor não vai buscar a peça (pode estar envenenada)', () => {
    expect(kinds(detectMotifs({ ...blunder, afterPv: ['e8e7'] }))).not.toContain('hanging')
  })
})

describe('material', () => {
  // As brancas perdem uma torre pelo garfo do cavalo em c2.
  const fork = input({
    beforeFen: '4k3/8/8/8/3n4/8/R7/4K3 w - - 0 1',
    afterFen: '4k3/8/8/8/3n4/8/8/R3K3 b - - 1 1',
    uci: 'a2a1',
    afterPv: ['d4c2', 'e1d2', 'c2a1'],
    beforePv: ['a2a8', 'e8d7'],
    bestUci: 'a2a8',
  })

  it('diz o que se perde e mostra a linha até a captura, em notação brasileira', () => {
    const material = detectMotifs(fork).find((motif) => motif.kind === 'material')
    expect(material).toEqual({ kind: 'material', description: 'uma torre', line: ['Nc2+', 'Kd2', 'Nxa1'] })
    expect(explainMotifs(material ? [material] : [], { color: 'w' })).toBe('A melhor resposta das Pretas ganha uma torre: Cc2+ Rd2 Cxa1.')
  })

  it('não culpa o lance se a melhor linha perde o mesmo', () => {
    const motifs = detectMotifs({ ...fork, beforePv: ['a2a1', 'd4c2', 'e1d2', 'c2a1'] })
    expect(kinds(motifs)).not.toContain('material')
  })

  it('peça por peão vira pontos de material', () => {
    const motifs = detectMotifs(
      input({
        beforeFen: '4k3/8/3p4/4p3/3N4/8/8/4K3 w - - 0 1',
        afterFen: '4k3/8/3p4/4N3/8/8/8/4K3 b - - 0 1',
        uci: 'd4e5',
        afterPv: ['d6e5'],
        beforePv: ['d4f3'],
      }),
    )
    const material = motifs.find((motif) => motif.kind === 'material')
    expect(material && material.kind === 'material' ? material.description : '').toBe('2 pontos de material')
  })

  it('torre por peça menor é a qualidade', () => {
    const motifs = detectMotifs(
      input({
        beforeFen: '4k3/8/3p4/4b3/8/8/4R3/4K3 w - - 0 1',
        afterFen: '4k3/8/3p4/4R3/8/8/8/4K3 b - - 0 1',
        uci: 'e2e5',
        afterEval: cp(-200),
        afterPv: ['d6e5'],
        beforePv: ['e1d1'],
      }),
    )
    expect(motifs.find((motif) => motif.kind === 'material')).toMatchObject({ description: 'a qualidade' })
  })

  it('reconhece o ganho de material para o treinador do jogo', () => {
    expect(materialGain('w', '4k3/8/8/3b4/8/8/3R4/4K3 w - - 0 1', '4k3/8/8/3R4/8/8/8/4K3 b - - 0 1', ['e8e7'])).toBe('um bispo')
    expect(materialGain('w', '4k3/8/8/8/8/8/3R4/4K3 w - - 0 1', '4k3/8/8/8/8/3R4/8/4K3 b - - 0 1', ['e8e7'])).toBeNull()
    // A peça é retomada: não houve ganho.
    expect(materialGain('w', '4k3/2p5/3b4/8/8/8/3R4/4K3 w - - 0 1', '4k3/2p5/3R4/8/8/8/8/4K3 b - - 0 1', ['c7d6'])).toBeNull()
    // O que a linha promete mais adiante não conta.
    expect(materialGain('w', '4k3/8/8/3b4/8/8/3R4/r3K3 w - - 0 1', '4k3/8/8/3R4/8/8/8/r3K3 b - - 0 1', ['e8e7', 'd5a5', 'e7e8', 'a5a1'])).toBe('um bispo')
  })
})

describe('garfo', () => {
  it('encontra o lance da linha que ataca duas peças valiosas', () => {
    const motifs = detectMotifs(
      input({
        beforeFen: '4k3/8/8/8/3n4/8/R7/4K3 w - - 0 1',
        afterFen: '4k3/8/8/8/3n4/8/8/R3K3 b - - 1 1',
        uci: 'a2a1',
        afterPv: ['d4c2', 'e1d2', 'c2a1'],
      }),
    )
    const fork = motifs.find((motif) => motif.kind === 'fork')
    expect(fork).toEqual({ kind: 'fork', san: 'Nc2+', targets: ['k', 'r'] })
    expect(explainMotifs(fork ? [fork] : [], { color: 'w' })).toBe('Cc2+ é um garfo: ataca o rei e a torre ao mesmo tempo.')
  })

  it('não é garfo se a peça atacante pode ser capturada', () => {
    const motifs = detectMotifs(
      input({
        beforeFen: '4k3/8/8/8/3n4/8/R7/3QK3 w - - 0 1',
        afterFen: '4k3/8/8/8/3n4/8/8/R2QK3 b - - 1 1',
        uci: 'a2a1',
        afterPv: ['d4c2', 'd1c2'],
      }),
    )
    expect(kinds(motifs)).not.toContain('fork')
  })
})

describe('cravada', () => {
  it('avisa quando a resposta crava uma peça contra o rei', () => {
    const motifs = detectMotifs(
      input({
        color: 'b',
        beforeEval: cp(0),
        afterEval: cp(300),
        beforeFen: '4k3/3p4/2n5/8/8/8/8/4KB2 b - - 0 1',
        afterFen: '4k3/8/2np4/8/8/8/8/4KB2 w - - 0 2',
        uci: 'd7d6',
        afterPv: ['f1b5'],
      }),
    )
    const pin = motifs.find((motif) => motif.kind === 'pin')
    expect(pin).toMatchObject({ kind: 'pin', pinned: 'n', square: 'c6', behind: 'k', byPly: 'reply', bySan: 'Bb5' })
    expect(explainMotifs(pin ? [pin] : [], { color: 'b' })).toBe('Bb5 crava o cavalo em c6 contra o rei.')
  })

  it('não repete a cravada que já existia antes do lance', () => {
    const motifs = detectMotifs(
      input({
        color: 'b',
        afterEval: cp(300),
        beforeFen: '4k3/7p/2n5/1B6/8/8/8/4K3 b - - 0 1',
        afterFen: '4k3/8/2n4p/1B6/8/8/8/4K3 w - - 0 2',
        uci: 'h7h6',
        afterPv: ['e1e2'],
      }),
    )
    expect(kinds(motifs)).not.toContain('pin')
  })
})

describe('mate', () => {
  const quiet = { beforeFen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', afterFen: '4k3/8/8/8/8/8/8/R2K4 b - - 1 1', uci: 'e1d1' }

  it('mate perdido fala com a pessoa e esconde o lance até revelar', () => {
    const motifs = detectMotifs(input({ ...quiet, beforeEval: mate(3, 'w'), afterEval: cp(300), bestUci: 'a1a7' }))
    expect(explainMotifs(motifs, { color: 'w', isUser: true, revealBest: false })).toBe('Você tinha mate em 3.')
    expect(explainMotifs(motifs, { color: 'w', isUser: true })).toBe('Você tinha mate em 3, começando com Ta7.')
    expect(explainMotifs(motifs, { color: 'w' })).toContain('As Brancas tinham mate em 3')
  })

  it('não diz mate perdido se o mate continua', () => {
    expect(kinds(detectMotifs(input({ ...quiet, beforeEval: mate(3, 'w'), afterEval: mate(4, 'w') })))).not.toContain('missed-mate')
  })

  it('mate permitido vem sozinho', () => {
    const motifs = detectMotifs(
      input({
        beforeFen: 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2',
        afterFen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
        uci: 'g2g4',
        afterEval: mate(1, 'b'),
        afterPv: ['d8h4'],
      }),
    )
    expect(kinds(motifs)).toEqual(['allowed-mate'])
    expect(explainMotifs(motifs, { color: 'w', isUser: true })).toBe('Depois do seu lance, o adversário tem mate em 1, começando com Dh4#.')
  })

  it('não diz "permitiu" se o mate já existia', () => {
    expect(kinds(detectMotifs(input({ ...quiet, beforeEval: mate(2, 'b'), afterEval: mate(1, 'b') })))).not.toContain('allowed-mate')
  })
})

describe('captura perdida', () => {
  const missed = input({
    beforeFen: '4k3/8/8/4b3/8/8/8/4R1K1 w - - 0 1',
    afterFen: '4k3/8/8/4b3/8/8/8/4RK2 b - - 1 1',
    uci: 'g1f1',
    bestUci: 'e1e5',
    beforePv: ['e1e5', 'e8d7'],
    afterPv: ['e8d7'],
  })

  it('aponta a captura que ganhava material, só depois de revelar', () => {
    const motifs = detectMotifs(missed)
    expect(motifs).toContainEqual({ kind: 'missed-capture', san: 'Rxe5+', piece: 'b', square: 'e5' })
    expect(explainMotifs(motifs, { color: 'w', isUser: true })).toBe('Você podia ter capturado o bispo em e5 com Txe5+.')
    expect(explainMotifs(motifs, { color: 'w', revealBest: false })).toBeNull()
  })

  it('não vale se o melhor lance não é captura', () => {
    expect(kinds(detectMotifs({ ...missed, bestUci: 'e1e2', beforePv: ['e1e2'] }))).not.toContain('missed-capture')
  })
})

describe('explicação', () => {
  it('sem motivo devolve null, para usar o texto genérico', () => {
    expect(explainMotifs([], { color: 'w' })).toBeNull()
  })

  it('junta no máximo três frases', () => {
    const many = Array.from({ length: 5 }, () => ({ kind: 'hanging' as const, piece: 'n' as const, square: 'd5' }))
    expect(explainMotifs(many, { color: 'w' })?.match(/pendurado/g)).toHaveLength(3)
  })
})
