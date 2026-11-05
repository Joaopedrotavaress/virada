import { Icon } from './Icons'
import { BEST_ARROW_COLOR, THREAT_ARROW_COLOR } from './Board'
import { useEffect, useRef, useState } from 'react'
import type { MoveClass } from '../chess/classify'
import { CLASS_INFO } from '../chess/classify'
import { ClassBadge } from './ClassBadge'

const MEANINGS: { cls: MoveClass; text: string }[] = [
  { cls: 'book', text: 'Lance conhecido da teoria de aberturas. Não conta para a precisão nem para os erros.' },
  { cls: 'best', text: 'O melhor lance da posição, segundo o Stockfish.' },
  { cls: 'excellent', text: 'Quase igual ao melhor: perde menos de 2% de chance de vitória.' },
  { cls: 'good', text: 'Um lance razoável: perde de 2% a 5% de chance de vitória.' },
  { cls: 'inaccuracy', text: 'Havia coisa melhor: perde de 5% a 10% de chance de vitória.' },
  { cls: 'mistake', text: 'Um erro de verdade: perde de 10% a 20% de chance de vitória.' },
  { cls: 'miss', text: 'O adversário tinha acabado de errar e este lance deixou a chance passar, perdendo 10% ou mais.' },
  { cls: 'blunder', text: 'Muda o rumo da partida: perde 20% ou mais de chance de vitória.' },
]

const EVALS: { sample: string; text: string }[] = [
  { sample: '+1,2', text: 'Brancas melhor, por cerca de 1,2 peão.' },
  { sample: '−3,4', text: 'Pretas melhor, por cerca de 3,4 peões.' },
  { sample: '0,0', text: 'Posição igual.' },
  { sample: 'M3', text: 'As brancas dão mate em 3 lances.' },
  { sample: '−M3', text: 'As pretas dão mate em 3 lances.' },
]

function Arrow({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 20" aria-hidden="true" className="h-5 w-8 shrink-0">
      <path d="M2 10h20M18 3l10 7-10 7z" stroke={color} strokeWidth="4" fill={color} />
    </svg>
  )
}

function LegendDialog({ onClose }: { onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButton.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="O que cada símbolo significa" className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-lg bg-surface sm:rounded-lg">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line py-2 pr-2 pl-4">
          <h2 className="font-display text-xl font-semibold">O que cada símbolo significa</h2>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="Fechar a legenda" className="flex size-11 shrink-0 items-center justify-center rounded-md text-2xl hover:bg-sunken">
            <Icon name="close" className="size-6" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3">
          <h3 className="text-sm font-semibold text-muted">Lances</h3>
          <ul className="mt-2 grid gap-3">
            {MEANINGS.map(({ cls, text }) => (
              <li key={cls} className="flex items-start gap-3">
                <ClassBadge cls={cls} className="size-8 shrink-0" />
                <p className="min-w-0 text-sm leading-snug">
                  <span className="block text-base font-semibold" style={{ color: `var(--text-${cls})` }}>
                    {CLASS_INFO[cls].label}
                  </span>
                  {text}
                </p>
              </li>
            ))}
          </ul>

          <h3 className="mt-5 text-sm font-semibold text-muted">Avaliação</h3>
          <ul className="mt-2 grid gap-1.5">
            {EVALS.map(({ sample, text }) => (
              <li key={sample} className="flex items-baseline gap-3 text-sm">
                <span className="tabular w-10 shrink-0 text-right font-bold">{sample}</span>
                <span className="min-w-0">{text}</span>
              </li>
            ))}
          </ul>

          <h3 className="mt-5 text-sm font-semibold text-muted">No tabuleiro e nos gráficos</h3>
          <ul className="mt-2 grid gap-2 text-sm">
            <li className="flex items-center gap-3">
              <Arrow color={BEST_ARROW_COLOR} />
              <span>Seta verde: o melhor lance.</span>
            </li>
            <li className="flex items-center gap-3">
              <Arrow color={THREAT_ARROW_COLOR} />
              <span>Seta vermelha: a ameaça do adversário, no jogo contra bots.</span>
            </li>
            <li className="flex items-center gap-3">
              <span aria-hidden="true" className="flex h-5 w-8 shrink-0 overflow-hidden rounded-sm border border-line">
                <span className="w-2/3" style={{ backgroundColor: 'var(--share-white)' }} />
                <span className="w-1/3" style={{ backgroundColor: 'var(--share-black)' }} />
              </span>
              <span>Barra e gráfico de avaliação: a parte clara é a chance de vitória das brancas.</span>
            </li>
          </ul>
          <p className="mt-4 text-sm text-muted">Chance de vitória é a estimativa de quem está ganhando, calculada a partir da avaliação do Stockfish.</p>
        </div>
      </div>
    </div>
  )
}

/** Botão que abre a legenda. compact: só o "?", para caber no cabeçalho do celular. */
export function LegendButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={compact ? 'O que cada símbolo significa' : undefined}
        title="O que cada símbolo significa"
        className={compact ? 'flex size-9 shrink-0 items-center justify-center rounded-full border border-line font-bold hover:bg-sunken' : 'min-h-9 shrink-0 rounded-md border border-line px-3 text-sm font-semibold hover:bg-sunken'}
      >
        {compact ? '?' : 'Legenda'}
      </button>
      {open && <LegendDialog onClose={() => setOpen(false)} />}
    </>
  )
}
