import type { ReactNode } from 'react'
import { useQueue } from '../data/queue'
import { Logo, ZoneRamp } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { navigate, type Route } from '../route'

const ITEMS: { path: string; label: string; icon: string; active: Route['name'][] }[] = [
  { path: '#/', label: 'Início', icon: 'M12 3 2 12h3v8h5v-6h4v6h5v-8h3z', active: ['home', 'data'] },
  { path: '#/partidas', label: 'Partidas', icon: 'M4 5h16v2H4zm0 6h16v2H4zm0 6h16v2H4z', active: ['games'] },
  { path: '#/treino', label: 'Treino', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12m0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6', active: ['training', 'puzzles', 'session'] },
  { path: '#/guia', label: 'Guia', icon: 'M6 2h13v20H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3m0 15a1 1 0 0 0 0 4h11v-4zm2-11v2h8V6zm0 4v2h6v-2z', active: ['guide', 'opening', 'family', 'lesson', 'my-openings', 'practice'] },
  { path: '#/progresso', label: 'Progresso', icon: 'M4 20V10h3v10zm6.5 0V4h3v16zM17 20v-7h3v7z', active: ['progress'] },
]

/** Navegação das telas de consulta. Tabuleiro em uso fica de tela cheia, sem esta barra. */
export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const queue = useQueue()
  const links = ITEMS.map((item) => {
    const current = item.active.includes(route.name)
    return (
      <a
        key={item.path}
        href={item.path}
        aria-current={current ? 'page' : undefined}
        onClick={(event) => {
          event.preventDefault()
          navigate(item.path)
        }}
        className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 border-t-3 text-xs font-semibold lg:min-h-11 lg:flex-none lg:flex-row lg:gap-2 lg:border-t-0 lg:border-b-3 lg:px-3 lg:text-sm ${current ? 'border-action text-ink' : 'border-transparent text-muted hover:text-ink'}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 lg:size-5" fill="currentColor">
          <path d={item.icon} />
        </svg>
        {item.label}
      </a>
    )
  })

  return (
    <div className="flex min-h-dvh flex-col">
      <ZoneRamp />
      <header className="hidden border-b border-line lg:block">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-6 px-4 py-1.5">
          <a
            href="#/"
            onClick={(event) => {
              event.preventDefault()
              navigate('#/')
            }}
            className="rounded-sm"
            aria-label="Virada, início"
          >
            <Logo size="text-xl" markClassName="size-6" />
          </a>
          <nav aria-label="Seções" className="flex gap-1">
            {links}
          </nav>
          <ThemeToggle className="ml-auto" />
        </div>
      </header>

      <div className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</div>

      {queue.running && (
        <p role="status" className="fixed inset-x-2 bottom-[4.75rem] z-10 truncate rounded-md bg-ink px-3 py-1.5 text-sm text-bg lg:right-4 lg:bottom-4 lg:left-auto lg:w-80">
          Analisando em segundo plano: faltam {queue.remaining}
        </p>
      )}

      <nav aria-label="Seções" className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-bg px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {links}
      </nav>
    </div>
  )
}
