/** Ícones desenhados: sinais de texto dependem da fonte de cada aparelho. */
export const ICON_PATHS = {
  close: 'M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z',
  star: 'M12 2.5 14.9 9l7.1.7-5.4 4.7 1.6 7L12 17.7 5.8 21.4l1.6-7L2 9.7 9.1 9z',
  check: 'M9.4 18.4 3.6 12.6 5.5 10.7l3.9 3.9 9.1-9.1 1.9 1.9z',
  first: 'M6 5h2v14H6zm12 .6v12.8L9.6 12z',
  previous: 'M16 5.6v12.8L7.6 12z',
  next: 'M8 5.6v12.8l8.4-6.4z',
  last: 'M16 5h2v14h-2zM6 5.6v12.8l8.4-6.4z',
}

export function Icon({ name, className = 'size-5' }: { name: keyof typeof ICON_PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}
