import { Chess } from 'chess.js'
import { useMemo, useRef, useState } from 'react'
import { BEST_ARROW_COLOR } from '../components/Board'
import { BoardScreen, PlayableBoard } from '../components/PlayableBoard'
import { gradeMove } from '../chess/classify'
import { evaluatePosition } from '../chess/evaluate'
import { sanToPt } from '../chess/notation'
import { useKv } from '../data/kv'
import { getEngine } from '../engine/stockfish'
import { goBack, navigate } from '../route'
import { type Lesson, type LessonPosition, lessonById } from './lessons'
import { LESSONS_KEY } from './repertoire'

const FOUND_LOSS = 2
const REPLY_DELAY_MS = 450
const LAST_MOVE_TINT = 'var(--board-last)'

type Status = 'playing' | 'checking' | 'wrong' | 'solved' | 'other-solution'

/** Exercício de solução conhecida. Um lance diferente é conferido pelo Stockfish: se for tão bom quanto, também vale. */
export function useSolution(position: Pick<LessonPosition, 'fen' | 'solution'>, onSolved?: () => void) {
  const [fen, setFen] = useState(position.fen)
  const [cursor, setCursor] = useState(0)
  const [status, setStatus] = useState<Status>('playing')
  const [tried, setTried] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [last, setLast] = useState<{ from: string; to: string } | null>(null)
  const alive = useRef(true)

  const solved = () => {
    onSolved?.()
  }

  const advance = (afterFen: string, nextCursor: number) => {
    if (nextCursor >= position.solution.length) {
      setCursor(nextCursor)
      setStatus('solved')
      solved()
      return
    }
    // Resposta automática do outro lado.
    const reply = new Chess(afterFen).move(position.solution[nextCursor])
    setCursor(nextCursor)
    setTimeout(() => {
      if (!alive.current) return
      setFen(reply.after)
      setLast({ from: reply.from, to: reply.to })
      setCursor(nextCursor + 1)
      if (nextCursor + 1 >= position.solution.length) {
        setStatus('solved')
        solved()
      }
    }, REPLY_DELAY_MS)
  }

  const play = (from: string, to: string, promotion?: string): boolean => {
    if (status !== 'playing') return false
    let move
    try {
      move = new Chess(fen).move({ from, to, promotion })
    } catch {
      return false
    }
    const expected = new Chess(fen).move(position.solution[cursor])
    if (move.lan === expected.lan) {
      setFen(move.after)
      setLast({ from, to })
      setTried(null)
      setRevealed(false)
      advance(move.after, cursor + 1)
      return true
    }
    setTried(sanToPt(move.san))
    if (new Chess(move.after).isCheckmate()) {
      setFen(move.after)
      setLast({ from, to })
      setStatus('solved')
      solved()
      return true
    }
    // Outro caminho pode resolver igualmente.
    setStatus('checking')
    const before = fen
    const engine = getEngine()
    void Promise.all([evaluatePosition(engine, before), evaluatePosition(engine, move.after)])
      .then(([one, two]) => {
        if (!alive.current) return
        const graded = gradeMove(move.lan, move.color, one, two)
        if (graded.isBest || graded.loss < FOUND_LOSS) {
          setFen(move.after)
          setLast({ from, to })
          setStatus('other-solution')
          solved()
        } else {
          setStatus('wrong')
        }
      })
      .catch(() => {
        if (alive.current) setStatus('wrong')
      })
    return false
  }

  const expectedStep = useMemo(() => {
    if (!revealed || cursor >= position.solution.length) return null
    try {
      return new Chess(fen).move(position.solution[cursor])
    } catch {
      return null
    }
  }, [cursor, fen, position.solution, revealed])

  return {
    fen,
    last,
    status,
    tried,
    userTurn: status === 'playing' && cursor % 2 === 0 && new Chess(fen).turn() === new Chess(position.fen).turn(),
    expectedStep,
    play,
    again: () => setStatus('playing'),
    reveal: () => {
      setRevealed(true)
      setStatus('playing')
    },
    dispose: () => {
      alive.current = false
    },
  }
}

function PositionExercise({ lesson, position, index, onNext }: { lesson: Lesson; position: LessonPosition; index: number; onNext: () => void }) {
  const exercise = useSolution(position)
  const styles = exercise.last ? { [exercise.last.from]: { backgroundColor: LAST_MOVE_TINT }, [exercise.last.to]: { backgroundColor: LAST_MOVE_TINT } } : undefined
  const arrows = exercise.expectedStep ? [{ startSquare: exercise.expectedStep.from, endSquare: exercise.expectedStep.to, color: BEST_ARROW_COLOR }] : []
  const done = exercise.status === 'solved' || exercise.status === 'other-solution'
  const orientation = position.fen.split(' ')[1] === 'w' ? 'white' : 'black'
  const hasNext = index + 1 < lesson.positions.length
  return (
    <BoardScreen title={lesson.title} status={lesson.positions.length > 1 ? `${index + 1} de ${lesson.positions.length}` : undefined} onBack={goBack} board={<PlayableBoard fen={exercise.fen} orientation={orientation} canMove={exercise.userTurn} onMove={exercise.play} squareStyles={styles} arrows={arrows} celebrate={done && exercise.last ? exercise.last.to : null} />}>
      <section aria-live="polite" className="rounded-md bg-surface p-4">
        {done ? (
          <>
            <h2 className="font-display text-xl font-semibold text-(--text-best)">{exercise.status === 'other-solution' ? 'Também resolve!' : 'Isso!'}</h2>
            <p className="mt-1 max-w-prose text-base leading-relaxed">{position.after}</p>
            <button type="button" autoFocus onClick={onNext} className="mt-3 min-h-11 w-full rounded-md bg-action px-4 font-semibold text-on-action">
              {hasNext ? 'Próximo exercício' : 'Terminar a lição'}
            </button>
          </>
        ) : exercise.status === 'wrong' ? (
          <>
            <h2 className="font-display text-xl font-semibold text-(--text-mistake)">{exercise.tried} não resolve.</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" autoFocus onClick={exercise.again} className="min-h-11 flex-1 rounded-md bg-action px-4 font-semibold whitespace-nowrap text-on-action">
                Tentar de novo
              </button>
              <button type="button" onClick={exercise.reveal} className="min-h-11 flex-1 rounded-md border border-line px-4 font-semibold whitespace-nowrap hover:bg-sunken">
                Mostrar o lance
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl leading-snug font-semibold">{position.prompt}</h2>
            {exercise.status === 'checking' && <p className="mt-1 text-sm text-muted">O Stockfish está conferindo…</p>}
            {exercise.expectedStep && <p className="mt-1 text-sm text-muted">A seta mostra o lance.</p>}
            {!exercise.expectedStep && (
              <button type="button" onClick={exercise.reveal} className="mt-3 min-h-11 rounded-md border border-line px-4 font-semibold hover:bg-sunken">
                Mostrar o lance
              </button>
            )}
          </>
        )}
      </section>
    </BoardScreen>
  )
}

export function LessonScreen({ id }: { id: string }) {
  const lesson = lessonById(id)
  const [step, setStep] = useState(-1)
  const [done, setDone] = useKv<string[]>(LESSONS_KEY, [])

  if (!lesson) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="font-display text-3xl font-semibold">Lição não encontrada</h1>
        <button type="button" onClick={() => navigate('#/guia', { replace: true })} className="mt-4 min-h-12 w-full rounded-md bg-action font-semibold text-on-action">
          Abrir o guia
        </button>
      </main>
    )
  }

  const finish = () => {
    if (!done.includes(lesson.id)) setDone([...done, lesson.id])
    setStep(lesson.positions.length)
  }
  const position = step >= 0 ? lesson.positions[step] : undefined
  if (position) {
    return <PositionExercise key={step} lesson={lesson} position={position} index={step} onNext={() => (step + 1 < lesson.positions.length ? setStep(step + 1) : finish())} />
  }

  const finished = step >= lesson.positions.length && step !== -1
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-2 pb-10 lg:pt-6">
      <button type="button" onClick={goBack} className="-ml-1 flex min-h-11 items-center gap-1 rounded-md pr-3 pl-1 font-semibold hover:bg-sunken">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="currentColor">
          <path d="M15.4 6.4 14 5l-7 7 7 7 1.4-1.4L9.8 12z" />
        </svg>
        Voltar
      </button>
      <h1 className="font-display mt-1 text-3xl font-semibold">{lesson.title}</h1>
      {finished && <p className="mt-2 rounded-md bg-surface p-3 font-semibold text-(--text-best)">Lição concluída.</p>}
      {lesson.paragraphs.map((paragraph) => (
        <p key={paragraph} className="mt-3 max-w-prose text-lg leading-relaxed">
          {paragraph}
        </p>
      ))}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {lesson.positions.length > 0 && (
          <button type="button" onClick={() => setStep(0)} className="min-h-12 rounded-md bg-action px-5 font-semibold text-on-action">
            {finished ? 'Fazer de novo' : lesson.positions.length === 1 ? 'Fazer o exercício' : `Fazer os ${lesson.positions.length} exercícios`}
          </button>
        )}
        {lesson.puzzleTheme && (
          <button
            type="button"
            onClick={() => {
              if (lesson.positions.length === 0 && !done.includes(lesson.id)) setDone([...done, lesson.id])
              navigate(`#/puzzles/${lesson.puzzleTheme}`)
            }}
            className={`min-h-12 rounded-md px-5 font-semibold ${lesson.positions.length === 0 ? 'bg-action text-on-action' : 'border border-line hover:bg-sunken'}`}
          >
            Praticar com puzzles
          </button>
        )}
      </div>
    </main>
  )
}
