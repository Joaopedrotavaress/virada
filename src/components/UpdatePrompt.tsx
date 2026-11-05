import { useRegisterSW } from 'virtual:pwa-register/react'
import { Icon } from './Icons'

/** Avisa quando há versão nova. A atualização nunca interrompe uma partida sem a pessoa pedir. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div role="status" className="fixed inset-x-2 bottom-20 z-30 flex items-center gap-3 rounded-md bg-action p-3 text-on-action shadow-lg sm:right-4 sm:bottom-4 sm:left-auto sm:w-96">
      <p className="min-w-0 flex-1 font-semibold">Nova versão disponível</p>
      <button type="button" onClick={() => void updateServiceWorker(true)} className="min-h-11 shrink-0 rounded-md bg-on-action px-4 font-semibold text-action">
        Atualizar
      </button>
      <button type="button" onClick={() => setNeedRefresh(false)} aria-label="Agora não" className="flex size-11 shrink-0 items-center justify-center text-xl">
        <Icon name="close" />
      </button>
    </div>
  )
}
