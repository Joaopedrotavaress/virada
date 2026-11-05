import { useEffect, useRef, useState } from 'react'
import { evaluatePosition } from '../chess/evaluate'
import { EngineAbortError, type EngineLine, getEngine } from '../engine/stockfish'

export interface BestLines {
  lines: EngineLine[] | null
  loading: boolean
  error: string | null
}

const LINE_COUNT = 3

/** As 3 melhores linhas de uma posição (MultiPV 3), sob demanda. fen null: nada a calcular. */
export function useBestLines(fen: string | null, depth: number): BestLines {
  const cache = useRef(new Map<string, EngineLine[]>())
  const [state, setState] = useState<BestLines>({ lines: null, loading: false, error: null })

  useEffect(() => {
    if (!fen) {
      setState({ lines: null, loading: false, error: null })
      return
    }
    const key = `${fen}|${depth}`
    const cached = cache.current.get(key)
    if (cached) {
      setState({ lines: cached, loading: false, error: null })
      return
    }
    const controller = new AbortController()
    setState({ lines: null, loading: true, error: null })
    evaluatePosition(getEngine(), fen, { depth, multiPv: LINE_COUNT, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return
        cache.current.set(key, result.lines)
        setState({ lines: result.lines, loading: false, error: null })
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted || failure instanceof EngineAbortError) return
        setState({ lines: null, loading: false, error: 'O Stockfish não respondeu. Recarregue a página e tente de novo.' })
      })
    return () => controller.abort()
  }, [fen, depth])

  return state
}
