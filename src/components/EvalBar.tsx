import { type Eval, formatEval, whiteWinPercent } from '../chess/evaluation'

/** Barra vertical: a parte clara é a chance das brancas e fica do lado delas no tabuleiro. */
export function EvalBar({ evaluation, orientation }: { evaluation: Eval | null; orientation: 'white' | 'black' }) {
  const white = evaluation ? whiteWinPercent(evaluation) : 50
  const whiteLeads = white >= 50
  const whiteAtBottom = orientation === 'white'
  const labelAtBottom = whiteLeads === whiteAtBottom
  const text = evaluation ? formatEval(evaluation) : ''

  return (
    <div
      role="img"
      aria-label={evaluation ? `Avaliação ${text}` : 'Avaliando a posição'}
      className="relative w-7 shrink-0 self-stretch overflow-hidden rounded-sm lg:w-8"
      style={{ backgroundColor: 'var(--share-black)' }}
    >
      <div
        className={`absolute inset-x-0 transition-[height] duration-200 ease-out ${whiteAtBottom ? 'bottom-0' : 'top-0'}`}
        style={{ height: `${white}%`, backgroundColor: 'var(--share-white)' }}
      />
      <div className="absolute inset-x-0 top-1/2 h-px" style={{ backgroundColor: 'var(--share-mid)' }} />
      <span
        className={`tabular absolute inset-x-0 text-center text-[0.625rem] font-bold lg:text-[0.6875rem] ${labelAtBottom ? 'bottom-1' : 'top-1'}`}
        style={{ color: whiteLeads ? 'var(--share-black)' : 'var(--share-white)' }}
      >
        {text}
      </span>
    </div>
  )
}
