import { Chess } from 'chess.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BEST_ARROW_COLOR } from '../components/Board'
import { PlayableBoard } from '../components/PlayableBoard'
import { gradeMove } from '../chess/classify'
import { evaluatePosition } from '../chess/evaluate'
import { pvToSan, sanToPt, uciParts, uciToSan } from '../chess/notation'
import { THEME_LABEL } from '../data/stats'
import { EngineAbortError, getEngine } from '../engine/stockfish'
import { gamePath, navigate } from '../route'
import { type Answer, type TrainingCard } from './cards'

/** Perdeu menos que isto em relação ao melhor lance: conta como acerto. */
const FOUND_LOSS = 2

type Phase = 'playing' | 'evaluating' | 'wrong' | 'found' | 'answer'

/** Volta à posição do erro: a pessoa tenta achar o que deveria ter jogado. */
export function useErrorExercise(card: TrainingCard, onAnswered: (answer: Answer) => void) {
  const [phase, setPhase] = useState<Phase>('playing')
  const [tries, setTries] = useState(0)
  const [tried, setTried] = useState<{ fen: string; san: string; from: string; to: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fen = card.fen as string
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  const finish = (answer: Answer, next: Phase) => {
    setPhase(next)
    onAnswered(answer)
  }

  const play = (from: string, to: string, promotion?: string): boolean => {
    if (phase !== 'playing') return false
    let played
    try {
      played = new Chess(fen).move({ from, to, promotion })
    } catch {
      return false
    }
    setTried({ fen: played.after, san: played.san, from, to })
    setError(null)
    const attempt = tries + 1
    setTries(attempt)
    const right = (attempt === 1 ? 'good' : 'hard') as Answer
    if (played.lan === card.bestUci) {
      finish(right, 'found')
      return true
    }
    setPhase('evaluating')
    const active = new AbortController()
    controller.current = active
    const engine = getEngine()
    void Promise.all([evaluatePosition(engine, fen, { signal: active.signal }), evaluatePosition(engine, played.after, { signal: active.signal })])
      .then(([before, after]) => {
        if (active.signal.aborted) return
        const graded = gradeMove(played.lan, played.color, before, after)
        if (graded.isBest || graded.loss < FOUND_LOSS) finish(right, 'found')
        else setPhase('wrong')
      })
      .catch((failure: unknown) => {
        if (active.signal.aborted || failure instanceof EngineAbortError) return
        setTried(null)
        setPhase('playing')
        setError('O Stockfish não respondeu. Tente o lance de novo.')
      })
    return true
  }

  const again = () => {
    setTried(null)
    setPhase('playing')
  }
  const reveal = () => {
    controller.current?.abort()
    setTried(null)
    finish('again', 'answer')
  }

  return { phase, tried, tries, error, play, again, reveal }
}

export function ErrorExercise({ card, exercise, orientation }: { card: TrainingCard; exercise: ReturnType<typeof useErrorExercise>; orientation: 'white' | 'black' }) {
  const fen = card.fen as string
  const { phase, tried } = exercise
  const arrows = useMemo(() => {
    if ((phase !== 'found' && phase !== 'answer') || !card.bestUci) return []
    const { from, to } = uciParts(card.bestUci)
    return [{ startSquare: from, endSquare: to, color: BEST_ARROW_COLOR }]
  }, [card.bestUci, phase])
  const styles = useMemo(() => {
    if (!tried) return undefined
    const tint = phase === 'found' ? 'color-mix(in srgb, var(--fill-best) 48%, transparent)' : phase === 'wrong' ? 'color-mix(in srgb, var(--fill-mistake) 48%, transparent)' : 'color-mix(in srgb, #d4a900 42%, transparent)'
    return { [tried.from]: { backgroundColor: tint }, [tried.to]: { backgroundColor: tint } }
  }, [phase, tried])
  return <PlayableBoard fen={tried?.fen ?? fen} orientation={orientation} canMove={phase === 'playing'} onMove={exercise.play} arrows={arrows} squareStyles={styles} animateArrow={phase === 'found'} />
}

/** O texto ao lado do tabuleiro. */
export function ErrorPanel({ card, exercise, nextLabel, onNext }: { card: TrainingCard; exercise: ReturnType<typeof useErrorExercise>; nextLabel: string; onNext: () => void }) {
  const { phase, tried, error } = exercise
  const fen = card.fen as string
  const best = sanToPt(uciToSan(fen, card.bestUci ?? null) ?? '')
  const line = useMemo(() => pvToSan(fen, card.pvUci ?? [], 4).map(sanToPt).join(' '), [card.pvUci, fen])
  const side = card.color === 'w' ? 'brancas' : 'pretas'
  const settled = phase === 'found' || phase === 'answer'
  return (
    <section aria-live="polite" className="rounded-md bg-surface p-4">
      <p className="text-sm text-muted">{card.label}</p>
      {phase === 'playing' || phase === 'evaluating' ? (
        <>
          <h2 className="font-book mt-1 text-xl leading-snug font-semibold">Você jogou {sanToPt(card.playedSan ?? '')}. Qual era o melhor lance?</h2>
          <p className="mt-1 text-sm text-muted">{phase === 'evaluating' ? 'O Stockfish está conferindo…' : `Jogue com as ${side}.`}</p>
        </>
      ) : phase === 'wrong' ? (
        <h2 className="font-book mt-1 text-xl leading-snug font-semibold text-(--text-mistake)">{tried ? `${sanToPt(tried.san)} não resolve.` : 'Não é esse.'} Tente outro.</h2>
      ) : phase === 'found' ? (
        <h2 className="font-book mt-1 text-xl leading-snug font-semibold text-(--text-best)">Achou! {tried ? sanToPt(tried.san) : best} resolve.</h2>
      ) : (
        <h2 className="font-book mt-1 text-xl leading-snug font-semibold">O melhor lance era {best}.</h2>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-(--text-blunder)">
          {error}
        </p>
      )}
      {settled && (
        <div className="mt-2 text-sm text-muted">
          {line && <p>Linha: {line}</p>}
          {card.theme && <p>Tema: {THEME_LABEL[card.theme].one}.</p>}
          <p className="mt-1">{phase === 'answer' ? 'Este exercício volta logo.' : 'Quanto mais você acerta, mais tempo ele demora para voltar.'}</p>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {phase === 'wrong' && (
          <button type="button" onClick={exercise.again} autoFocus className="min-h-11 flex-1 rounded-md bg-ink px-4 font-semibold text-bg">
            Tentar de novo
          </button>
        )}
        {(phase === 'playing' || phase === 'wrong' || phase === 'evaluating') && (
          <button type="button" onClick={exercise.reveal} className="min-h-11 flex-1 rounded-md border border-line px-4 font-semibold hover:bg-sunken">
            Ver a resposta
          </button>
        )}
        {settled && (
          <button type="button" autoFocus onClick={onNext} className="min-h-11 flex-1 rounded-md bg-ink px-4 font-semibold text-bg">
            {nextLabel}
          </button>
        )}
        {settled && card.gameKey && (
          <button type="button" onClick={() => navigate(gamePath(card.gameKey as string))} className="min-h-11 flex-1 rounded-md border border-line px-4 font-semibold hover:bg-sunken">
            Ver a partida
          </button>
        )}
      </div>
    </section>
  )
}
