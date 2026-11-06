import { Chess } from 'chess.js'
import { useMemo, useRef, useState } from 'react'
import { BEST_ARROW_COLOR } from '../components/Board'
import { BoardScreen, PlayableBoard } from '../components/PlayableBoard'
import { Professor } from '../components/Professor'
import { gradeMove } from '../chess/classify'
import { evaluatePosition } from '../chess/evaluate'
import { sanToPt } from '../chess/notation'
import { useKv } from '../data/kv'
import { getEngine } from '../engine/stockfish'
import { DemoBoard, DemoPanel, orientationOf, useDemo } from '../learn/Demo'
import { lessonAfter, levelOfLesson } from '../learn/roadmap'
import { VideoCard } from '../learn/VideoCard'
import { goBack, navigate } from '../route'
import { type Lesson, type LessonPosition, lessonById } from './lessons'
import { LESSONS_KEY } from './repertoire'

const FOUND_LOSS = 2
const REPLY_DELAY_MS = 450
const LAST_MOVE_TINT = 'var(--board-last)'
const TARGET_TINT = 'var(--mark-focus)'

type Status = 'playing' | 'checking' | 'wrong' | 'solved' | 'other-solution'

/** Exercício de solução conhecida. Um lance diferente é conferido pelo Stockfish: se for tão bom quanto, também vale. */
export function useSolution(position: Pick<LessonPosition, 'fen' | 'solution' | 'strict'>, onSolved?: () => void) {
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
    // Treino de movimento: só o lance pedido vale.
    if (position.strict) {
      setStatus('wrong')
      return false
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
  const marks = Object.fromEntries((exercise.last ? [] : (position.marks ?? [])).map((square) => [square, { backgroundColor: TARGET_TINT }]))
  const styles = exercise.last ? { [exercise.last.from]: { backgroundColor: LAST_MOVE_TINT }, [exercise.last.to]: { backgroundColor: LAST_MOVE_TINT } } : marks
  const arrows = exercise.expectedStep ? [{ startSquare: exercise.expectedStep.from, endSquare: exercise.expectedStep.to, color: BEST_ARROW_COLOR }] : []
  const done = exercise.status === 'solved' || exercise.status === 'other-solution'
  const hasNext = index + 1 < lesson.positions.length
  return (
    <BoardScreen title={lesson.title} status={lesson.positions.length > 1 ? `Exercício ${index + 1} de ${lesson.positions.length}` : 'Exercício'} onBack={goBack} board={<PlayableBoard fen={exercise.fen} orientation={orientationOf(position.fen)} canMove={exercise.userTurn} onMove={exercise.play} squareStyles={styles} arrows={arrows} celebrate={done && exercise.last ? exercise.last.to : null} />}>
      <section aria-live="polite" className="rounded-md bg-surface p-4">
        {done ? (
          <>
            <h2 className="font-display text-xl font-semibold text-(--positive)">{exercise.status === 'other-solution' ? 'Também resolve!' : 'Isso!'}</h2>
            <p className="mt-1 max-w-prose text-base leading-relaxed">{position.after}</p>
            <button type="button" autoFocus onClick={onNext} className="mt-3 min-h-11 w-full rounded-md bg-action px-4 font-semibold text-on-action">
              {hasNext ? 'Próximo exercício' : 'Terminar a aula'}
            </button>
          </>
        ) : exercise.status === 'wrong' ? (
          <>
            <h2 className="font-display text-xl font-semibold text-(--text-mistake)">{exercise.tried} não resolve.</h2>
            <p className="mt-1 max-w-prose text-base leading-relaxed">{position.prompt}</p>
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

function DemoStage({ lesson, onFinish }: { lesson: Lesson; onFinish: () => void }) {
  const frames = lesson.frames ?? []
  const demo = useDemo(frames)
  const firstFen = frames[0].fen as string
  const practices = lesson.positions.length
  return (
    <BoardScreen title={lesson.title} status="Veja" onBack={goBack} board={<DemoBoard demo={demo} orientation={orientationOf(firstFen)} />}>
      <DemoPanel demo={demo} onFinish={onFinish} finishLabel={practices > 0 ? 'Agora é com você' : 'Terminar a aula'} />
      {demo.atEnd && lesson.videos?.[0] && (
        <div className="grid gap-2">
          <h2 className="text-sm font-semibold text-muted">Prefere ver em vídeo?</h2>
          {lesson.videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </BoardScreen>
  )
}

function Finished({ lesson, onAgain }: { lesson: Lesson; onAgain: () => void }) {
  const nextId = lessonAfter(lesson.id)
  const nextLesson = nextId ? lessonById(nextId) : undefined
  const level = levelOfLesson(lesson.id)
  const nextLevel = nextId ? levelOfLesson(nextId) : undefined
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-10 lg:pt-8">
      <p className="font-semibold text-(--positive)">Aula concluída</p>
      <h1 className="font-display mt-1 text-3xl font-semibold">{lesson.title}</h1>
      {lesson.takeaway && (
        <div className="mt-4">
          <Professor say={lesson.takeaway} mood="feliz" large>
            <p className="rounded-md bg-surface p-3 text-lg leading-snug">{lesson.takeaway}</p>
          </Professor>
        </div>
      )}
      {level && nextLevel && level.id !== nextLevel.id && <p className="mt-4 rounded-md bg-surface p-3 font-semibold">Você terminou a última aula do nível {level.title}. Agora vem o {nextLevel.title}.</p>}
      <div className="mt-5 flex flex-col gap-2">
        {nextLesson && (
          <button type="button" autoFocus onClick={() => navigate(`#/aprender/aula/${nextLesson.id}`, { replace: true })} className="min-h-12 rounded-md bg-action px-5 text-left font-semibold text-on-action">
            Próxima aula: {nextLesson.title}
          </button>
        )}
        {lesson.link && (
          <button type="button" onClick={() => navigate((lesson.link as { path: string }).path)} className={`min-h-12 rounded-md px-5 text-left font-semibold ${nextLesson ? 'border border-line hover:bg-sunken' : 'bg-action text-on-action'}`}>
            {lesson.link.label}
          </button>
        )}
        {lesson.puzzleTheme && (
          <button type="button" onClick={() => navigate(`#/puzzles/${lesson.puzzleTheme}`)} className="min-h-12 rounded-md border border-line px-5 text-left font-semibold hover:bg-sunken">
            Praticar com puzzles deste tema
          </button>
        )}
        <button type="button" onClick={onAgain} className="min-h-12 rounded-md border border-line px-5 text-left font-semibold hover:bg-sunken">
          Ver a aula de novo
        </button>
        <button type="button" onClick={() => navigate('#/aprender')} className="min-h-12 rounded-md border border-line px-5 text-left font-semibold hover:bg-sunken">
          Voltar ao caminho
        </button>
      </div>
      {lesson.videos?.[0] && (
        <section className="mt-6 grid gap-2">
          <h2 className="font-display text-xl font-semibold">Para ver em vídeo</h2>
          {lesson.videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </section>
      )}
    </main>
  )
}

/** Veja, faça, leve: primeiro o exemplo resolvido, depois a prática. */
export function LessonScreen({ id }: { id: string }) {
  const lesson = lessonById(id)
  const [stage, setStage] = useState<'demo' | number | 'finished'>('demo')
  const [done, setDone] = useKv<string[]>(LESSONS_KEY, [])

  if (!lesson) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="font-display text-3xl font-semibold">Aula não encontrada</h1>
        <button type="button" onClick={() => navigate('#/aprender', { replace: true })} className="mt-4 min-h-12 w-full rounded-md bg-action font-semibold text-on-action">
          Abrir o caminho
        </button>
      </main>
    )
  }

  const finish = () => {
    if (!done.includes(lesson.id)) setDone([...done, lesson.id])
    setStage('finished')
  }

  if (stage === 'finished') return <Finished lesson={lesson} onAgain={() => setStage('demo')} />
  if (typeof stage === 'number') {
    return <PositionExercise key={stage} lesson={lesson} position={lesson.positions[stage]} index={stage} onNext={() => (stage + 1 < lesson.positions.length ? setStage(stage + 1) : finish())} />
  }
  return <DemoStage lesson={lesson} onFinish={() => (lesson.positions.length > 0 ? setStage(0) : finish())} />
}
