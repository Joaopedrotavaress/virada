import { Chess } from 'chess.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Color } from '../chess/evaluation'
import { sanToPt } from '../chess/notation'

const REPLY_DELAY_MS = 450
/** Depois de tantos erros no mesmo lance, a seta mostra o caminho. */
const ERRORS_BEFORE_ARROW = 2

export interface LineStep {
  san: string
  uci: string
  from: string
  to: string
  fen: string
}

/** Cada lance da linha, já com a posição depois dele. */
export function lineSteps(sans: string[], startFen?: string): LineStep[] {
  const chess = startFen ? new Chess(startFen) : new Chess()
  return sans.map((san) => {
    const move = chess.move(san)
    return { san: move.san, uci: move.lan, from: move.from, to: move.to, fen: move.after }
  })
}

/** Praticar uma sequência: a pessoa joga os lances da sua cor, e o app responde os do outro lado. */
export function useLine({ sans, color, startFen, onFinished }: { sans: string[]; color: Color; startFen?: string; onFinished?: (errors: number) => void }) {
  const steps = useMemo(() => lineSteps(sans, startFen), [sans, startFen])
  const initialFen = useMemo(() => (startFen ? new Chess(startFen) : new Chess()).fen(), [startFen])
  const [cursor, setCursor] = useState(0)
  const [errors, setErrors] = useState(0)
  const [stepErrors, setStepErrors] = useState(0)
  const [wrong, setWrong] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const done = cursor >= steps.length
  const fen = cursor === 0 ? initialFen : steps[cursor - 1].fen
  const userTurn = !done && fen.split(' ')[1] === color
  const finished = useRef(false)

  // O outro lado responde sozinho, com uma pequena pausa para dar tempo de ver.
  useEffect(() => {
    if (done || userTurn) return
    timer.current = setTimeout(() => setCursor((value) => value + 1), REPLY_DELAY_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [cursor, done, userTurn])

  useEffect(() => {
    if (done && !finished.current) {
      finished.current = true
      onFinished?.(errors)
    }
    // Avisa uma vez, ao chegar no fim.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  const play = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      if (!userTurn) return false
      let move
      try {
        move = new Chess(fen).move({ from, to, promotion })
      } catch {
        return false
      }
      if (move.lan === steps[cursor].uci) {
        setWrong(null)
        setStepErrors(0)
        setCursor((value) => value + 1)
        return true
      }
      setWrong(sanToPt(move.san))
      setErrors((value) => value + 1)
      setStepErrors((value) => value + 1)
      return false
    },
    [cursor, fen, steps, userTurn],
  )

  const restart = useCallback(() => {
    finished.current = false
    setCursor(0)
    setErrors(0)
    setStepErrors(0)
    setWrong(null)
  }, [])

  return {
    steps,
    cursor,
    fen,
    done,
    userTurn,
    errors,
    wrong,
    /** O lance esperado, depois de errar demais. */
    shownStep: userTurn && stepErrors >= ERRORS_BEFORE_ARROW ? steps[cursor] : null,
    lastStep: cursor > 0 ? steps[cursor - 1] : null,
    play,
    restart,
  }
}
