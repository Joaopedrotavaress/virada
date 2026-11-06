import { CLASS_INFO, type MoveClass } from '../chess/classify'
import { Icon, ICON_PATHS } from './Icons'

const BOOK_PATH = 'M11 6.2C9 4.9 6.3 4.2 2.5 4.2V18c3.8 0 6.5.7 8.5 2zM13 6.2c2-1.3 4.7-2 8.5-2V18c-3.8 0-6.5.7-8.5 2z'

/** Ícone de livro, na cor do texto ao redor. */
export function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d={BOOK_PATH} />
    </svg>
  )
}

/** O sinal do lance como texto ou, no livro, como ícone. */
export function ClassSymbol({ cls, iconClassName }: { cls: MoveClass; iconClassName?: string }) {
  if (cls === 'book') return <BookIcon className={iconClassName} />
  if (cls === 'best') return <Icon name="star" className={iconClassName ?? 'inline size-[1em]'} />
  if (cls === 'excellent') return <Icon name="thumb" className={iconClassName ?? 'inline size-[1em]'} />
  if (cls === 'good') return <Icon name="check" className={iconClassName ?? 'inline size-[1em]'} />
  if (cls === 'miss') return <Icon name="close" className={iconClassName ?? 'inline size-[1em]'} />
  return <>{CLASS_INFO[cls].symbol}</>
}

/** Sinal da classificação em SVG: escala com a casa do tabuleiro em qualquer tamanho de tela. */
export function ClassBadge({ cls, className }: { cls: MoveClass; className?: string }) {
  const { symbol, label } = CLASS_INFO[cls]
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={label} className={className}>
      <rect x="4" y="4" width="92" height="92" rx="6" fill={`var(--fill-${cls})`} stroke="var(--zone-0)" strokeWidth="5" />
      {cls === 'book' || cls === 'best' || cls === 'excellent' || cls === 'good' || cls === 'miss' ? (
        <g transform="translate(20 20) scale(2.5)" fill={cls === 'best' ? 'var(--on-fill-best)' : 'var(--on-fill)'}>
          <path d={cls === 'book' ? BOOK_PATH : cls === 'best' ? ICON_PATHS.star : cls === 'excellent' ? ICON_PATHS.thumb : cls === 'good' ? ICON_PATHS.check : ICON_PATHS.close} />
        </g>
      ) : (
        <text
          x="50"
          y="52"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-sans)"
          fontWeight="800"
          fontSize={symbol.length > 1 ? 50 : 60}
          fill={cls === 'inaccuracy' ? 'var(--on-fill-inaccuracy)' : cls === 'brilliant' ? 'var(--on-fill-brilliant)' : 'var(--on-fill)'}
        >
          {symbol}
        </text>
      )}
    </svg>
  )
}
