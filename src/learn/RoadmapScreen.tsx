import { defaultPieces } from 'react-chessboard'
import { useKv } from '../data/kv'
import { LESSONS_KEY } from '../guide/repertoire'
import { lessonById } from '../guide/lessons'
import { navigate } from '../route'
import { LEVELS, type Level, type LevelProgress, START_KEY, lessonTitle, roadmapProgress } from './roadmap'

/** A peça que marca o nível. A mesma do tabuleiro, para não depender da fonte do aparelho. */
export function LevelPiece({ piece, className = 'size-10' }: { piece: Level['piece']; className?: string }) {
  const Piece = defaultPieces[`w${piece.toUpperCase()}`]
  return (
    <span aria-hidden="true" className={`block shrink-0 ${className}`}>
      <Piece />
    </span>
  )
}

const lessonPath = (id: string) => `#/aprender/aula/${id}`

function StartChooser({ onChoose }: { onChoose: (level: string) => void }) {
  return (
    <section aria-label="Por onde começar" className="mt-4">
      <h2 className="font-display text-2xl font-semibold">Por onde você quer começar?</h2>
      <p className="mt-1 max-w-prose text-muted">Dá para mudar depois, e as aulas de antes continuam abertas.</p>
      <ul className="mt-3 grid gap-2">
        {LEVELS.map((level) => (
          <li key={level.id}>
            <button type="button" onClick={() => onChoose(level.id)} className="flex min-h-16 w-full items-center gap-3 rounded-md bg-surface p-3 text-left hover:bg-sunken">
              <LevelPiece piece={level.piece} className="size-11" />
              <span className="min-w-0">
                <span className="font-display block text-xl font-semibold">{level.title}</span>
                <span className="block text-sm text-muted">{level.forWhom}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Uma casa do tabuleiro para cada aula: dá para ver o nível inteiro de relance. */
function LevelSquares({ item, done, next }: { item: LevelProgress; done: Set<string>; next: string | null }) {
  const ids = item.level.units.flatMap((unit) => unit.lessons)
  return (
    <div aria-hidden="true" className="mt-2 flex flex-wrap gap-0.5">
      {ids.map((id) => (
        <span key={id} className={`size-3 ${id === next ? 'bg-action' : done.has(id) ? 'bg-(--positive)' : 'bg-(--zone-3)'}`} />
      ))}
    </div>
  )
}

function LevelSection({ item, done, next, current }: { item: LevelProgress; done: Set<string>; next: string | null; current: boolean }) {
  const { level } = item
  return (
    <details open={current} className="group rounded-md bg-surface">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <LevelPiece piece={level.piece} className="size-11" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-display text-xl font-semibold">{level.title}</span>
            <span className="tabular text-sm text-muted">
              {item.complete ? 'Completo' : item.skipped ? 'Pulado por você' : `${item.done} de ${item.total}`}
            </span>
          </span>
          <LevelSquares item={item} done={done} next={next} />
        </span>
      </summary>
      <div className="px-3 pb-3">
        <p className="max-w-prose text-sm text-muted">Ao terminar: {level.goal.charAt(0).toLowerCase() + level.goal.slice(1)}</p>
        {level.units.map((unit) => (
          <div key={unit.title} className="mt-4">
            <h3 className="text-sm font-semibold text-muted">{unit.title}</h3>
            <ol className="mt-1 divide-y divide-line">
              {unit.lessons.map((id) => {
                const isDone = done.has(id)
                const isNext = id === next
                const lesson = lessonById(id)
                const exercises = lesson?.positions.length ?? 0
                return (
                  <li key={id}>
                    <button type="button" onClick={() => navigate(lessonPath(id))} aria-current={isNext ? 'step' : undefined} className="flex min-h-13 w-full items-center gap-3 py-2 text-left hover:bg-sunken">
                      <span aria-hidden="true" className={`flex size-6 shrink-0 items-center justify-center ${isNext ? 'bg-action text-on-action' : isDone ? 'bg-(--positive) text-[#0b0b0d]' : 'bg-(--zone-3)'}`}>
                        {isDone && (
                          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                            <path d="M9.4 18.4 3.6 12.6 5.5 10.7l3.9 3.9 9.1-9.1 1.9 1.9z" />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block leading-snug ${isNext ? 'font-bold' : 'font-semibold'}`}>{lessonTitle(id)}</span>
                        <span className="block text-sm text-muted">
                          {[isDone ? 'Feita' : isNext ? 'A próxima' : '', exercises > 0 ? `${exercises} ${exercises === 1 ? 'exercício' : 'exercícios'}` : '', lesson?.videos?.length ? 'com vídeo' : ''].filter(Boolean).join(', ')}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        ))}
      </div>
    </details>
  )
}

/** O próximo passo: serve na tela do roteiro e na tela inicial. */
export function NextLessonCard({ compact = false }: { compact?: boolean }) {
  const [doneIds, , loadedDone] = useKv<string[]>(LESSONS_KEY, [])
  const [start, , loadedStart] = useKv<string | null>(START_KEY, null)
  if (!loadedDone || !loadedStart) return null
  const progress = roadmapProgress(doneIds, start)
  if (compact && !start && doneIds.length === 0) {
    return (
      <section aria-label="Aprender" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface p-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold">Aprenda no tabuleiro</h2>
          <p className="text-sm text-muted">Um caminho do zero ao avançado, passo a passo.</p>
        </div>
        <button type="button" onClick={() => navigate('#/aprender')} className="min-h-12 w-full shrink-0 rounded-md border border-line px-5 font-semibold hover:bg-sunken sm:w-auto">
          Ver o caminho
        </button>
      </section>
    )
  }
  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  return (
    <section aria-label="Sua evolução" className={`rounded-md bg-surface p-4 ${compact ? 'mt-4' : 'mt-3'}`}>
      <div className="flex items-center gap-3">
        <LevelPiece piece={progress.piece} className="size-14" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl leading-tight font-semibold">{progress.next ? `Nível ${progress.currentLevel.title}` : 'Caminho completo'}</p>
          <p className="tabular text-sm text-muted">
            {progress.done} de {progress.total} aulas, {percent}%
          </p>
        </div>
      </div>
      <div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Aulas feitas" className="mt-3 h-2 w-full bg-(--zone-3)">
        <div className="h-full bg-(--positive)" style={{ width: `${percent}%` }} />
      </div>
      {progress.next ? (
        <button type="button" onClick={() => navigate(lessonPath(progress.next as string))} className="mt-3 min-h-12 w-full rounded-md bg-action px-4 text-left font-semibold text-on-action">
          {progress.done === 0 ? 'Começar' : 'Continuar'}: {lessonTitle(progress.next)}
        </button>
      ) : (
        <p className="mt-3 max-w-prose">Você terminou todas as aulas, chefia. Agora é jogar, rever as partidas e treinar os puzzles.</p>
      )}
    </section>
  )
}

export function Roadmap() {
  const [doneIds, , loadedDone] = useKv<string[]>(LESSONS_KEY, [])
  const [start, setStart, loadedStart] = useKv<string | null>(START_KEY, null)
  const done = new Set(doneIds)
  const progress = roadmapProgress(doneIds, start)
  const choosing = loadedStart && loadedDone && !start && doneIds.length === 0

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:pt-8">
      <h1 className="font-display text-3xl font-semibold">Aprender</h1>
      {choosing ? (
        <StartChooser onChoose={setStart} />
      ) : (
        <>
          <NextLessonCard />
          <div className="mt-4 grid gap-2">
            {progress.levels.map((item) => (
              <LevelSection key={item.level.id} item={item} done={done} next={progress.next} current={item.level.id === progress.currentLevel.id} />
            ))}
          </div>
          <button type="button" onClick={() => setStart(null)} hidden={doneIds.length > 0} className="mt-3 min-h-11 rounded-md px-3 text-sm font-semibold text-muted hover:bg-sunken">
            Mudar o ponto de partida
          </button>
        </>
      )}

      <section className="mt-6 rounded-md bg-surface p-4">
        <h2 className="font-display text-xl font-semibold">Guia de aberturas</h2>
        <p className="mt-1 max-w-prose text-muted">As aberturas explicadas, com treino de lances e o seu repertório.</p>
        <button type="button" onClick={() => navigate('#/guia')} className="mt-3 min-h-12 rounded-md border border-line px-5 font-semibold hover:bg-sunken">
          Abrir o guia
        </button>
      </section>
    </main>
  )
}
