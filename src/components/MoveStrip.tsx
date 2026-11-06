import { useEffect, useRef } from 'react'
import type { AnalyzedMove } from '../chess/analyze'
import { CLASS_INFO, type MoveClass, isErrorClass, isSpecialClass } from '../chess/classify'
import { sanToPt } from '../chess/notation'
import { ClassSymbol } from './ClassBadge'
import type { VariantState } from './useVariant'

const showsSymbol = (cls: MoveClass | null | undefined): cls is MoveClass => Boolean(cls && (isErrorClass(cls) || isSpecialClass(cls) || cls === 'excellent'))

interface ChipProps {
  label: string
  prefix: string
  cls?: MoveClass | null
  current: boolean
  tested?: boolean
  onSelect: () => void
  activeRef?: React.Ref<HTMLButtonElement>
}

function Chip({ label, prefix, cls, current, tested = false, onSelect, activeRef }: ChipProps) {
  return (
    <li className="shrink-0">
      <button
        ref={activeRef}
        type="button"
        onClick={onSelect}
        aria-current={current ? 'true' : undefined}
        className={`flex h-9 items-center gap-1 rounded-sm px-1.5 text-sm whitespace-nowrap ${current ? 'bg-ink font-semibold text-bg' : 'hover:bg-sunken'} ${tested && !current ? 'text-muted italic' : ''}`}
      >
        {prefix && <span className={`tabular text-xs ${current ? '' : 'text-muted'}`}>{prefix}</span>}
        {label}
        {showsSymbol(cls) && (
          <span className={`text-xs font-bold ${current ? 'rounded-sm bg-bg px-0.5' : ''}`} style={{ color: `var(--text-${cls})` }} title={CLASS_INFO[cls].label}>
            <ClassSymbol cls={cls} iconClassName="inline size-3.5" />
          </span>
        )}
      </button>
    </li>
  )
}

interface MoveStripProps {
  moves: AnalyzedMove[]
  ply: number
  onSelect: (ply: number) => void
  variant?: VariantState | null
  onSelectVariant?: (index: number) => void
}

/** Os lances em fila, sob o tabuleiro: o atual fica no meio e dá para arrastar para os lados. */
export function MoveStrip({ moves, ply, onSelect, variant, onSelectVariant }: MoveStripProps) {
  const box = useRef<HTMLOListElement>(null)
  const active = useRef<HTMLButtonElement>(null)
  const inVariant = Boolean(variant && variant.cursor >= 0)
  const shown = variant ? moves.slice(0, variant.basePly) : moves

  // Rola só a própria fila: scrollIntoView também moveria a página.
  useEffect(() => {
    const list = box.current
    if (!list) return
    const item = active.current
    if (!item) {
      list.scrollLeft = 0
      return
    }
    const listBox = list.getBoundingClientRect()
    const itemBox = item.getBoundingClientRect()
    list.scrollLeft += itemBox.left + itemBox.width / 2 - (listBox.left + listBox.width / 2)
  }, [ply, variant?.cursor, variant?.steps.length])

  return (
    <ol ref={box} aria-label="Lances da partida" className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
      {shown.map((move) => {
        const current = move.ply === ply && !inVariant
        return (
          <Chip
            key={move.ply}
            label={sanToPt(move.san)}
            prefix={move.color === 'w' ? `${move.moveNumber}.` : ''}
            cls={move.cls}
            current={current}
            activeRef={current ? active : undefined}
            onSelect={() => onSelect(move.ply)}
          />
        )
      })}
      {variant?.steps.map((step, index) => {
        const current = index === variant.cursor
        return (
          <Chip
            key={step.id}
            label={sanToPt(step.san)}
            prefix={step.color === 'w' ? `${step.moveNumber}.` : index === 0 ? `${step.moveNumber}...` : ''}
            cls={step.cls}
            current={current}
            tested
            activeRef={current ? active : undefined}
            onSelect={() => onSelectVariant?.(index)}
          />
        )
      })}
    </ol>
  )
}
