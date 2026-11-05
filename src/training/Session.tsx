import { useEffect, useMemo, useRef, useState } from 'react'
import { BEST_ARROW_COLOR } from '../components/Board'
import { BoardScreen, PlayableBoard } from '../components/PlayableBoard'
import type { ErrorTheme } from '../chess/digest'
import { formatLinePt } from '../chess/notation'
import { useKv } from '../data/kv'
import { THEME_LABEL } from '../data/stats'
import { goBack, navigate } from '../route'
import { type Answer, type TrainingCard, answerCard, loadCards, saveCards } from './cards'
import { DAILY_GOAL, DAILY_KEY, type DailyState, EMPTY_DAILY, afterExercise, pickSession } from './daily'
import { ErrorExercise, ErrorPanel, useErrorExercise } from './ErrorExercise'
import { useLine } from './useLine'
import { PuzzleBoard } from '../puzzles/PuzzleScreen'
import { EMPTY_PUZZLE_STATS, PUZZLE_KEY, type Puzzle, type PuzzleStats, afterSolved, loadPuzzles, pickPuzzles, suggestedLevel } from '../puzzles/puzzles'
import { allRecords } from '../data/library'

/** Com poucos erros para rever, puzzles completam a sessão até este tamanho. */
const SESSION_MINIMUM = 5

const LAST_MOVE_TINT = 'var(--board-last)'
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

interface ItemProps {
  card: TrainingCard
  title: string
  status: string
  nextLabel: string
  onAnswered: (answer: Answer) => void
  onNext: () => void
}

function ErrorItem({ card, title, status, nextLabel, onAnswered, onNext }: ItemProps) {
  const exercise = useErrorExercise(card, onAnswered)
  return (
    <BoardScreen title={title} status={status} onBack={goBack} board={<ErrorExercise card={card} exercise={exercise} orientation={card.color === 'w' ? 'white' : 'black'} />}>
      <ErrorPanel card={card} exercise={exercise} nextLabel={nextLabel} onNext={onNext} />
    </BoardScreen>
  )
}

function LineItem({ card, title, status, nextLabel, onAnswered, onNext }: ItemProps) {
  const sans = useMemo(() => card.sans ?? [], [card.sans])
  const line = useLine({ sans, color: card.color, onFinished: (errors) => onAnswered(errors === 0 ? 'good' : errors === 1 ? 'hard' : 'again') })
  const styles = line.lastStep ? { [line.lastStep.from]: { backgroundColor: LAST_MOVE_TINT }, [line.lastStep.to]: { backgroundColor: LAST_MOVE_TINT } } : undefined
  const arrows = line.shownStep ? [{ startSquare: line.shownStep.from, endSquare: line.shownStep.to, color: BEST_ARROW_COLOR }] : []
  return (
    <BoardScreen title={title} status={status} onBack={goBack} board={<PlayableBoard fen={line.fen} orientation={card.color === 'w' ? 'white' : 'black'} canMove={line.userTurn} onMove={line.play} squareStyles={styles} arrows={arrows} celebrate={line.done && line.lastStep ? line.lastStep.to : null} />}>
      <section aria-live="polite" className="rounded-md bg-surface p-4">
        <p className="text-sm text-muted">{card.label}</p>
        {line.done ? (
          <h2 className="font-display mt-1 text-xl font-semibold text-(--text-best)">{line.errors === 0 ? 'Linha completa, sem erros!' : `Linha completa, com ${line.errors} ${line.errors === 1 ? 'erro' : 'erros'}.`}</h2>
        ) : line.wrong ? (
          <h2 className="font-display mt-1 text-xl font-semibold text-(--text-mistake)">{line.wrong} não é o lance desta linha. Tente outro.</h2>
        ) : (
          <h2 className="font-display mt-1 text-xl font-semibold">{line.userTurn ? 'Qual é o próximo lance da linha?' : 'O outro lado responde…'}</h2>
        )}
        {line.shownStep && <p className="mt-1 text-sm text-muted">A seta mostra o lance.</p>}
        <p className="mt-2 text-base leading-relaxed">{line.cursor > 0 ? formatLinePt(START_FEN, sans.slice(0, line.cursor)) : ' '}</p>
        {line.done && (
          <button type="button" autoFocus onClick={onNext} className="mt-3 min-h-11 w-full rounded-md bg-action px-4 font-semibold text-on-action">
            {nextLabel}
          </button>
        )}
      </section>
    </BoardScreen>
  )
}

/** A sessão do dia: os exercícios que venceram, um de cada vez. */
export function Session({ theme }: { theme?: string }) {
  const [items, setItems] = useState<(TrainingCard | Puzzle)[] | null>(null)
  const [puzzleStats, setPuzzleStats] = useKv<PuzzleStats>(PUZZLE_KEY, EMPTY_PUZZLE_STATS)
  const puzzleStatsRef = useRef(puzzleStats)
  puzzleStatsRef.current = puzzleStats
  const [remaining, setRemaining] = useState(0)
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<Answer[]>([])
  const [daily, setDaily, dailyLoaded] = useKv<DailyState>(DAILY_KEY, EMPTY_DAILY)
  const dailyRef = useRef(daily)
  dailyRef.current = daily
  const validTheme = theme && theme in THEME_LABEL ? (theme as ErrorTheme) : undefined

  useEffect(() => {
    let alive = true
    void loadCards()
      .catch(() => [] as TrainingCard[])
      .then((cards) => {
        if (!alive) return
        const now = Date.now()
        const live = cards.filter((card) => !card.deletedAt)
        // Treinando um tema, vale praticar mesmo o que ainda não venceu.
        const pool = validTheme ? live.filter((card) => card.theme === validTheme) : live.filter((card) => new Date(card.schedule.due).getTime() <= now)
        const pick = pickSession(pool, DAILY_GOAL)
        setRemaining(pick.remaining)
        if (validTheme || pick.items.length >= SESSION_MINIMUM) {
          setItems(pick.items)
          return
        }
        void loadPuzzles()
          .then((puzzles) => pickPuzzles(puzzles, { levelId: suggestedLevel(allRecords()), solved: new Set(puzzleStatsRef.current.solved), limit: SESSION_MINIMUM - pick.items.length }))
          .catch(() => [] as Puzzle[])
          .then((extra) => {
            if (alive) setItems([...pick.items, ...extra])
          })
      })
    return () => {
      alive = false
    }
  }, [validTheme])

  const onAnswered = (card: TrainingCard, answer: Answer) => {
    setResults((list) => [...list, answer])
    void saveCards([answerCard(card, answer)]).catch(() => undefined)
    setDaily(afterExercise(dailyRef.current))
  }

  if (items === null || !dailyLoaded) {
    return (
      <p role="status" className="p-6 text-muted">
        Preparando os exercícios…
      </p>
    )
  }

  const heading = validTheme ? `Treino: ${THEME_LABEL[validTheme].many}` : 'Sessão de hoje'
  if (items.length === 0 || index >= items.length) {
    const right = results.filter((answer) => answer === 'good' || answer === 'easy' || answer === 'hard').length
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 p-6">
        {items.length === 0 ? (
          <>
            <h1 className="font-display text-3xl font-semibold">Nada para treinar agora</h1>
            <p className="text-muted">Os exercícios saem dos erros graves nas partidas analisadas. Quando houver novos, ou quando os antigos vencerem, eles aparecem aqui.</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold">Sessão completa</h1>
            <p className="text-lg">
              Você acertou {right} de {results.length}.
            </p>
            <p className="text-muted">
              {daily.streak >= 2 ? `${daily.streak} dias seguidos de treino. ` : ''}
              {remaining > 0 ? `Ainda há ${remaining} ${remaining === 1 ? 'exercício' : 'exercícios'} para outra hora.` : 'Os que você errou voltam logo; os que acertou, mais tarde.'}
            </p>
          </>
        )}
        <button type="button" onClick={() => navigate('#/treino', { replace: true })} className="mt-2 min-h-12 rounded-md bg-action px-5 font-semibold text-on-action">
          Voltar ao treino
        </button>
      </main>
    )
  }

  const item = items[index]
  if ('solution' in item) {
    return (
      <PuzzleBoard
        key={item.id}
        puzzle={item}
        title={heading}
        status={`${index + 1} de ${items.length}`}
        nextLabel={index + 1 < items.length ? 'Próximo' : 'Terminar'}
        onSolved={(clean) => {
          setResults((list) => [...list, clean ? 'good' : 'again'])
          setPuzzleStats(afterSolved(puzzleStatsRef.current, item.id))
          setDaily(afterExercise(dailyRef.current))
        }}
        onNext={() => setIndex((value) => value + 1)}
      />
    )
  }
  const card = item
  const Item = card.kind === 'line' ? LineItem : ErrorItem
  return (
    <Item
      key={card.id}
      card={card}
      title={heading}
      status={`${index + 1} de ${items.length}`}
      nextLabel={index + 1 < items.length ? 'Próximo' : 'Terminar'}
      onAnswered={(answer) => onAnswered(card, answer)}
      onNext={() => setIndex((value) => value + 1)}
    />
  )
}
