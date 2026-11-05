import { Chess } from 'chess.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnalyzedPosition } from '../chess/analyze'
import { type MoveClass, classOf, gradeMove } from '../chess/classify'
import { type PositionResult, evaluatePosition } from '../chess/evaluate'
import { EngineAbortError, getEngine } from '../engine/stockfish'

/** Perdeu menos que isto em relação ao melhor lance: conta como acerto. */
export const FOUND_LOSS = 2

export interface TriedMove {
  fen: string
  san: string
  uci: string
  from: string
  to: string
}

export type RetryPhase = 'playing' | 'evaluating' | 'found' | 'wrong' | 'answer'

export interface RetryState {
  ply: number
  phase: RetryPhase
  tried: TriedMove | null
  cls: MoveClass | null
  after: PositionResult | null
  error: string | null
}

/** "Tentar de novo": volta para a posição antes do erro e avalia o lance que a pessoa tentar. */
export function useRetry(positions: AnalyzedPosition[]) {
  const [retry, setRetry] = useState<RetryState | null>(null)
  const controller = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    controller.current?.abort()
    controller.current = null
  }, [])

  useEffect(() => stop, [stop])

  const start = useCallback(
    (ply: number) => {
      stop()
      setRetry({ ply, phase: 'playing', tried: null, cls: null, after: null, error: null })
    },
    [stop],
  )

  const exit = useCallback(() => {
    stop()
    setRetry(null)
  }, [stop])

  const again = useCallback(() => {
    stop()
    setRetry((current) => current && { ...current, phase: 'playing', tried: null, cls: null, after: null, error: null })
  }, [stop])

  const reveal = useCallback(() => {
    stop()
    setRetry((current) => current && { ...current, phase: 'answer', tried: null, cls: null, after: null })
  }, [stop])

  const play = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      if (!retry || retry.phase !== 'playing') return false
      const before = positions[retry.ply - 1]
      let played
      try {
        played = new Chess(before.fen).move({ from, to, promotion })
      } catch {
        return false
      }
      const tried: TriedMove = { fen: played.after, san: played.san, uci: played.lan, from, to }
      const color = played.color
      setRetry({ ...retry, phase: 'evaluating', tried })

      stop()
      const current = new AbortController()
      controller.current = current
      evaluatePosition(getEngine(), tried.fen, { signal: current.signal })
        .then((after) => {
          if (current.signal.aborted) return
          const graded = gradeMove(tried.uci, color, before, after)
          const found = graded.isBest || graded.loss < FOUND_LOSS
          setRetry((state) => state && { ...state, phase: found ? 'found' : 'wrong', cls: classOf(graded), after })
        })
        .catch((failure: unknown) => {
          if (current.signal.aborted || failure instanceof EngineAbortError) return
          setRetry((state) => state && { ...state, phase: 'playing', tried: null, error: 'O Stockfish não respondeu. Tente de novo.' })
        })
      return true
    },
    [positions, retry, stop],
  )

  return { retry, start, exit, again, reveal, play }
}
