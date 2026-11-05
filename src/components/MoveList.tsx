import { Fragment, type RefObject, memo, useEffect, useRef } from 'react'
import type { AnalyzedMove } from '../chess/analyze'
import { CLASS_INFO } from '../chess/classify'
import { formatClock } from '../chess/clock'
import { sanToPt } from '../chess/notation'
import { ClassSymbol } from './ClassBadge'
import type { VariantState } from './useVariant'

interface MoveListProps {
  moves: AnalyzedMove[]
  ply: number
  onSelect: (ply: number) => void
  showTitle?: boolean
  variant?: VariantState | null
  onSelectVariant?: (cursor: number) => void
  /** Tempo gasto em cada lance, quando a partida tem relógio. */
  spent?: (number | null)[]
}

interface MoveCellProps {
  move: AnalyzedMove
  current: boolean
  time: number | null
  activeRef?: RefObject<HTMLButtonElement | null>
  onSelect: (ply: number) => void
}

/** Numa partida longa, navegar só redesenha as duas células que mudaram. */
const MoveCell = memo(function MoveCell({ move, current, time, activeRef, onSelect }: MoveCellProps) {
  const { label } = CLASS_INFO[move.cls]
  return (
    <button
      type="button"
      ref={activeRef}
      onClick={() => onSelect(move.ply)}
      aria-current={current ? 'true' : undefined}
      aria-label={`${move.moveNumber}${move.color === 'w' ? '.' : '...'} ${sanToPt(move.san)}, ${label}${time !== null ? `, ${formatClock(time)} gastos` : ''}`}
      className={`flex min-h-9 w-full items-center justify-between gap-1 rounded-sm px-2 text-left ${current ? 'bg-sunken font-bold outline-1 outline-line' : 'hover:bg-sunken'}`}
      style={{ color: `var(--text-${move.cls})` }}
    >
      <span className="truncate">{sanToPt(move.san)}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        {time !== null && <span className="tabular font-sans text-[0.6875rem] font-normal text-muted">{formatClock(time)}</span>}
        <span aria-hidden="true" className="flex w-4 justify-end font-sans text-xs font-bold">
          <ClassSymbol cls={move.cls} iconClassName="size-3.5" />
        </span>
      </span>
    </button>
  )
})

export function MoveList({ moves, ply, onSelect, showTitle = true, variant, onSelectVariant, spent }: MoveListProps) {
  const container = useRef<HTMLDivElement>(null)
  const active = useRef<HTMLButtonElement>(null)
  const inVariant = Boolean(variant && variant.cursor >= 0)

  // Rola só a própria lista: scrollIntoView também moveria a página no celular.
  useEffect(() => {
    const box = container.current
    const item = active.current
    if (!box) return
    if (!item) {
      box.scrollTop = 0
      return
    }
    const boxRect = box.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()
    if (itemRect.top < boxRect.top) box.scrollTop -= boxRect.top - itemRect.top + 8
    else if (itemRect.bottom > boxRect.bottom) box.scrollTop += itemRect.bottom - boxRect.bottom + 8
  }, [ply, variant?.cursor, variant?.steps.length])

  const rows = new Map<number, { white?: AnalyzedMove; black?: AnalyzedMove }>()
  for (const move of moves) {
    const row = rows.get(move.moveNumber) ?? {}
    if (move.color === 'w') row.white = move
    else row.black = move
    rows.set(move.moveNumber, row)
  }

  const cell = (move?: AnalyzedMove) => {
    if (!move) return <span className="px-2 text-muted">…</span>
    const current = move.ply === ply
    return <MoveCell move={move} current={current} time={spent?.[move.ply - 1] ?? null} activeRef={current && !inVariant ? active : undefined} onSelect={onSelect} />
  }

  // A variante aparece logo abaixo da linha do lance de onde ela saiu.
  const variantBlock = variant && variant.steps.length > 0 && (
    <li className="col-span-3 my-1 ml-9 border-l-2 border-muted bg-sunken/60 py-1 pr-1 pl-2" aria-label="Lances testados">
      <ol className="flex flex-wrap items-center gap-1">
        {variant.steps.map((step, index) => {
          const current = index === variant.cursor
          const prefix = step.color === 'w' ? `${step.moveNumber}.` : index === 0 ? `${step.moveNumber}...` : ''
          return (
            <li key={step.id}>
              <button
                type="button"
                ref={current ? active : undefined}
                onClick={() => onSelectVariant?.(index)}
                aria-current={current ? 'true' : undefined}
                className={`font-display flex min-h-9 items-center gap-1 rounded-sm px-1.5 text-muted italic ${current ? 'bg-surface font-bold text-ink not-italic outline-1 outline-line' : 'hover:bg-surface'}`}
              >
                <span>
                  {prefix && <span className="tabular mr-0.5 text-xs">{prefix}</span>}
                  {sanToPt(step.san)}
                </span>
                {step.cls && (
                  <span className="font-sans text-xs font-bold not-italic" style={{ color: `var(--text-${step.cls})` }} title={CLASS_INFO[step.cls].label}>
                    {CLASS_INFO[step.cls].symbol}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </li>
  )

  const variantMove = variant && variant.basePly > 0 ? moves[variant.basePly - 1].moveNumber : null

  return (
    <section aria-label="Lances da partida" className="flex h-full min-h-0 flex-col">
      {showTitle && <h2 className="mb-1.5 shrink-0 text-sm font-semibold">Lances</h2>}
      <div ref={container} className="min-h-0 flex-1 overflow-y-auto rounded-md bg-surface p-1.5">
        <ol className="grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-1 gap-y-0.5">
          {variantMove === null && variantBlock}
          {[...rows.entries()].map(([number, row]) => (
            <Fragment key={number}>
              <li className="col-span-3 grid grid-cols-subgrid items-center">
                <span className="tabular pr-1 text-right text-sm text-muted">{number}.</span>
                {cell(row.white)}
                {cell(row.black)}
              </li>
              {variantMove === number && variantBlock}
            </Fragment>
          ))}
        </ol>
      </div>
    </section>
  )
}
