import { useTheme } from '../theme'
import { Icon } from './Icons'

/** Troca entre o tema escuro, que é o padrão, e o claro. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const label = theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} className={`flex size-11 shrink-0 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink ${className}`}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}
