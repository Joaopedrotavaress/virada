import { useEffect, useMemo, useState } from 'react'
import { useKv } from '../data/kv'
import { recordsFor, useAllRecords } from '../data/library'
import { BEST_ARROW_COLOR } from '../components/Board'
import { BoardScreen, PlayableBoard } from '../components/PlayableBoard'
import { useSolution } from '../guide/LessonScreen'
import { goBack, navigate } from '../route'
import { DAILY_KEY, type DailyState, EMPTY_DAILY, afterExercise, dayOf } from '../training/daily'
import { EMPTY_PUZZLE_STATS, LEVELS, PUZZLE_KEY, type Puzzle, type PuzzleStats, THEMES, afterSolved, loadPuzzles, pickPuzzles, puzzleOfDay, suggestedLevel, themeLabel } from './puzzles'

const LAST_MOVE_TINT = 'var(--board-last)'

/** Um puzzle no tabuleiro. Também aparece dentro da sessão de treino. */
export function PuzzleBoard({ puzzle, title, status, nextLabel, onSolved, onNext, onBack = goBack }: { puzzle: Puzzle; title: string; status?: string; nextLabel: string; onSolved: (clean: boolean) => void; onNext: () => void; onBack?: () => void }) {
  const [hadTrouble, setHadTrouble] = useState(false)
  const exercise = useSolution({ fen: puzzle.fen, solution: puzzle.solution }, () => onSolved(!hadTrouble))
  const last = exercise.last ?? puzzle.setup
  const styles = { [last.from]: { backgroundColor: LAST_MOVE_TINT }, [last.to]: { backgroundColor: LAST_MOVE_TINT } }
  const arrows = exercise.expectedStep ? [{ startSquare: exercise.expectedStep.from, endSquare: exercise.expectedStep.to, color: BEST_ARROW_COLOR }] : []
  const done = exercise.status === 'solved' || exercise.status === 'other-solution'
  const side = puzzle.fen.split(' ')[1] === 'w' ? 'brancas' : 'pretas'
  useEffect(() => {
    if (exercise.status === 'wrong' || exercise.expectedStep) setHadTrouble(true)
  }, [exercise.expectedStep, exercise.status])
  return (
    <BoardScreen title={title} status={status} onBack={onBack} board={<PlayableBoard fen={exercise.fen} orientation={puzzle.fen.split(' ')[1] === 'w' ? 'white' : 'black'} canMove={exercise.userTurn} onMove={exercise.play} squareStyles={styles} arrows={arrows} celebrate={done ? last.to : null} />}>
      <section aria-live="polite" className="rounded-md bg-surface p-4">
        {done ? (
          <>
            <h2 className="font-display text-xl font-semibold text-(--text-best)">{hadTrouble ? 'Resolvido.' : 'Resolvido de primeira!'}</h2>
            <p className="mt-1 text-sm text-muted">
              Temas: {puzzle.themes.map(themeLabel).join(', ')}. Dificuldade {puzzle.rating}.
            </p>
            <button type="button" autoFocus onClick={onNext} className="mt-3 min-h-11 w-full rounded-md bg-action px-4 font-semibold text-on-action">
              {nextLabel}
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
            <h2 className="font-display text-xl font-semibold">Jogue de {side}. Qual é o melhor lance?</h2>
            {exercise.status === 'checking' && <p className="mt-1 text-sm text-muted">O Stockfish está conferindo…</p>}
            {exercise.expectedStep ? (
              <p className="mt-1 text-sm text-muted">A seta mostra o lance.</p>
            ) : (
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

export function PuzzleScreen({ theme, username }: { theme?: string; username: string }) {
  const records = recordsFor(useAllRecords(), username)
  const [puzzles, setPuzzles] = useState<Puzzle[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [levelId, setLevelId] = useState(() => suggestedLevel(records))
  const [stats, setStats] = useKv<PuzzleStats>(PUZZLE_KEY, EMPTY_PUZZLE_STATS)
  const [daily, setDaily] = useKv<DailyState>(DAILY_KEY, EMPTY_DAILY)
  const [run, setRun] = useState<{ items: Puzzle[]; index: number; title: string; isDaily?: boolean } | null>(null)
  const today = dayOf(new Date())

  useEffect(() => {
    let alive = true
    loadPuzzles()
      .then((list) => {
        if (alive) setPuzzles(list)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  const start = useMemo(() => {
    if (!puzzles) return null
    return (themeId?: string) => {
      const items = pickPuzzles(puzzles, { theme: themeId, levelId, solved: new Set(stats.solved) })
      if (items.length > 0) setRun({ items, index: 0, title: themeId ? themeLabel(themeId) : 'Puzzles' })
    }
  }, [levelId, puzzles, stats.solved])

  // Vindo de uma lição, já abre o tema.
  useEffect(() => {
    if (theme && start && !run) start(theme)
    // Só ao chegar pelo endereço.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, start === null])

  const ofDay = puzzles ? puzzleOfDay(puzzles, today, levelId) : null

  if (run) {
    const current = run.items[run.index]
    if (current) {
      return (
        // Cobre a barra de navegação: com o tabuleiro em uso, a tela é toda dele.
        <div className="fixed inset-0 z-20 overflow-hidden bg-bg">
        <PuzzleBoard
          key={current.id}
          onBack={() => (theme ? goBack() : setRun(null))}
          puzzle={current}
          title={run.title}
          status={run.items.length > 1 ? `${run.index + 1} de ${run.items.length}` : undefined}
          nextLabel={run.index + 1 < run.items.length ? 'Próximo puzzle' : 'Terminar'}
          onSolved={() => {
            setStats(afterSolved(stats, current.id, run.isDaily ? today : undefined))
            setDaily(afterExercise(daily))
          }}
          onNext={() => {
            if (run.index + 1 < run.items.length) setRun({ ...run, index: run.index + 1 })
            else if (theme) navigate('#/puzzles', { replace: true })
            else setRun(null)
          }}
        />
        </div>
      )
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:pt-8">
      <h1 className="font-display text-3xl font-semibold">Puzzles</h1>
      <p className="mt-1 text-sm text-muted">{stats.solved.length > 0 ? `${stats.solved.length} resolvidos neste aparelho.` : 'Posições tiradas de partidas reais. Funciona sem internet.'}</p>

      <fieldset className="mt-4">
        <legend className="mb-1.5 text-sm font-semibold">Dificuldade</legend>
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-md border border-line bg-line">
          {LEVELS.map((level) => (
            <label key={level.id} className={`flex min-h-11 cursor-pointer items-center justify-center px-1 text-center text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink ${levelId === level.id ? 'bg-action text-on-action' : 'bg-surface'}`}>
              <input type="radio" name="dificuldade" checked={levelId === level.id} onChange={() => setLevelId(level.id)} className="sr-only" />
              {level.label}
            </label>
          ))}
        </div>
      </fieldset>

      {failed && (
        <p role="alert" className="mt-4 font-medium text-(--text-blunder)">
          Não consegui abrir os puzzles. Recarregue a página.
        </p>
      )}

      {ofDay && (
        <section className="mt-4 rounded-md bg-surface p-4">
          <h2 className="font-display text-xl font-semibold">Puzzle do dia</h2>
          <p className="mt-1 text-sm text-muted">{stats.dailyDone === today ? 'Você já resolveu o de hoje. Amanhã tem outro.' : 'Um por dia, escolhido pela data.'}</p>
          <button type="button" onClick={() => setRun({ items: [ofDay], index: 0, title: 'Puzzle do dia', isDaily: true })} className="mt-3 min-h-12 w-full rounded-md bg-action px-5 font-semibold text-on-action sm:w-auto">
            {stats.dailyDone === today ? 'Ver de novo' : 'Resolver'}
          </button>
        </section>
      )}

      {puzzles && (
        <section className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">Por tema</h2>
            <button type="button" onClick={() => start?.()} className="min-h-11 rounded-md border border-line px-4 font-semibold hover:bg-sunken">
              Misturar temas
            </button>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {THEMES.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => start?.(item.id)} className="min-h-12 w-full rounded-md bg-surface px-3 py-2 text-left font-semibold hover:bg-sunken">
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-6 max-w-prose text-sm text-muted">Os puzzles vêm da base aberta do Lichess (CC0).</p>
    </main>
  )
}
