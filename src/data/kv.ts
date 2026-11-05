import { useEffect, useState } from 'react'
import type { KvEntry } from './backup'
import { STORES, readValue, writeMany } from './db'

/** Pequenos dados da pessoa (repertório, sequência de dias, lições feitas), com a data para a sincronização. */
export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const entry = await readValue<KvEntry>(STORES.kv, key)
    return entry ? (entry.value as T) : fallback
  } catch {
    return fallback
  }
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await writeMany(STORES.kv, [{ key, value: { value, updatedAt: Date.now() } satisfies KvEntry }])
  for (const listener of listeners.get(key) ?? []) listener(value)
}

const listeners = new Map<string, Set<(value: unknown) => void>>()

/** Valor guardado, atualizado em todas as telas abertas. */
export function useKv<T>(key: string, fallback: T): [T, (next: T) => void, boolean] {
  const [state, setState] = useState<{ value: T; loaded: boolean }>({ value: fallback, loaded: false })
  useEffect(() => {
    let alive = true
    void kvGet(key, fallback).then((value) => {
      if (alive) setState({ value, loaded: true })
    })
    const listener = (value: unknown) => setState({ value: value as T, loaded: true })
    const set = listeners.get(key) ?? new Set()
    set.add(listener)
    listeners.set(key, set)
    return () => {
      alive = false
      set.delete(listener)
    }
    // O valor padrão só vale na primeira leitura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const update = (next: T) => {
    setState({ value: next, loaded: true })
    void kvSet(key, next).catch(() => undefined)
  }
  return [state.value, update, state.loaded]
}
