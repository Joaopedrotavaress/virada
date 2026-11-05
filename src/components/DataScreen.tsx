import { useEffect, useRef, useState } from 'react'
import { BackupError, downloadJson, exportAll, mergeBackup, parseBackup } from '../data/backup'
import { recordsFor, requestPersistence, useAllRecords } from '../data/library'

const formatBytes = (bytes: number) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1).replace('.', ',')} GB` : `${Math.max(1, Math.round(bytes / 1e6))} MB`)

/** Onde ficam os dados, quanto ocupam e como levar para outro aparelho. */
export function DataScreen({ username }: { username: string }) {
  const records = recordsFor(useAllRecords(), username)
  const analyzed = records.filter((record) => record.digest).length
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [usage, setUsage] = useState<{ used: number; total: number } | null>(null)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [isPersisted, estimate] = await Promise.all([navigator.storage?.persisted?.(), navigator.storage?.estimate?.()])
        if (!alive) return
        setPersisted(isPersisted ?? null)
        if (estimate?.usage !== undefined && estimate.quota) setUsage({ used: estimate.usage, total: estimate.quota })
      } catch {
        // Sem estas informações, a tela só não mostra os números.
      }
    })()
    return () => {
      alive = false
    }
  }, [records.length])

  const saveBackup = async (analyses: boolean) => {
    setBusy(true)
    setMessage(null)
    try {
      const data = await exportAll({ analyses })
      const day = new Date().toISOString().slice(0, 10)
      downloadJson(data, `treinador-xadrez-${day}${analyses ? '' : '-sem-analises'}.json`)
      setMessage({ text: `Backup pronto, com ${data.games.filter((game) => !game.deletedAt).length} partidas.` })
    } catch {
      setMessage({ text: 'Não consegui gerar o backup. Tente de novo.', error: true })
    } finally {
      setBusy(false)
    }
  }

  const restore = async (file: File) => {
    setBusy(true)
    setMessage(null)
    try {
      const report = await mergeBackup(parseBackup(await file.text()))
      setMessage({ text: `Backup restaurado: ${report.games} partidas, ${report.analyses} análises e ${report.cards} exercícios entraram ou foram atualizados. O que já estava aqui e era mais novo continua.` })
    } catch (failure) {
      setMessage({ text: failure instanceof BackupError ? failure.message : 'Não consegui ler este arquivo. Nada foi alterado.', error: true })
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-10 lg:pt-8">
      <h1 className="font-book text-3xl font-semibold">Seus dados</h1>
      <p className="mt-2 max-w-prose text-muted">Partidas, análises e treino ficam neste aparelho, sem conta e sem servidor. Um backup leva tudo para outro aparelho.</p>

      <dl className="mt-4 divide-y divide-line rounded-md bg-surface px-4">
        <div className="flex justify-between gap-4 py-3">
          <dt>Partidas guardadas</dt>
          <dd className="tabular font-semibold">{records.length}</dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt>Com análise</dt>
          <dd className="tabular font-semibold">{analyzed}</dd>
        </div>
        {usage && (
          <div className="flex justify-between gap-4 py-3">
            <dt>Espaço usado</dt>
            <dd className="tabular font-semibold">
              {formatBytes(usage.used)} de {formatBytes(usage.total)}
            </dd>
          </div>
        )}
        {persisted !== null && (
          <div className="flex items-center justify-between gap-4 py-3">
            <dt>
              Proteção contra limpeza automática
              {!persisted && <span className="block text-sm text-muted">Sem ela, o navegador pode apagar os dados quando faltar espaço.</span>}
            </dt>
            <dd className="shrink-0 font-semibold">
              {persisted ? (
                'Ligada'
              ) : (
                <button type="button" onClick={() => void requestPersistence().then(setPersisted)} className="min-h-11 rounded-md border border-line px-3 font-semibold hover:bg-sunken">
                  Ligar
                </button>
              )}
            </dd>
          </div>
        )}
      </dl>

      <section className="mt-6">
        <h2 className="font-book text-xl font-semibold">Backup</h2>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" disabled={busy} onClick={() => void saveBackup(true)} className="min-h-12 rounded-md bg-ink px-5 font-semibold text-bg disabled:opacity-60">
            Salvar backup completo
          </button>
          <button type="button" disabled={busy} onClick={() => void saveBackup(false)} className="min-h-12 rounded-md border border-line px-5 font-semibold hover:bg-sunken disabled:opacity-60">
            Salvar sem as análises
          </button>
          <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="min-h-12 rounded-md border border-line px-5 font-semibold hover:bg-sunken disabled:opacity-60">
            Restaurar de um arquivo
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            aria-label="Arquivo de backup"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void restore(file)
            }}
          />
        </div>
        <p className="mt-2 max-w-prose text-sm text-muted">Sem as análises, o arquivo fica bem menor. As análises podem ser refeitas depois, porque o PGN vai junto.</p>
        {message && (
          <p role={message.error ? 'alert' : 'status'} className={`mt-3 rounded-md bg-surface p-3 ${message.error ? 'font-medium text-(--text-blunder)' : ''}`}>
            {message.text}
          </p>
        )}
      </section>
    </main>
  )
}
