import { useState } from 'react'
import { BOTS, type BotConfig } from '../bots/bots'
import type { Color } from '../chess/evaluation'
import { loadBotPrefs, saveBotPrefs } from '../storage'

export interface BotChoice {
  bot: BotConfig
  color: Color
  coachOn: boolean
  allowUndo: boolean
  time?: { base: number; increment: number }
}

/** De onde a partida começa, quando não é da posição inicial. */
export interface StartPoint {
  label: string
  fen?: string
  sans?: string[]
  /** Cor sugerida pela linha ou pela posição. */
  color?: Color
}

export const TIME_OPTIONS: { id: string; label: string; time?: { base: number; increment: number } }[] = [
  { id: 'none', label: 'Sem relógio' },
  { id: '3+2', label: '3 + 2', time: { base: 180, increment: 2 } },
  { id: '5+0', label: '5 + 0', time: { base: 300, increment: 0 } },
  { id: '10+0', label: '10 + 0', time: { base: 600, increment: 0 } },
]

type ColorChoice = 'w' | 'b' | 'random'

const COLORS: { value: ColorChoice; label: string }[] = [
  { value: 'w', label: 'Brancas' },
  { value: 'random', label: 'Sorteio' },
  { value: 'b', label: 'Pretas' },
]

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3 has-focus-visible:outline-2 has-focus-visible:outline-ink">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span aria-hidden="true" className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-ink' : 'bg-line'}`}>
        <span className={`absolute top-1 size-5 rounded-full bg-bg transition-[left] ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </label>
  )
}

export function BotSetup({ start, onStart, onBack }: { start?: StartPoint | null; onStart: (choice: BotChoice) => void; onBack: () => void }) {
  const [prefs] = useState(loadBotPrefs)
  const [botId, setBotId] = useState(prefs.botId)
  const [color, setColor] = useState<ColorChoice>(start?.color ?? prefs.color)
  const [timeId, setTimeId] = useState(prefs.timeId ?? 'none')
  const [coachOn, setCoachOn] = useState(prefs.coachOn)
  const [allowUndo, setAllowUndo] = useState(prefs.allowUndo)
  const time = TIME_OPTIONS.find((option) => option.id === timeId)?.time

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-2 pb-10 lg:pt-8">
      <button type="button" onClick={onBack} className="-ml-1 flex min-h-11 items-center gap-1 rounded-md pr-3 pl-1 font-semibold hover:bg-sunken">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="currentColor">
          <path d="M15.4 6.4 14 5l-7 7 7 7 1.4-1.4L9.8 12z" />
        </svg>
        Voltar
      </button>
      <h1 className="font-book mt-2 text-3xl font-semibold">Contra quem você quer jogar?</h1>
      <p className="mt-1 text-sm text-muted">As forças são aproximadas: servem para comparar um nível com o outro.</p>
      {start && <p className="mt-3 rounded-md bg-surface p-3 text-sm">A partida começa de: <span className="font-semibold">{start.label}</span></p>}

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault()
          const bot = BOTS.find((item) => item.id === botId) ?? BOTS[0]
          saveBotPrefs({ botId, color: start ? prefs.color : color, coachOn, allowUndo, timeId })
          onStart({ bot, color: color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color, coachOn, allowUndo: allowUndo && !time, time })
        }}
      >
        <fieldset>
          <legend className="sr-only">Bot</legend>
          <div className="divide-y divide-line overflow-hidden rounded-md bg-surface">
            {BOTS.map((bot) => (
              <label key={bot.id} className={`flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink ${botId === bot.id ? 'bg-ink text-bg' : 'hover:bg-sunken'}`}>
                <input type="radio" name="bot" value={bot.id} checked={botId === bot.id} onChange={() => setBotId(bot.id)} className="sr-only" />
                <span className="min-w-0 flex-1">
                  <span className="font-book block text-lg leading-tight font-semibold">{bot.name}</span>
                  <span className={`block text-sm ${botId === bot.id ? 'opacity-80' : 'text-muted'}`}>{bot.description}</span>
                </span>
                <span className={`tabular shrink-0 text-sm ${botId === bot.id ? 'opacity-80' : 'text-muted'}`}>{bot.rating}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="mb-1.5 text-sm font-semibold">Sua cor</legend>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line">
            {COLORS.map((option) => (
              <label key={option.value} className={`flex min-h-11 cursor-pointer items-center justify-center text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink ${color === option.value ? 'bg-ink text-bg' : 'bg-surface'}`}>
                <input type="radio" name="cor" checked={color === option.value} onChange={() => setColor(option.value)} className="sr-only" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="mb-1.5 text-sm font-semibold">Relógio</legend>
          <div className="grid grid-cols-4 gap-px overflow-hidden rounded-md border border-line bg-line">
            {TIME_OPTIONS.map((option) => (
              <label key={option.id} className={`flex min-h-11 cursor-pointer items-center justify-center px-1 text-center text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink ${timeId === option.id ? 'bg-ink text-bg' : 'bg-surface'}`}>
                <input type="radio" name="relogio" checked={timeId === option.id} onChange={() => setTimeId(option.id)} className="sr-only" />
                {option.label}
              </label>
            ))}
          </div>
          {time && <p className="mt-2 text-sm text-muted">Com relógio não dá para voltar lance. O tempo fica parado enquanto o treinador confere seu lance.</p>}
        </fieldset>

        <div className="mt-3 divide-y divide-line">
          <Toggle label="Treinador ligado" hint="Avisa dos erros e libera a dica e a ameaça." checked={coachOn} onChange={setCoachOn} />
          {!time && <Toggle label="Permitir voltar lance" hint="Deixa desfazer um lance durante a partida." checked={allowUndo} onChange={setAllowUndo} />}
        </div>

        <div className="sticky bottom-0 -mx-4 mt-3 bg-bg px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="submit" className="min-h-12 w-full rounded-md bg-ink px-5 font-semibold text-bg">
            Começar partida
          </button>
        </div>
      </form>
    </main>
  )
}
