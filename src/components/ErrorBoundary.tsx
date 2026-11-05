import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

/** Um erro numa tela não pode virar tela branca: os dados continuam guardados. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro na tela:', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 p-6">
        <h1 className="font-display text-3xl font-semibold">Esta tela teve um problema</h1>
        <p className="text-muted">Suas partidas continuam guardadas. Voltar ao início costuma resolver.</p>
        <button
          type="button"
          onClick={() => {
            window.location.hash = '#/'
            window.location.reload()
          }}
          className="min-h-12 rounded-md bg-action px-5 font-semibold text-on-action"
        >
          Voltar ao início
        </button>
      </main>
    )
  }
}
