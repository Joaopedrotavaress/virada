import { useState } from 'react'
import type { Video } from '../guide/aulas'

/** O vídeo só carrega quando a pessoa pede: a aula continua leve, funciona sem internet e nada vai ao YouTube antes disso. */
export function VideoCard({ video }: { video: Video }) {
  const [open, setOpen] = useState(false)
  const watchUrl = `https://www.youtube.com/watch?v=${video.id}`
  return (
    <article className="overflow-hidden rounded-md border border-line">
      {open ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0&autoplay=1`}
          title={video.title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="aspect-video w-full bg-black"
        />
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex min-h-16 w-full items-center gap-3 p-3 text-left hover:bg-sunken">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center bg-(--zone-3)">
            <svg viewBox="0 0 24 24" className="size-6" fill="currentColor">
              <path d="M8 5.6v12.8l10-6.4z" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block leading-snug font-semibold">{video.title}</span>
            <span className="block text-sm text-muted">
              {video.channel}, {video.minutes} min
            </span>
          </span>
        </button>
      )}
      <p className="border-t border-line px-3 py-1.5 text-sm text-muted">
        Vídeo de outro canal, no YouTube.{' '}
        <a href={watchUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
          Abrir lá
        </a>
      </p>
    </article>
  )
}
