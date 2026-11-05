import { useCallback, useEffect, useState } from 'react'
import type { AnalyzedMove } from '../chess/analyze'
import { type KeyMoment, REVIEW_SPEEDS, type ReviewSpeedId, stepDelay } from '../chess/review'
import { loadReviewSpeed, saveReviewSpeed } from '../storage'

/**
 * idle: fora da revisão. playing: avançando sozinha. stopped: parada num momento-chave.
 * paused: a pessoa interrompeu. done: chegou ao fim.
 */
export type ReviewStatus = 'idle' | 'playing' | 'stopped' | 'paused' | 'done'

interface GuidedReviewOptions {
  moves: AnalyzedMove[]
  moments: KeyMoment[]
  ply: number
  /** Leva o tabuleiro a um lance, sem nenhum outro efeito. */
  moveTo: (ply: number) => void
}

/** A reprodução automática da revisão: avança, acelera e para nos momentos-chave. */
export function useGuidedReview({ moves, moments, ply, moveTo }: GuidedReviewOptions) {
  const [status, setStatus] = useState<ReviewStatus>('idle')
  const [speed, setSpeedState] = useState<ReviewSpeedId>(() => {
    const saved = loadReviewSpeed()
    return REVIEW_SPEEDS.some((item) => item.id === saved) ? (saved as ReviewSpeedId) : '2x'
  })

  const total = moves.length
  const momentAt = useCallback((target: number) => moments.find((moment) => moment.ply === target) ?? null, [moments])

  useEffect(() => {
    if (status !== 'playing') return
    if (ply >= total) {
      setStatus('done')
      return
    }
    const next = ply + 1
    const timer = setTimeout(
      () => {
        moveTo(next)
        if (momentAt(next)) setStatus('stopped')
        else if (next >= total) setStatus('done')
      },
      stepDelay(speed, moves[next - 1].cls === 'book', Boolean(momentAt(next))),
    )
    return () => clearTimeout(timer)
  }, [momentAt, moveTo, moves, ply, speed, status, total])

  /** Começa ou retoma de onde o tabuleiro está. */
  const play = useCallback(() => {
    if (ply >= total) {
      // Parada no último lance: continuar é ir para a conclusão. Fora da revisão ou já nela, recomeça.
      if (status === 'stopped' || status === 'paused') {
        setStatus('done')
        return
      }
      moveTo(0)
    }
    setStatus('playing')
  }, [moveTo, ply, status, total])

  const pause = useCallback(() => setStatus((current) => (current === 'idle' ? current : 'paused')), [])
  const exit = useCallback(() => setStatus('idle'), [])

  const jump = useCallback(
    (target: number) => {
      moveTo(target)
      setStatus('stopped')
    },
    [moveTo],
  )

  const nextMoment = moments.find((moment) => moment.ply > ply) ?? null

  /** Pula direto para o próximo momento. Sem nenhum à frente, vai para a conclusão. */
  const skip = useCallback(() => {
    if (nextMoment) {
      jump(nextMoment.ply)
      return
    }
    moveTo(total)
    setStatus('done')
  }, [jump, moveTo, nextMoment, total])

  const setSpeed = useCallback((id: ReviewSpeedId) => {
    setSpeedState(id)
    saveReviewSpeed(id)
  }, [])

  return { status, speed, setSpeed, play, pause, exit, jump, skip, nextMoment, current: momentAt(ply) }
}
