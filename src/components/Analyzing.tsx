import type { ParsedGame } from '../chess/pgn'
import { Board } from './Board'

interface AnalyzingProps {
  game: ParsedGame
  done: number
  total: number
  orientation: 'white' | 'black'
  onCancel: () => void
}

export function Analyzing({ game, done, total, orientation, onCancel }: AnalyzingProps) {
  const moves = game.moves.length
  // Mostra a posição em que o motor está pensando agora.
  const shown = Math.min(done, game.positions.length - 1)
  const current = Math.max(1, Math.min(done, moves))
  const percent = Math.round((done / total) * 100)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-4 py-6">
      <div>
        <h1 className="font-book truncate text-xl font-semibold">
          {game.white} contra {game.black}
        </h1>
      </div>
      <div className="mx-auto w-full" style={{ maxWidth: 'max(14rem, calc(100dvh - 14rem))' }}>
        <Board fen={game.positions[shown].fen} orientation={orientation} />
      </div>
      <div>
        <p className="tabular mb-2 font-semibold" aria-live="polite">
          Analisando lance {current} de {moves}
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Progresso da análise"
          className="h-2 overflow-hidden rounded-full bg-sunken"
        >
          <div className="h-full rounded-full bg-ink transition-[width] duration-150" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <button type="button" onClick={onCancel} className="min-h-12 rounded-md border border-line font-semibold hover:bg-sunken">
        Cancelar
      </button>
    </main>
  )
}
