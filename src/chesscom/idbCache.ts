import type { CacheStore } from './api'

const DB_NAME = 'treinador-xadrez'
const STORE = 'chesscom'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Cache no IndexedDB: um mês de partidas não caberia no localStorage. */
export const idbCache: CacheStore = {
  async get<T>(key: string) {
    const db = await open()
    return new Promise<{ value: T; savedAt: number } | null>((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(key)
      request.onsuccess = () => resolve((request.result as { value: T; savedAt: number } | undefined) ?? null)
      request.onerror = () => reject(request.error)
    })
  },
  async set<T>(key: string, value: T) {
    const db = await open()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite')
      transaction.objectStore(STORE).put({ value, savedAt: Date.now() }, key)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  },
}
