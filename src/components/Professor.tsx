import type { ReactNode } from 'react'
import { type Mood, PROFESSOR_NAME } from '../chess/professor'

const TOP = ['............', '...ssssss...', '..ssssssss..']
const NOSE_AND_MUSTACHE = ['.ssssnnssss.', '.ssccccccss.']
const SHIRT = ['.aaaaccaaaa.', 'aaaaaaaaaaaa']

/** Do alto da testa ao queixo, muda o que mostra a cara: sobrancelhas, olhos e boca. O palito fica no canto da boca. */
const FACES: Record<Mood, { brows: string[]; mouth: string[] }> = {
  neutro: { brows: ['.cssssssssc.', '.csccssccsc.', '.sssdssdsss.'], mouth: ['.sssddddsscc', '..ssssssss..'] },
  feliz: { brows: ['.csccssccsc.', '.cssssssssc.', '.sssdssdsss.'], mouth: ['.ssdccccdscc', '..ssssssss..'] },
  bravo: { brows: ['.cssssssssc.', '.csccccccsc.', '.sssdssdsss.'], mouth: ['.ssssssssscc', '..ssddddss..'] },
  espantado: { brows: ['.csccssccsc.', '.cssdssdssc.', '.sssdssdsss.'], mouth: ['.sssddddsscc', '..ssddddss..'] },
}

const TONES: Record<string, string> = { s: 'var(--zone-6)', n: 'var(--zone-5)', c: 'var(--zone-10)', d: 'var(--zone-0)', a: 'var(--zone-1)' }

/** O retrato do professor, em casas de tabuleiro como os bots: careca, bigode branco e palito na boca. */
export function ProfessorFace({ mood = 'neutro', className = 'size-12' }: { mood?: Mood; className?: string }) {
  const { brows, mouth } = FACES[mood]
  const rows = [...TOP, ...brows, ...NOSE_AND_MUSTACHE, ...mouth, ...SHIRT]
  return (
    <svg viewBox="-1 -1 14 14" role="img" aria-label={PROFESSOR_NAME} shapeRendering="crispEdges" className={`shrink-0 rounded-sm ${className}`}>
      <rect x="-1" y="-1" width="14" height="14" fill="var(--zone-3)" />
      {rows.flatMap((row, y) =>
        [...row].map((cell, x) => (cell === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={TONES[cell]} />)),
      )}
    </svg>
  )
}

/** O professor e o balão: o conteúdo é o próprio cartão, com um biquinho apontando para ele. */
export function Professor({ mood = 'neutro', children, large = false }: { mood?: Mood; children: ReactNode; large?: boolean }) {
  return (
    <div className={`flex min-w-0 items-start ${large ? 'gap-3' : 'gap-2'}`}>
      <figure className="shrink-0">
        <ProfessorFace mood={mood} className={large ? 'size-16' : 'size-11'} />
        {large && <figcaption className="mt-1 w-16 text-center text-xs leading-tight text-muted">{PROFESSOR_NAME}</figcaption>}
      </figure>
      <div className="relative min-w-0 flex-1">
        <span aria-hidden="true" className={`absolute -left-1 size-2.5 rotate-45 bg-surface ${large ? 'top-6' : 'top-4'}`} />
        <div className="relative flex min-w-0 flex-col gap-2">{children}</div>
      </div>
    </div>
  )
}
