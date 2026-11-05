import { STORES, readValue, writeMany } from '../data/db'
import type { CacheStore } from './api'

/** Cache no IndexedDB: um mês de partidas não caberia no localStorage. */
export const idbCache: CacheStore = {
  async get<T>(key: string) {
    return (await readValue<{ value: T; savedAt: number }>(STORES.cache, key)) ?? null
  },
  async set<T>(key: string, value: T) {
    await writeMany(STORES.cache, [{ key, value: { value, savedAt: Date.now() } }])
  },
}
