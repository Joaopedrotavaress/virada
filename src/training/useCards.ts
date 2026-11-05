import { useCallback, useEffect, useState } from 'react'
import { useAllRecords } from '../data/library'
import { type TrainingCard, isDue, loadCards } from './cards'

/** Os exercícios guardados. Recarrega quando uma partida nova traz exercícios novos. */
export function useCards() {
  const [cards, setCards] = useState<TrainingCard[]>([])
  const [loaded, setLoaded] = useState(false)
  const records = useAllRecords()

  const reload = useCallback(async () => {
    try {
      setCards((await loadCards()).filter((card) => !card.deletedAt))
    } catch {
      setCards([])
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [records, reload])

  return { cards, loaded, reload, due: cards.filter((card) => isDue(card)) }
}
