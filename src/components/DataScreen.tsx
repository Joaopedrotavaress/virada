import { useEffect, useRef, useState } from 'react'
import { BackupError, downloadJson, exportAll, mergeBackup, parseBackup } from '../data/backup'
import { GistError, forgetGist, loadGistToken, loadLastGistSync, saveGistToken, syncGist } from '../data/gistSync'
import { recordsFor, requestPersistence, useAllRecords } from '../data/library'
import { useLocalBackend } from '../data/localBackend'

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
  const backend = useLocalBackend()
  const [hasToken, setHasToken] = useState(() => Boolean(loadGistToken()))
  const [draftToken, setDraftToken] = useState('')
  const [lastGist, setLastGist] = useState(loadLastGistSync)
  const [gistBusy, setGistBusy] = useState(false)
  const [gistMessage, setGistMessage] = useState<{ text: string; error?: boolean } | null>(null)

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

  const runGist = async () => {
    setGistBusy(true)
    setGistMessage(null)
    try {
      const report = await syncGist()
      setLastGist(loadLastGistSync())
      setGistMessage({ text: report.created ? 'Gist privado criado, e seus dados foram enviados.' : `Sincronizado: ${report.received} itens vieram do gist.` })
    } catch (failure) {
      setGistMessage({ text: failure instanceof GistError ? failure.message : 'Não consegui sincronizar. Seus dados aqui continuam intactos.', error: true })
    } finally {
      setGistBusy(false)
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

      <section className="mt-8">
        <h2 className="font-book text-xl font-semibold">Sincronizar entre aparelhos</h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Opcional. Usa um gist secreto na sua conta do GitHub, sem nenhum servidor nosso. Partidas, notas e treino vão junto; as análises são refeitas no outro aparelho. Um gist secreto não aparece em buscas, mas quem tiver o link consegue ler.
        </p>
        {hasToken ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" disabled={gistBusy} onClick={() => void runGist()} className="min-h-12 rounded-md bg-ink px-5 font-semibold text-bg disabled:opacity-60">
              {gistBusy ? 'Sincronizando…' : 'Sincronizar agora'}
            </button>
            <button
              type="button"
              disabled={gistBusy}
              onClick={() => {
                forgetGist()
                setHasToken(false)
                setLastGist(null)
                setGistMessage({ text: 'Token apagado deste aparelho. O gist continua na sua conta do GitHub.' })
              }}
              className="min-h-12 rounded-md border border-line px-5 font-semibold hover:bg-sunken disabled:opacity-60"
            >
              Desligar
            </button>
          </div>
        ) : (
          <form
            className="mt-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!draftToken.trim()) return
              saveGistToken(draftToken)
              setDraftToken('')
              setHasToken(true)
              void runGist()
            }}
          >
            <label htmlFor="token-gist" className="mb-1 block text-sm font-semibold">
              Token do GitHub
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="token-gist" type="password" autoComplete="off" spellCheck={false} value={draftToken} onChange={(event) => setDraftToken(event.target.value)} className="min-h-12 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-base" />
              <button type="submit" disabled={!draftToken.trim()} className="min-h-12 shrink-0 rounded-md bg-ink px-5 font-semibold text-bg disabled:opacity-60">
                Ligar
              </button>
            </div>
            <p className="mt-2 max-w-prose text-sm text-muted">
              <a href="https://github.com/settings/tokens/new?scopes=gist&description=Treinador%20de%20Xadrez" target="_blank" rel="noreferrer" className="font-semibold text-ink underline">
                Criar um token no GitHub
              </a>{' '}
              com a permissão gist. Ele fica guardado só neste aparelho e só é enviado ao GitHub.
            </p>
          </form>
        )}
        {lastGist && <p className="mt-2 text-sm text-muted">Última sincronização: {new Date(lastGist).toLocaleString('pt-BR')}.</p>}
        {gistMessage && (
          <p role={gistMessage.error ? 'alert' : 'status'} className={`mt-3 rounded-md bg-surface p-3 ${gistMessage.error ? 'font-medium text-(--text-blunder)' : ''}`}>
            {gistMessage.text}
          </p>
        )}
      </section>

      {backend.info && (
        <section className="mt-8">
          <h2 className="font-book text-xl font-semibold">Computador local</h2>
          <p className="mt-1 max-w-prose text-muted">
            Conectado ao banco deste computador. Cada alteração também fica guardada lá{backend.info.engine ? ', e a análise em lote usa o motor completo.' : '.'}
          </p>
          {backend.lastSync && <p className="mt-1 text-sm text-muted">Última cópia: {new Date(backend.lastSync).toLocaleTimeString('pt-BR')}.</p>}
          {backend.error && (
            <p role="alert" className="mt-2 font-medium text-(--text-blunder)">
              A cópia falhou: {backend.error}. Os dados aqui continuam intactos.
            </p>
          )}
        </section>
      )}

      <p className="mt-8 text-sm text-muted">
        Código aberto sob a licença GPL-3.0. Puzzles e nomes de aberturas vêm das bases abertas do Lichess (CC0).
      </p>
    </main>
  )
}
