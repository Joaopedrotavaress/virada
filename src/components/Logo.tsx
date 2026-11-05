/** As casas do símbolo: um V de tabuleiro. Desce, vira na casa amarela e sobe mais forte. */
const CELLS: { x: number; y: number; zone: string }[] = [
  { x: 0, y: 0, zone: 'var(--zone-5)' },
  { x: 0, y: 1, zone: 'var(--zone-5)' },
  { x: 1, y: 2, zone: 'var(--zone-6)' },
  { x: 1, y: 3, zone: 'var(--zone-6)' },
  { x: 3, y: 3, zone: 'var(--zone-9)' },
  { x: 3, y: 2, zone: 'var(--zone-9)' },
  { x: 4, y: 1, zone: 'var(--zone-10)' },
  { x: 4, y: 0, zone: 'var(--zone-10)' },
]

/** O símbolo do Virada. Sempre sobre fundo escuro, para os tons lerem igual nos dois temas. */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="4" fill="var(--zone-0)" />
      {CELLS.map(({ x, y, zone }) => (
        <rect key={`${x}-${y}`} x={7 + x * 10.4} y={7 + y * 10.4} width="9.6" height="9.6" fill={zone} />
      ))}
      <rect x={7 + 2 * 10.4} y={7 + 4 * 10.4} width="9.6" height="9.6" fill="var(--action)" />
    </svg>
  )
}

export function Logo({ size = 'text-2xl', markClassName = 'size-7' }: { size?: string; markClassName?: string }) {
  return (
    <span className={`font-display inline-flex items-center gap-2 font-extrabold tracking-wide ${size}`}>
      <LogoMark className={markClassName} />
      Virada
    </span>
  )
}

export function ZoneRamp() {
  return (
    <div className="zone-ramp" aria-hidden="true">
      {Array.from({ length: 11 }, (_, index) => (
        <i key={index} style={{ background: `var(--zone-${index})` }} />
      ))}
    </div>
  )
}
