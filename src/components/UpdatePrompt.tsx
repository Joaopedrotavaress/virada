import { useRegisterSW } from 'virtual:pwa-register/react'

/** Avisa quando há versão nova. A atualização nunca interrompe uma partida sem a pessoa pedir. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div role="status" className="fixed inset-x-2 bottom-20 z-30 flex items-center gap-3 rounded-md bg-ink p-3 text-bg shadow-lg sm:right-4 sm:bottom-4 sm:left-auto sm:w-96">
      <p className="min-w-0 flex-1 font-semibold">Nova versão disponível</p>
      <button type="button" onClick={() => void updateServiceWorker(true)} className="min-h-11 shrink-0 rounded-md bg-bg px-4 font-semibold text-ink">
        Atualizar
      </button>
      <button type="button" onClick={() => setNeedRefresh(false)} aria-label="Agora não" className="flex size-11 shrink-0 items-center justify-center text-xl">
        ×
      </button>
    </div>
  )
}
