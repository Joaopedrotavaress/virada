import { type ReactNode, useEffect, useState } from 'react'
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

/** A boca falando: abre, fecha pela metade e fecha, sem seguir um ritmo fixo demais. */
const TALK_OPEN = ['.sssddddsscc', '..ssddddss..']
const TALK_HALF = ['.sssddddsscc', '..ssssssss..']
const TALK_SHUT = ['.ssssssssscc', '..ssssssss..']
const TALK_FRAMES = [TALK_OPEN, TALK_HALF, TALK_OPEN, TALK_SHUT, TALK_HALF, TALK_OPEN, TALK_HALF, TALK_SHUT]
const TALK_STEP_MS = 120
const BLINK_EVERY_MS = 3600
const BLINK_MS = 130

const TONES: Record<string, string> = { s: 'var(--zone-6)', n: 'var(--zone-5)', c: 'var(--zone-10)', d: 'var(--zone-0)', a: 'var(--zone-1)' }

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** O retrato do professor, em casas de tabuleiro como os bots: careca, bigode branco e palito na boca. */
export function ProfessorFace({ mood = 'neutro', talking = false, className = 'size-12' }: { mood?: Mood; talking?: boolean; className?: string }) {
  const [frame, setFrame] = useState(0)
  const [blinking, setBlinking] = useState(false)

  useEffect(() => {
    if (!talking || reducedMotion()) return
    const timer = setInterval(() => setFrame((value) => value + 1), TALK_STEP_MS)
    return () => {
      clearInterval(timer)
      setFrame(0)
    }
  }, [talking])

  useEffect(() => {
    if (reducedMotion()) return
    let close: ReturnType<typeof setTimeout>
    const timer = setInterval(() => {
      setBlinking(true)
      close = setTimeout(() => setBlinking(false), BLINK_MS)
    }, BLINK_EVERY_MS)
    return () => {
      clearInterval(timer)
      clearTimeout(close)
    }
  }, [])

  const { brows, mouth } = FACES[mood]
  const moving = talking && !reducedMotion()
  const eyes = blinking ? brows.map((row, index) => (index === 0 ? row : row.replaceAll('d', 's'))) : brows
  const head = [...TOP, ...eyes, ...NOSE_AND_MUSTACHE, ...(moving ? TALK_FRAMES[frame % TALK_FRAMES.length] : mouth)]
  // A cabeça acompanha a fala, e a camisa fica parada.
  const nod = moving && frame % 4 === 1 ? 0.35 : 0
  const cells = (rows: string[], top: number) =>
    rows.flatMap((row, y) => [...row].map((cell, x) => (cell === '.' ? null : <rect key={`${x}-${top + y}`} x={x} y={top + y} width="1" height="1" fill={TONES[cell]} />)))

  return (
    <svg viewBox="-1 -1 14 14" role="img" aria-label={PROFESSOR_NAME} data-falando={moving ? '' : undefined} className={`shrink-0 rounded-sm ${className}`}>
      <rect x="-1" y="-1" width="14" height="14" fill="var(--zone-3)" />
      {cells(SHIRT, head.length)}
      <g transform={`translate(0 ${nod})`} shapeRendering="crispEdges">
        {cells(head, 0)}
      </g>
    </svg>
  )
}

interface ProfessorProps {
  mood?: Mood
  children: ReactNode
  large?: boolean
  /** O que ele está dizendo. Quando muda, ele fala de novo. */
  say?: string
  /** Quanto tempo a boca se mexe. Sem isso, depende do tamanho da frase. */
  talkMs?: number
  /** Quanto espera antes de começar a falar. */
  delayMs?: number
}

/** O professor e o balão: o conteúdo é o próprio cartão, com um biquinho apontando para ele. */
export function Professor({ mood = 'neutro', children, large = false, say, talkMs, delayMs = 0 }: ProfessorProps) {
  const [talking, setTalking] = useState(false)

  useEffect(() => {
    if (!say || reducedMotion()) return
    const length = talkMs ?? Math.min(4200, Math.max(1000, say.length * 38))
    const start = setTimeout(() => setTalking(true), delayMs)
    const stop = setTimeout(() => setTalking(false), delayMs + length)
    return () => {
      clearTimeout(start)
      clearTimeout(stop)
      setTalking(false)
    }
  }, [say, talkMs, delayMs])

  return (
    <div className={`flex min-w-0 items-start ${large ? 'gap-3' : 'gap-2'}`}>
      <figure className="shrink-0">
        <ProfessorFace mood={mood} talking={talking} className={large ? 'size-16' : 'size-11'} />
        {large && <figcaption className="mt-1 w-16 text-center text-xs leading-tight text-muted">{PROFESSOR_NAME}</figcaption>}
      </figure>
      <div className="relative min-w-0 flex-1">
        <span aria-hidden="true" className={`absolute -left-1 size-2.5 rotate-45 bg-surface ${large ? 'top-6' : 'top-4'}`} />
        <div className="relative flex min-w-0 flex-col gap-2">{children}</div>
      </div>
    </div>
  )
}
