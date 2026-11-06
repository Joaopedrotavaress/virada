// O que o motor aceita da internet. Tudo que vira comando do Stockfish passa por aqui: sem isso, uma quebra de
// linha no meio de uma posição viraria outro comando.

export const LIMITES = { posicoes: 400, profundidadeMin: 8, profundidadeMax: 24, linhasMax: 3, corpoBytes: 128 * 1024 }

const FEN = /^([pnbrqkPNBRQK1-8]+(?:\/[pnbrqkPNBRQK1-8]+){7}) ([wb]) (-|K?Q?k?q?) (-|[a-h][36]) (\d{1,3}) (\d{1,4})$/

export function fenValida(fen) {
  if (typeof fen !== 'string' || fen.length > 100) return false
  const achado = FEN.exec(fen)
  if (!achado) return false
  const fileiras = achado[1].split('/')
  for (const fileira of fileiras) {
    let casas = 0
    for (const letra of fileira) casas += /\d/.test(letra) ? Number(letra) : 1
    if (casas !== 8) return false
  }
  const contar = (letra) => achado[1].split(letra).length - 1
  if (contar('K') !== 1 || contar('k') !== 1) return false
  if (/[pP]/.test(fileiras[0]) || /[pP]/.test(fileiras[7])) return false
  // O castling vazio passaria na expressão acima como campo em branco.
  return achado[3] !== ''
}

/** Lê o pedido. Devolve os dados ou o motivo da recusa. */
export function lerPedido(corpo) {
  if (!corpo || !Array.isArray(corpo.fens)) return { erro: 'faltam as posições' }
  if (corpo.fens.length === 0 || corpo.fens.length > LIMITES.posicoes) return { erro: 'quantidade de posições fora do limite' }
  if (!corpo.fens.every(fenValida)) return { erro: 'posição inválida' }
  const profundidade = Number(corpo.profundidade)
  if (!Number.isInteger(profundidade) || profundidade < LIMITES.profundidadeMin || profundidade > LIMITES.profundidadeMax) return { erro: 'profundidade fora do limite' }
  const linhas = Number(corpo.linhas ?? 1)
  if (!Number.isInteger(linhas) || linhas < 1 || linhas > LIMITES.linhasMax) return { erro: 'linhas fora do limite' }
  return { fens: corpo.fens, profundidade, linhas }
}

/** A mesma posição com contadores diferentes dá a mesma busca. O contador de 50 lances só importa quando está perto do fim. */
export function chaveDe(fen, profundidade, linhas) {
  const campos = fen.split(' ')
  const meio = Number(campos[4])
  return `${campos.slice(0, 4).join(' ')} ${meio >= 30 ? meio : 0}|${profundidade}|${linhas}`
}

const ORIGENS = [/^https:\/\/virada-kappa\.vercel\.app$/, /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/]
export const origemPermitida = (origem) => typeof origem === 'string' && ORIGENS.some((regra) => regra.test(origem))

/** Lê uma linha "info" do Stockfish. Nulo se não tiver avaliação completa. */
export function lerInfo(linha) {
  if (!linha.startsWith('info ') || !linha.includes(' pv ') || !linha.includes(' score ')) return null
  if (/ (lowerbound|upperbound)/.test(linha)) return null
  const pontos = / score (cp|mate) (-?\d+)/.exec(linha)
  const fundo = / depth (\d+)/.exec(linha)
  const qual = / multipv (\d+)/.exec(linha)
  if (!pontos || !fundo) return null
  return { linha: qual ? Number(qual[1]) : 1, depth: Number(fundo[1]), score: { type: pontos[1], value: Number(pontos[2]) }, pv: linha.split(' pv ')[1].trim().split(' ') }
}

/** Limita quanto cada endereço pode pedir, em janelas de tempo. */
export function criarCota({ janelaMs, posicoes, agora = Date.now }) {
  const uso = new Map()
  return {
    pode(ip, quantas) {
      const hoje = agora()
      const atual = uso.get(ip)
      if (!atual || hoje - atual.inicio > janelaMs) {
        if (uso.size > 5000) uso.clear()
        uso.set(ip, { inicio: hoje, usadas: quantas })
        return quantas <= posicoes
      }
      if (atual.usadas + quantas > posicoes) return false
      atual.usadas += quantas
      return true
    },
  }
}
