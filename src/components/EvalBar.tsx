import { type Eval, formatEval, whiteWinPercent } from '../chess/evaluation'

/**
 * A parte clara é a chance das brancas. No computador, a barra fica em pé, ao lado do tabuleiro.
 * No celular, `horizontal` a deita numa linha fina acima dele, para o tabuleiro usar toda a largura.
 */
export function EvalBar({ evaluation, orientation, horizontal = false }: { evaluation: Eval | null; orientation: 'white' | 'black'; horizontal?: boolean }) {
  const white = evaluation ? whiteWinPercent(evaluation) : 50
  const whiteLeads = white >= 50
  const whiteAtBottom = orientation === 'white'
  const labelAtBottom = whiteLeads === whiteAtBottom
  const text = evaluation ? formatEval(evaluation) : ''
  const label = evaluation ? `Avaliação ${text}` : 'Avaliando a posição'

  if (horizontal) {
    return (
      <div role="img" aria-label={label} className="relative h-1.5 w-full shrink-0 overflow-hidden" style={{ backgroundColor: 'var(--share-black)' }}>
        <div className={`absolute inset-y-0 transition-[width] duration-200 ease-out ${whiteAtBottom ? 'left-0' : 'right-0'}`} style={{ width: `${white}%`, backgroundColor: 'var(--share-white)' }} />
        <div className="absolute inset-y-0 left-1/2 w-px" style={{ backgroundColor: 'var(--share-mid)' }} />
      </div>
    )
  }

  return (
    <div role="img" aria-label={label} className="relative w-6 shrink-0 self-stretch overflow-hidden rounded-sm" style={{ backgroundColor: 'var(--share-black)' }}>
      <div
        className={`absolute inset-x-0 transition-[height] duration-200 ease-out ${whiteAtBottom ? 'bottom-0' : 'top-0'}`}
        style={{ height: `${white}%`, backgroundColor: 'var(--share-white)' }}
      />
      <div className="absolute inset-x-0 top-1/2 h-px" style={{ backgroundColor: 'var(--share-mid)' }} />
      <span
        className={`tabular absolute inset-x-0 text-center text-[0.625rem] font-bold tracking-tighter ${labelAtBottom ? 'bottom-1' : 'top-1'}`}
        style={{ color: whiteLeads ? 'var(--share-black)' : 'var(--share-white)' }}
      >
        {text}
      </span>
    </div>
  )
}
