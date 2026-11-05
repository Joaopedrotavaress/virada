import { type BackupData, exportAll, mergeBackup, parseBackup } from './backup'

const API = 'https://api.github.com'
const DESCRIPTION = 'Treinador de Xadrez: dados sincronizados'
const FILE_NAME = 'treinador-dados.json'
const TOKEN_KEY = 'treinador:gist-token'
const GIST_KEY = 'treinador:gist-id'
const LAST_KEY = 'treinador:gist-ultima'

export type GistErrorKind = 'token' | 'scope' | 'offline' | 'not-found' | 'other'

const MESSAGES: Record<GistErrorKind, string> = {
  token: 'O GitHub não aceitou este token. Confira se ele foi copiado inteiro e se não expirou.',
  scope: 'Este token não tem permissão para gists. Crie outro marcando a opção "gist".',
  offline: 'Sem internet. Os dados continuam aqui, e dá para sincronizar depois.',
  'not-found': 'O gist de sincronização não foi encontrado. Sincronize de novo para criar outro.',
  other: 'O GitHub não respondeu como esperado. Tente de novo.',
}

export class GistError extends Error {
  kind: GistErrorKind
  constructor(kind: GistErrorKind) {
    super(MESSAGES[kind])
    this.name = 'GistError'
    this.kind = kind
  }
}

export interface GistDeps {
  fetch?: typeof fetch
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  now?: () => number
}

interface GistFile {
  content?: string
  truncated?: boolean
  raw_url?: string
}

interface Gist {
  id: string
  description?: string
  files: Record<string, GistFile | null>
}

export const loadGistToken = (storage: Pick<Storage, 'getItem'> = localStorage) => storage.getItem(TOKEN_KEY)
export const loadLastGistSync = (storage: Pick<Storage, 'getItem'> = localStorage) => Number(storage.getItem(LAST_KEY)) || null

/** O token fica só neste aparelho. Ele não entra em backup nem vai para o gist. */
export function saveGistToken(token: string, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(TOKEN_KEY, token.trim())
}

export function forgetGist(storage: Pick<Storage, 'removeItem'> = localStorage) {
  storage.removeItem(TOKEN_KEY)
  storage.removeItem(GIST_KEY)
  storage.removeItem(LAST_KEY)
}

function client(token: string, deps: GistDeps) {
  const doFetch = deps.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  return async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    let response: Response
    try {
      response = await doFetch(`${API}${path}`, {
        ...init,
        cache: 'no-store',
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
      })
    } catch {
      throw new GistError(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'other')
    }
    if (response.status === 401) throw new GistError('token')
    if (response.status === 403) throw new GistError('scope')
    if (response.status === 404) throw new GistError('not-found')
    if (!response.ok) throw new GistError('other')
    return (await response.json()) as T
  }
}

/** Para o gist, sem as análises: elas ocupam muito e podem ser refeitas a partir do PGN. */
export const serializeForGist = (data: BackupData) => JSON.stringify({ ...data, analyses: [] })

export interface GistSyncReport {
  received: number
  gistId: string
  created: boolean
}

/** Traz o que há no gist, junta com os dados daqui, e devolve tudo para o gist. */
export async function syncGist(deps: GistDeps = {}): Promise<GistSyncReport> {
  const storage = deps.storage ?? localStorage
  const token = storage.getItem(TOKEN_KEY)
  if (!token) throw new GistError('token')
  const call = client(token, deps)
  const doFetch = deps.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))

  let gistId = storage.getItem(GIST_KEY)
  let gist: Gist | null = null
  if (gistId) {
    try {
      gist = await call<Gist>(`/gists/${gistId}`)
    } catch (failure) {
      if (!(failure instanceof GistError && failure.kind === 'not-found')) throw failure
      gistId = null
    }
  }
  if (!gist) {
    const list = await call<Gist[]>('/gists?per_page=100')
    const found = list.find((item) => item.description === DESCRIPTION && item.files[FILE_NAME])
    if (found) gist = await call<Gist>(`/gists/${found.id}`)
  }

  let received = 0
  const file = gist?.files[FILE_NAME]
  if (file) {
    let content = file.content ?? ''
    // Arquivos grandes vêm cortados na resposta: o conteúdo inteiro fica no endereço cru.
    if ((file.truncated || !content) && file.raw_url) {
      const raw = await doFetch(file.raw_url, { cache: 'no-store' }).catch(() => null)
      if (!raw?.ok) throw new GistError('other')
      content = await raw.text()
    }
    if (content.trim()) {
      const report = await mergeBackup(parseBackup(content))
      received = report.games + report.cards
    }
  }

  const body = serializeForGist(await exportAll({ analyses: false }))
  const payload = JSON.stringify({ description: DESCRIPTION, files: { [FILE_NAME]: { content: body } } })
  const created = !gist
  const saved = gist ? await call<Gist>(`/gists/${gist.id}`, { method: 'PATCH', body: payload }) : await call<Gist>('/gists', { method: 'POST', body: JSON.stringify({ description: DESCRIPTION, public: false, files: { [FILE_NAME]: { content: body } } }) })
  storage.setItem(GIST_KEY, saved.id)
  storage.setItem(LAST_KEY, String((deps.now ?? Date.now)()))
  return { received, gistId: saved.id, created }
}
