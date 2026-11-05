import { Chess } from 'chess.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnalyzedPosition } from '../chess/analyze'
import { type MoveClass, classOf, gradeMove } from '../chess/classify'
import { type PositionResult, evaluatePosition } from '../chess/evaluate'
import type { Color, Eval } from '../chess/evaluation'
import { EngineAbortError, getEngine } from '../engine/stockfish'

export interface VariantStep {
  id: number
  fen: string
  san: string
  uci: string
  from: string
  to: string
  color: Color
  moveNumber: number
  /** Posição antes do lance: é o que o feedback compara. */
  beforeFen: string
  before: PositionResult | null
  after: PositionResult | null
  cls: MoveClass | null
}

export interface VariantState {
  basePly: number
  steps: VariantStep[]
  /** -1: ainda na posição da partida, antes do primeiro lance testado. */
  cursor: number
}

export type WalkTarget = 'start' | 'back' | 'forward' | 'end'

function asResult(position: AnalyzedPosition): PositionResult {
  return { eval: position.eval, bestUci: position.bestUci, pvUci: position.pvUci, terminal: position.terminal, lines: [] }
}

/** Lances testados sobre a partida, com feedback instantâneo em cada um. */
export function useVariant(positions: AnalyzedPosition[]) {
  const [variant, setVariant] = useState<VariantState | null>(null)
  const [liveEval, setLiveEval] = useState<Eval | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cache = useRef(new Map<string, PositionResult>())
  const partial = useRef(new Map<string, PositionResult>())
  const nextId = useRef(1)

  const current = variant && variant.cursor >= 0 ? variant.steps[variant.cursor] : null
  const baseFen = variant ? positions[variant.basePly].fen : null
  const needsEval = Boolean(current && (!current.after || !current.before))

  useEffect(() => {
    if (!current || !needsEval) return
    const step = current
    const controller = new AbortController()
    setError(null)
    setLiveEval(null)

    const evaluate = async (fen: string) => {
      const known = cache.current.get(fen)
      if (known) return known
      const result = await evaluatePosition(getEngine(), fen, {
        signal: controller.signal,
        onUpdate: (update) => {
          partial.current.set(fen, update)
          if (fen === step.fen && !controller.signal.aborted) setLiveEval(update.eval)
        },
      })
      cache.current.set(fen, result)
      return result
    }

    const run = async () => {
      // Se a pessoa jogou antes de a busca anterior acabar, usa o que já tinha sido calculado dela.
      const before = step.before ?? cache.current.get(step.beforeFen) ?? partial.current.get(step.beforeFen) ?? (await evaluate(step.beforeFen))
      const after = await evaluate(step.fen)
      if (controller.signal.aborted) return
      const cls = classOf(gradeMove(step.uci, step.color, before, after), { fen: step.beforeFen, uci: step.uci, color: step.color, evalBefore: before.eval })
      setVariant((state) => state && { ...state, steps: state.steps.map((item) => (item.id === step.id ? { ...item, before, after, cls } : item)) })
    }

    run().catch((failure: unknown) => {
      if (controller.signal.aborted || failure instanceof EngineAbortError) return
      setError('O Stockfish não respondeu. Recarregue a página e tente de novo.')
    })
    // A limpeza manda "stop": o resultado antigo é ignorado e o motor fica livre para o lance novo.
    return () => controller.abort()
  }, [current?.id, needsEval]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Joga um lance a partir de onde o tabuleiro está. Começa a variante se ainda não houver. */
  const play = useCallback(
    (basePly: number, from: string, to: string, promotion?: string): boolean => {
      const state: VariantState = variant ?? { basePly, steps: [], cursor: -1 }
      const position = state.cursor >= 0 ? state.steps[state.cursor].fen : positions[state.basePly].fen
      let played
      try {
        played = new Chess(position).move({ from, to, promotion })
      } catch {
        return false
      }
      const known = state.cursor >= 0 ? state.steps[state.cursor].after : asResult(positions[state.basePly])
      const step: VariantStep = {
        id: nextId.current++,
        fen: played.after,
        san: played.san,
        uci: played.lan,
        from,
        to,
        color: played.color,
        moveNumber: Number(position.split(' ')[5]),
        beforeFen: position,
        before: known,
        after: null,
        cls: null,
      }
      setVariant({ ...state, steps: [...state.steps.slice(0, state.cursor + 1), step], cursor: state.cursor + 1 })
      return true
    },
    [positions, variant],
  )

  /** Abre a variante já com lances dados (o que a pessoa tentou) e joga mais um por cima. */
  const playAfter = useCallback(
    (basePly: number, first: { from: string; to: string; uci: string }, from: string, to: string, promotion?: string): boolean => {
      const start = positions[basePly]
      try {
        const chess = new Chess(start.fen)
        const opening = chess.move({ from: first.from, to: first.to, promotion: first.uci[4] })
        const next = chess.move({ from, to, promotion })
        const firstStep: VariantStep = {
          id: nextId.current++,
          fen: opening.after,
          san: opening.san,
          uci: opening.lan,
          from: first.from,
          to: first.to,
          color: opening.color,
          moveNumber: Number(start.fen.split(' ')[5]),
          beforeFen: start.fen,
          before: asResult(start),
          after: null,
          cls: null,
        }
        const secondStep: VariantStep = {
          id: nextId.current++,
          fen: next.after,
          san: next.san,
          uci: next.lan,
          from,
          to,
          color: next.color,
          moveNumber: Number(opening.after.split(' ')[5]),
          beforeFen: opening.after,
          before: null,
          after: null,
          cls: null,
        }
        setVariant({ basePly, steps: [firstStep, secondStep], cursor: 1 })
        return true
      } catch {
        return false
      }
    },
    [positions],
  )

  const select = useCallback((cursor: number) => setVariant((state) => state && { ...state, cursor }), [])

  const walk = useCallback((target: WalkTarget) => {
    setVariant((state) => {
      if (!state) return state
      const last = state.steps.length - 1
      const cursor = target === 'start' ? -1 : target === 'end' ? last : target === 'back' ? Math.max(-1, state.cursor - 1) : Math.min(last, state.cursor + 1)
      return { ...state, cursor }
    })
  }, [])

  const exit = useCallback(() => {
    setVariant(null)
    setLiveEval(null)
    setError(null)
  }, [])

  return { variant, current, baseFen, liveEval, error, play, playAfter, select, walk, exit }
}
