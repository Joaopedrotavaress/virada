import { Chess } from 'chess.js'
import { useEffect, useMemo, useState } from 'react'
import { BEST_ARROW_COLOR } from '../components/Board'
import type { StartPoint } from '../components/BotSetup'
import { Board } from '../components/Board'
import { Icon } from '../components/Icons'
import { BoardScreen, PlayableBoard } from '../components/PlayableBoard'
import type { Color } from '../chess/evaluation'
import { formatLinePt, sanToPt } from '../chess/notation'
import { useKv } from '../data/kv'
import { recordsFor, useAllRecords } from '../data/library'
import { goBack, navigate } from '../route'
import { type TrainingCard, lineCard, loadCards, saveCards } from '../training/cards'
import { useLine } from '../training/useLine'
import { FAMILY_GROUPS, type OpeningFamily, filterFamilies, filterGuides, loadFamilies } from './catalog'
import { LESSONS, LESSON_GROUPS } from './lessons'
import { OPENING_GUIDES, guideBySlug, splitSans } from './openings'
import { LESSONS_KEY, REPERTOIRE_KEY, type Repertoire, progressOf, recordLineDone, toggleRepertoire, usageByGuide, usageSentence } from './repertoire'
import { GROUP_LABEL, type GuideGroup, type OpeningGuide } from './types'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const LAST_MOVE_TINT = 'var(--board-last)'
const LEVEL_ORDER = { iniciante: 0, intermediário: 1, avançado: 2 }

function BackLink({ label = 'Voltar' }: { label?: string }) {
  return (
    <button type="button" onClick={goBack} className="-ml-1 flex min-h-11 items-center gap-1 rounded-md pr-3 pl-1 font-semibold hover:bg-sunken">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="currentColor">
        <path d="M15.4 6.4 14 5l-7 7 7 7 1.4-1.4L9.8 12z" />
      </svg>
      {label}
    </button>
  )
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-sunken">
      <div className="h-full rounded-full bg-ink" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  )
}

/** Passeia por uma sequência de lances com os botões, sem precisar jogar. */
function LineViewer({ moves, orientation, children }: { moves: string[]; orientation: 'white' | 'black'; children?: React.ReactNode }) {
  const [cursor, setCursor] = useState(moves.length)
  useEffect(() => setCursor(moves.length), [moves])
  const steps = useMemo(() => {
    const chess = new Chess()
    return moves.map((san) => {
      const move = chess.move(san)
      return { fen: move.after, from: move.from, to: move.to }
    })
  }, [moves])
  const step = cursor > 0 ? steps[cursor - 1] : null
  const styles = step ? { [step.from]: { backgroundColor: LAST_MOVE_TINT }, [step.to]: { backgroundColor: LAST_MOVE_TINT } } : undefined
  const button = 'flex min-h-11 flex-1 items-center justify-center rounded-md bg-surface font-semibold hover:bg-sunken disabled:opacity-35'
  return (
    <div>
      <Board fen={step?.fen ?? START_FEN} orientation={orientation} squareStyles={styles} />
      <div className="mt-1.5 flex gap-1.5">
        <button type="button" className={button} onClick={() => setCursor(0)} disabled={cursor === 0} aria-label="Ir para o início">
          <Icon name="first" />
        </button>
        <button type="button" className={button} onClick={() => setCursor((value) => Math.max(0, value - 1))} disabled={cursor === 0} aria-label="Lance anterior">
          <Icon name="previous" />
        </button>
        <button type="button" className={button} onClick={() => setCursor((value) => Math.min(moves.length, value + 1))} disabled={cursor === moves.length} aria-label="Próximo lance">
          <Icon name="next" />
        </button>
        <button type="button" className={button} onClick={() => setCursor(moves.length)} disabled={cursor === moves.length} aria-label="Ir para o fim">
          <Icon name="last" />
        </button>
      </div>
      {/* Toque num lance para ver a posição. */}
      <ol className="mt-2 flex flex-wrap gap-x-1.5 text-base leading-relaxed" aria-label="Lances">
        {moves.map((san, index) => (
          <li key={index}>
            {index % 2 === 0 && <span className="tabular text-sm text-muted">{index / 2 + 1}.</span>}{' '}
            <button type="button" onClick={() => setCursor(index + 1)} aria-current={cursor === index + 1 ? 'step' : undefined} className={`rounded-sm px-0.5 ${cursor === index + 1 ? 'bg-ink text-bg' : 'hover:bg-sunken'}`}>
              {sanToPt(san)}
            </button>
          </li>
        ))}
      </ol>
      {children}
    </div>
  )
}

// ---------- Tela inicial do guia ----------

export function GuideHome({ username }: { username: string }) {
  const [families, setFamilies] = useState<OpeningFamily[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'all' | 'gambits' | 'systems' | 'guide'>('all')
  const [repertoire] = useKv<Repertoire>(REPERTOIRE_KEY, {})
  const [lessonsDone] = useKv<string[]>(LESSONS_KEY, [])
  const records = recordsFor(useAllRecords(), username)
  const usage = useMemo(() => usageByGuide(records).slice(0, 3), [records])

  useEffect(() => {
    let alive = true
    loadFamilies()
      .then((list) => {
        if (alive) setFamilies(list)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  const visible = useMemo(() => (families ? filterFamilies(families, { query, kind }) : []), [families, kind, query])
  const searching = query.trim() !== '' || kind !== 'all'
  const matchedGuides = useMemo(() => filterGuides(query), [query])
  const groups = useMemo(() => (Object.keys(GROUP_LABEL) as GuideGroup[]).map((group) => ({ group, guides: OPENING_GUIDES.filter((guide) => guide.group === group).sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]) })), [])
  const myGuides = Object.keys(repertoire).flatMap((slug) => guideBySlug(slug) ?? [])

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pt-4 pb-10 lg:pt-8">
      <h1 className="font-display text-3xl font-semibold">Guia</h1>
      <p className="mt-1 max-w-prose text-muted">Aberturas, defesas e lições, escritas para quem joga no clube. Todo lance citado passou pelas regras e pelo Stockfish. Nas decisões de plano, um professor ou jogador forte ainda enxerga mais.</p>

      {myGuides.length > 0 && (
        <section className="mt-5">
          <h2 className="font-display text-xl font-semibold">Meu repertório</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {myGuides.map((guide) => {
              const progress = progressOf(repertoire[guide.slug], guide)
              return (
                <li key={guide.slug}>
                  <button type="button" onClick={() => navigate(`#/guia/abertura/${guide.slug}`)} className="w-full rounded-md bg-surface p-3 text-left hover:bg-sunken">
                    <span className="block font-semibold">{guide.name}</span>
                    <span className="block text-sm text-muted">{guide.side === 'w' ? 'De brancas' : 'De pretas'}, {Math.round(progress * 100)}% das linhas praticadas</span>
                    <ProgressBar value={progress} label={`${Math.round(progress * 100)}% das linhas praticadas`} />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {usage.length > 0 && (
        <section className="mt-5 rounded-md bg-surface p-4">
          <h2 className="font-display text-xl font-semibold">O que você mais joga</h2>
          <ul className="mt-2 divide-y divide-line">
            {usage.map((item) => (
              <li key={`${item.guide.slug}-${item.color}`}>
                <button type="button" onClick={() => navigate(`#/guia/abertura/${item.guide.slug}`)} className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left hover:bg-sunken">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{item.guide.name}</span>
                    <span className="block text-sm text-muted">{item.color === 'w' ? 'De brancas' : 'De pretas'}, {item.totals.games} {item.totals.games === 1 ? 'partida' : 'partidas'}</span>
                  </span>
                  <span className="tabular shrink-0 font-semibold">{item.totals.score === null ? '–' : `${item.totals.score.toFixed(0)}%`}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => navigate('#/guia/minhas')} className="mt-2 min-h-11 font-semibold underline">
            Ver todas as suas aberturas
          </button>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold">Procurar abertura ou defesa</h2>
        <label htmlFor="busca-aberturas" className="sr-only">
          Nome da abertura, variante ou código ECO
        </label>
        <input id="busca-aberturas" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Siciliana, Najdorf, B90…" className="mt-2 min-h-12 w-full rounded-md border border-line bg-surface px-3 text-base" />
        <div role="group" aria-label="Tipo" className="mt-2 flex flex-wrap gap-1.5">
          {(
            [
              ['all', 'Todas'],
              ['guide', 'Com explicação'],
              ['gambits', 'Gambitos'],
              ['systems', 'Sistemas'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id)} className={`min-h-10 rounded-sm px-4 text-sm font-semibold ${kind === id ? 'bg-ink text-bg' : 'bg-surface hover:bg-sunken'}`}>
              {label}
            </button>
          ))}
        </div>
        {failed && (
          <p role="alert" className="mt-3 font-medium text-(--text-blunder)">
            Não consegui abrir a base de aberturas. Recarregue a página.
          </p>
        )}
        {searching && families && (
          <>
            {matchedGuides.length > 0 && (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {matchedGuides.map((guide) => (
                  <li key={guide.slug}>
                    <button type="button" onClick={() => navigate(`#/guia/abertura/${guide.slug}`)} className="h-full min-h-16 w-full rounded-md bg-surface p-3 text-left hover:bg-sunken">
                      <span className="block font-semibold">{guide.name}</span>
                      <span className="block text-sm text-muted">Com explicação, {guide.side === 'w' ? 'de brancas' : 'de pretas'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-sm text-muted">
              {visible.length} {visible.length === 1 ? 'família' : 'famílias'}
            </p>
            {FAMILY_GROUPS.map(({ id, title }) => {
              const list = visible.filter((family) => family.group === id)
              if (list.length === 0) return null
              return (
                <div key={id} className="mt-3">
                  <h3 className="font-semibold">{title}</h3>
                  <ul className="mt-1 divide-y divide-line overflow-hidden rounded-md bg-surface">
                    {list.slice(0, 30).map((family) => (
                      <li key={family.id}>
                        <button type="button" onClick={() => navigate(`#/guia/familia/${family.id}`)} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-sunken">
                          <span className="min-w-0 truncate font-semibold">{family.name}</span>
                          <span className="tabular shrink-0 text-sm text-muted">{family.variants.length === 1 ? '1 linha' : `${family.variants.length} linhas`}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {list.length > 30 && <p className="mt-1 text-sm text-muted">Mais {list.length - 30}. Refine a busca para ver.</p>}
                </div>
              )
            })}
          </>
        )}
      </section>

      {!searching && (
        <>
          {groups.map(({ group, guides }) => (
            <section key={group} className="mt-6">
              <h2 className="font-display text-xl font-semibold">{GROUP_LABEL[group].title}</h2>
              <p className="text-sm text-muted">{GROUP_LABEL[group].moves}</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {guides.map((guide) => (
                  <li key={guide.slug}>
                    <button type="button" onClick={() => navigate(`#/guia/abertura/${guide.slug}`)} className="h-full min-h-16 w-full rounded-md bg-surface p-3 text-left hover:bg-sunken">
                      <span className="block font-semibold">{guide.name}</span>
                      <span className="block text-sm text-muted">
                        {guide.side === 'w' ? 'De brancas' : 'De pretas'}, {guide.level}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="mt-8">
            <h2 className="font-display text-2xl font-semibold">Lições</h2>
            {LESSON_GROUPS.map((group) => (
              <div key={group.id} className="mt-3">
                <h3 className="font-display text-lg font-semibold">{group.title}</h3>
                <ul className="mt-1 divide-y divide-line overflow-hidden rounded-md bg-surface">
                  {LESSONS.filter((lesson) => lesson.group === group.id).map((lesson) => (
                    <li key={lesson.id}>
                      <button type="button" onClick={() => navigate(`#/guia/licao/${lesson.id}`)} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-sunken">
                        <span className="min-w-0 font-semibold">{lesson.title}</span>
                        {lessonsDone.includes(lesson.id) && <span className="shrink-0 text-sm font-semibold text-(--positive)">Feita</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  )
}

// ---------- Página de uma abertura ----------

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-1 flex max-w-prose list-disc flex-col gap-1.5 pl-5 text-base leading-relaxed">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export function OpeningPage({ slug, username, onPlayFrom }: { slug: string; username: string; onPlayFrom: (start: StartPoint) => void }) {
  const guide = guideBySlug(slug)
  const [selected, setSelected] = useState(0)
  const [trapOpen, setTrapOpen] = useState<number | null>(null)
  const [repertoire, setRepertoire] = useKv<Repertoire>(REPERTOIRE_KEY, {})
  const records = recordsFor(useAllRecords(), username)
  const usage = useMemo(() => usageByGuide(records).filter((item) => item.guide.slug === slug), [records, slug])

  if (!guide) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="font-display text-3xl font-semibold">Abertura não encontrada</h1>
        <button type="button" onClick={() => navigate('#/guia', { replace: true })} className="mt-4 min-h-12 w-full rounded-md bg-action font-semibold text-on-action">
          Abrir o guia
        </button>
      </main>
    )
  }

  const line = guide.lines[selected]
  const moves = trapOpen !== null ? splitSans(guide.traps[trapOpen].sans) : splitSans(line.sans)
  const orientation = guide.side === 'w' ? 'white' : 'black'
  const entry = repertoire[guide.slug]
  const sentence = usageSentence(usage)
  const addLineCards = async () => {
    const known = new Set(((await loadCards().catch(() => [])) as TrainingCard[]).map((card) => card.id))
    const cards = guide.lines.map((item) => lineCard(guide.slug, `${guide.name}, ${item.name}`, splitSans(item.sans), guide.side)).filter((card) => !known.has(card.id))
    await saveCards(cards).catch(() => undefined)
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-2 pb-10 lg:pt-6">
      <BackLink />
      <div className="mt-1 grid gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-md lg:sticky lg:top-4 lg:max-w-none lg:self-start">
          <LineViewer moves={moves} orientation={orientation} />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-tight font-semibold">{guide.name}</h1>
          <p className="tabular mt-1 text-sm text-muted">
            {guide.eco}, {guide.side === 'w' ? 'jogada de brancas' : 'jogada de pretas'}, nível {guide.level}
          </p>
          <p className="mt-3 max-w-prose text-lg leading-relaxed">{guide.summary}</p>
          {sentence && <p className="mt-3 rounded-md bg-surface p-3">{sentence}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (!entry) void addLineCards()
                setRepertoire(toggleRepertoire(repertoire, guide.slug))
              }}
              aria-pressed={Boolean(entry)}
              className={`min-h-11 rounded-md px-4 font-semibold ${entry ? 'bg-ink text-bg' : 'border border-line hover:bg-sunken'}`}
            >
              {entry ? 'No meu repertório' : 'Adicionar ao repertório'}
            </button>
          </div>

          <section className="mt-5">
            <h2 className="font-display text-xl font-semibold">Linhas</h2>
            <div role="tablist" aria-label="Linhas" className="mt-2 flex flex-wrap gap-1.5">
              {guide.lines.map((item, index) => (
                <button
                  key={item.name}
                  role="tab"
                  type="button"
                  aria-selected={selected === index && trapOpen === null}
                  onClick={() => {
                    setSelected(index)
                    setTrapOpen(null)
                  }}
                  className={`min-h-10 rounded-sm px-4 text-sm font-semibold ${selected === index && trapOpen === null ? 'bg-ink text-bg' : 'bg-surface hover:bg-sunken'}`}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <p className="mt-2 max-w-prose text-base leading-relaxed">{line.note}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate(`#/guia/praticar/${guide.slug}/${selected}`)} className="min-h-11 rounded-md bg-action px-4 font-semibold text-on-action">
                Praticar esta linha
              </button>
              <button type="button" onClick={() => onPlayFrom({ label: `${guide.name}, ${line.name}`, sans: splitSans(line.sans), color: guide.side })} className="min-h-11 rounded-md border border-line px-4 font-semibold hover:bg-sunken">
                Jogar contra um bot daqui
              </button>
            </div>
          </section>

          <section className="mt-5 flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold">Como jogar</h2>
            <List title="As ideias" items={guide.ideas} />
            <List title="Plano das brancas" items={guide.plans.white} />
            <List title="Plano das pretas" items={guide.plans.black} />
            <List title="Erros comuns" items={guide.mistakes} />
          </section>

          {guide.traps.length > 0 && (
            <section className="mt-5">
              <h2 className="font-display text-xl font-semibold">Armadilhas</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {guide.traps.map((trap, index) => (
                  <li key={trap.name} className="rounded-md bg-surface p-3">
                    <h3 className="font-semibold">{trap.name}</h3>
                    <p className="mt-1 max-w-prose text-base leading-relaxed">{trap.text}</p>
                    <p className="mt-1 text-sm text-muted">{formatLinePt(START_FEN, splitSans(trap.sans))}</p>
                    <button type="button" onClick={() => setTrapOpen(trapOpen === index ? null : index)} aria-pressed={trapOpen === index} className="mt-2 min-h-11 rounded-md border border-line px-4 font-semibold hover:bg-sunken">
                      {trapOpen === index ? 'Voltar às linhas' : 'Ver no tabuleiro'}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}

// ---------- Família do catálogo ----------

export function FamilyPage({ id, onPlayFrom }: { id: string; onPlayFrom: (start: StartPoint) => void }) {
  const [family, setFamily] = useState<OpeningFamily | null | undefined>(undefined)
  const [selected, setSelected] = useState(0)
  const [limit, setLimit] = useState(40)
  useEffect(() => {
    let alive = true
    void loadFamilies().then((list) => {
      if (alive) setFamily(list.find((item) => item.id === id) ?? null)
    })
    return () => {
      alive = false
    }
  }, [id])

  if (family === undefined) {
    return (
      <p role="status" className="p-6 text-muted">
        Carregando…
      </p>
    )
  }
  if (!family) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="font-display text-3xl font-semibold">Família não encontrada</h1>
        <button type="button" onClick={() => navigate('#/guia', { replace: true })} className="mt-4 min-h-12 w-full rounded-md bg-action font-semibold text-on-action">
          Abrir o guia
        </button>
      </main>
    )
  }
  const variant = family.variants[selected]
  const side: Color = variant.moves.length % 2 === 0 ? 'w' : 'b'
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-2 pb-10 lg:pt-6">
      <BackLink />
      <div className="mt-1 grid gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-md lg:sticky lg:top-4 lg:max-w-none lg:self-start">
          <LineViewer moves={variant.moves} orientation="white" />
          <button type="button" onClick={() => onPlayFrom({ label: variant.name, sans: variant.moves, color: side })} className="mt-3 min-h-11 w-full rounded-md border border-line px-4 font-semibold hover:bg-sunken">
            Jogar contra um bot daqui
          </button>
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-tight font-semibold">{family.name}</h1>
          <p className="tabular mt-1 text-sm text-muted">
            {family.eco}, {family.variants.length} {family.variants.length === 1 ? 'linha' : 'linhas'} na base
          </p>
          {family.guide && (
            <button type="button" onClick={() => navigate(`#/guia/abertura/${family.guide?.slug}`)} className="mt-3 min-h-11 rounded-md bg-action px-4 font-semibold text-on-action">
              Ler a explicação: {family.guide.name}
            </button>
          )}
          {!family.guide && <p className="mt-3 max-w-prose text-muted">Esta família ainda não tem texto explicativo, só os nomes e os lances.</p>}
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-md bg-surface">
            {family.variants.slice(0, limit).map((item, index) => (
              <li key={`${item.name}-${index}`}>
                <button type="button" onClick={() => setSelected(index)} aria-current={selected === index ? 'true' : undefined} className={`w-full px-3 py-2 text-left ${selected === index ? 'bg-ink text-bg' : 'hover:bg-sunken'}`}>
                  <span className="block font-semibold">{item.name.replace(`${family.name}: `, '') || item.name}</span>
                  <span className={`block text-sm ${selected === index ? 'opacity-80' : 'text-muted'}`}>{formatLinePt(START_FEN, item.moves)}</span>
                </button>
              </li>
            ))}
          </ul>
          {family.variants.length > limit && (
            <button type="button" onClick={() => setLimit((value) => value + 40)} className="mt-2 min-h-12 w-full rounded-md border border-line font-semibold hover:bg-sunken">
              Mostrar mais linhas
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

// ---------- Praticar uma linha ----------

function PracticeLine({ guide, lineIndex, onDone }: { guide: OpeningGuide; lineIndex: number; onDone: () => void }) {
  const line = guide.lines[lineIndex]
  const sans = useMemo(() => splitSans(line.sans), [line.sans])
  const [color, setColor] = useState<Color>(guide.side)
  const practice = useLine({ sans, color, onFinished: onDone })
  const styles = practice.lastStep ? { [practice.lastStep.from]: { backgroundColor: LAST_MOVE_TINT }, [practice.lastStep.to]: { backgroundColor: LAST_MOVE_TINT } } : undefined
  const arrows = practice.shownStep ? [{ startSquare: practice.shownStep.from, endSquare: practice.shownStep.to, color: BEST_ARROW_COLOR }] : []
  const next = lineIndex + 1 < guide.lines.length ? lineIndex + 1 : null
  return (
    <BoardScreen title={`${guide.name}, ${line.name}`} onBack={goBack} board={<PlayableBoard fen={practice.fen} orientation={color === 'w' ? 'white' : 'black'} canMove={practice.userTurn} onMove={practice.play} squareStyles={styles} arrows={arrows} celebrate={practice.done && practice.lastStep ? practice.lastStep.to : null} />}>
      <section aria-live="polite" className="rounded-md bg-surface p-4">
        {practice.done ? (
          <h2 className="font-display text-xl font-semibold text-(--positive)">{practice.errors === 0 ? 'Linha completa, sem erros!' : `Linha completa, com ${practice.errors} ${practice.errors === 1 ? 'erro' : 'erros'}.`}</h2>
        ) : practice.wrong ? (
          <h2 className="font-display text-xl font-semibold text-(--text-mistake)">{practice.wrong} não é o lance desta linha. Tente outro.</h2>
        ) : (
          <h2 className="font-display text-xl font-semibold">{practice.userTurn ? 'Qual é o próximo lance?' : 'O outro lado responde…'}</h2>
        )}
        {practice.shownStep && <p className="mt-1 text-sm text-muted">A seta mostra o lance.</p>}
        <p className="mt-2 min-h-7 text-base leading-relaxed">{practice.cursor > 0 ? formatLinePt(START_FEN, sans.slice(0, practice.cursor)) : ' '}</p>
        {practice.done && <p className="mt-2 max-w-prose text-base leading-relaxed">{line.note}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {practice.done && next !== null && (
            <button type="button" autoFocus onClick={() => navigate(`#/guia/praticar/${guide.slug}/${next}`, { replace: true })} className="min-h-11 flex-1 rounded-md bg-action px-4 font-semibold whitespace-nowrap text-on-action">
              Próxima linha
            </button>
          )}
          <button type="button" onClick={practice.restart} className="min-h-11 flex-1 rounded-md border border-line px-4 font-semibold whitespace-nowrap hover:bg-sunken">
            Praticar de novo
          </button>
          <button
            type="button"
            onClick={() => {
              setColor((value) => (value === 'w' ? 'b' : 'w'))
              practice.restart()
            }}
            className="min-h-11 flex-1 rounded-md border border-line px-4 font-semibold whitespace-nowrap hover:bg-sunken"
          >
            Jogar de {color === 'w' ? 'pretas' : 'brancas'}
          </button>
        </div>
      </section>
    </BoardScreen>
  )
}

export function Practice({ slug, line }: { slug: string; line: number }) {
  const guide = guideBySlug(slug)
  const [repertoire, setRepertoire, loaded] = useKv<Repertoire>(REPERTOIRE_KEY, {})
  if (!guide || !guide.lines[line]) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="font-display text-3xl font-semibold">Linha não encontrada</h1>
        <button type="button" onClick={() => navigate('#/guia', { replace: true })} className="mt-4 min-h-12 w-full rounded-md bg-action font-semibold text-on-action">
          Abrir o guia
        </button>
      </main>
    )
  }
  return <PracticeLine key={`${slug}-${line}`} guide={guide} lineIndex={line} onDone={() => loaded && setRepertoire(recordLineDone(repertoire, slug, line))} />
}

// ---------- Minhas aberturas ----------

export function MyOpenings({ username }: { username: string }) {
  const records = recordsFor(useAllRecords(), username)
  const usage = useMemo(() => usageByGuide(records), [records])
  const covered = usage.reduce((sum, item) => sum + item.totals.games, 0)
  const withColor = records.filter((record) => record.userColor).length
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-2 pb-10 lg:pt-6">
      <BackLink />
      <h1 className="font-display mt-1 text-3xl font-semibold">Minhas aberturas</h1>
      {usage.length === 0 ? (
        <p className="mt-2 max-w-prose text-muted">Quando houver partidas guardadas, aqui aparece o quanto você joga cada abertura, e como se sai nela. Busque suas partidas em Partidas.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            {covered} de {withColor} partidas seguem aberturas do guia.
          </p>
          <div className="mt-3 overflow-x-auto rounded-md bg-surface">
            <table className="tabular w-full text-right text-sm">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="p-2 text-left font-semibold">Abertura</th>
                  <th scope="col" className="p-2 font-semibold">Partidas</th>
                  <th scope="col" className="p-2 font-semibold">V / E / D</th>
                  <th scope="col" className="p-2 font-semibold">Aproveit.</th>
                  <th scope="col" className="p-2 font-semibold">Precisão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {usage.map((item) => (
                  <tr key={`${item.guide.slug}-${item.color}`}>
                    <th scope="row" className="p-2 text-left font-normal">
                      <button type="button" onClick={() => navigate(`#/guia/abertura/${item.guide.slug}`)} className="min-h-9 text-left font-semibold underline">
                        {item.guide.name}
                      </button>
                      <span className="block text-xs text-muted">{item.color === 'w' ? 'De brancas' : 'De pretas'}</span>
                    </th>
                    <td className="p-2">{item.totals.games}</td>
                    <td className="p-2 whitespace-nowrap">
                      {item.totals.wins} / {item.totals.draws} / {item.totals.losses}
                    </td>
                    <td className="p-2">{item.totals.score === null ? '–' : `${item.totals.score.toFixed(0)}%`}</td>
                    <td className="p-2">{item.totals.accuracy === null ? '–' : `${item.totals.accuracy.toFixed(0)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}
