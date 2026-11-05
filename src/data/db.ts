const DB_NAME = 'treinador-xadrez'
const VERSION = 2

export const STORES = { cache: 'chesscom', games: 'games', analyses: 'analyses', cards: 'cards', kv: 'kv' } as const
type StoreName = (typeof STORES)[keyof typeof STORES]

let connection: Promise<IDBDatabase> | null = null

/** Uma conexão só para o app inteiro. Outra aba atualizando o banco fecha esta, sem travar ninguém. */
export function openDb(): Promise<IDBDatabase> {
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORES.cache)) db.createObjectStore(STORES.cache)
      if (!db.objectStoreNames.contains(STORES.games)) db.createObjectStore(STORES.games, { keyPath: 'key' })
      if (!db.objectStoreNames.contains(STORES.analyses)) db.createObjectStore(STORES.analyses)
      if (!db.objectStoreNames.contains(STORES.cards)) db.createObjectStore(STORES.cards, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(STORES.kv)) db.createObjectStore(STORES.kv)
    }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => {
        db.close()
        connection = null
      }
      db.onclose = () => {
        connection = null
      }
      resolve(db)
    }
    request.onerror = () => {
      connection = null
      reject(request.error)
    }
    request.onblocked = () => {
      connection = null
      reject(new Error('Feche as outras abas do Virada e tente de novo.'))
    }
  })
  return connection
}

const done = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('Gravação cancelada'))
    transaction.onerror = () => reject(transaction.error)
  })

export async function readValue<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error)
  })
}

export async function readAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).getAll()
    request.onsuccess = () => resolve(request.result as T[])
    request.onerror = () => reject(request.error)
  })
}

export async function readEntries<T>(store: StoreName): Promise<{ key: string; value: T }[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const entries: { key: string; value: T }[] = []
    const request = db.transaction(store).objectStore(store).openCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) {
        resolve(entries)
        return
      }
      entries.push({ key: String(cursor.key), value: cursor.value as T })
      cursor.continue()
    }
    request.onerror = () => reject(request.error)
  })
}

/** Grava tudo numa transação só: ou entra tudo, ou nada. */
export async function writeMany(store: StoreName, items: { value: unknown; key?: IDBValidKey }[]): Promise<void> {
  if (items.length === 0) return
  const db = await openDb()
  const transaction = db.transaction(store, 'readwrite')
  const target = transaction.objectStore(store)
  for (const { value, key } of items) {
    if (key === undefined) target.put(value)
    else target.put(value, key)
  }
  await done(transaction)
}

export async function deleteValue(store: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDb()
  const transaction = db.transaction(store, 'readwrite')
  transaction.objectStore(store).delete(key)
  await done(transaction)
}

/** Só para os testes recomeçarem do zero. */
export function resetConnection() {
  connection = null
}
