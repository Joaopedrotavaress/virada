import { CLASS_INFO, type MoveClass } from '../chess/classify'

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
  return cls === 'book' ? <BookIcon className={iconClassName} /> : <>{CLASS_INFO[cls].symbol}</>
}

/** Sinal da classificação em SVG: escala com a casa do tabuleiro em qualquer tamanho de tela. */
export function ClassBadge({ cls, className }: { cls: MoveClass; className?: string }) {
  const { symbol, label } = CLASS_INFO[cls]
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={label} className={className}>
      <circle cx="50" cy="50" r="46" fill={`var(--fill-${cls})`} stroke="var(--on-fill)" strokeWidth="7" />
      {cls === 'book' ? (
        <g transform="translate(20 20) scale(2.5)" fill="var(--on-fill)">
          <path d={BOOK_PATH} />
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
          fill={cls === 'inaccuracy' ? 'var(--on-fill-inaccuracy)' : 'var(--on-fill)'}
        >
          {symbol}
        </text>
      )}
    </svg>
  )
}
