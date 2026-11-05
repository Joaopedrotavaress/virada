import { hashText } from '../chess/analyze'

/** Um desenho próprio para cada bot, feito de casas: sempre o mesmo para o mesmo bot, nunca uma caricatura. */
export function BotAvatar({ id, name, className = 'size-10' }: { id: string; name: string; className?: string }) {
  const seed = parseInt(hashText(id), 36)
  const cells: { x: number; y: number; on: boolean }[] = []
  // Metade esquerda sorteada, direita espelhada: dá cara de retrato sem desenhar rosto nenhum.
  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      const on = ((seed >> ((y * 3 + x) % 24)) & 1) === 1
      cells.push({ x, y, on })
      if (x < 2) cells.push({ x: 4 - x, y, on })
    }
  }
  const initial = name.replace(/^(Seu|Dona|Dr\.|Mestra|Tio|O) /, '')[0]
  return (
    <svg viewBox="0 0 50 50" aria-hidden="true" className={`shrink-0 rounded-sm ${className}`}>
      <rect width="50" height="50" fill="var(--zone-2)" />
      {cells.map(({ x, y, on }) => on && <rect key={`${x}-${y}`} x={x * 10} y={y * 10} width="9.5" height="9.5" fill="var(--zone-5)" />)}
      <rect x="12" y="12" width="26" height="26" fill="var(--action)" />
      <text x="25" y="26" textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-display)" fontWeight="800" fontSize="24" fill="var(--on-action)">
        {initial}
      </text>
    </svg>
  )
}
