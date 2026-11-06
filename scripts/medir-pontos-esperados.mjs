// Mede a curva de pontos esperados usada em src/chess/expectedPoints.ts: de cada avaliação do Stockfish,
// quantos pontos as brancas fizeram de verdade, em cada faixa de rating.
// A fonte é a base aberta de partidas do Lichess (CC0). Só entram partidas com avaliação, sem bullet e entre jogadores
// de rating parecido. Só precisa rodar de novo para refazer a medição.
//
//   npm install --no-save fzstd
//   node scripts/medir-pontos-esperados.mjs 400
//
// O número é quantos MB comprimidos ler. O arquivo inteiro tem 29 GB: a leitura para no limite.
import { Decompress } from 'fzstd'

const ENDERECO = 'https://database.lichess.org/standard/lichess_db_standard_rated_2024-06.pgn.zst'
const LIMITE_MB = Number(process.argv[2] ?? 400)
const FAIXAS = [0, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500, 4000]
const PASSO = 25
const TETO = 1500
const PRIMEIRO_LANCE = 8
const DIFERENCA_MAXIMA = 150

const faixaDe = (rating) => FAIXAS.findLastIndex((inicio) => rating >= inicio)
const dados = FAIXAS.slice(0, -1).map(() => Array.from({ length: (2 * TETO) / PASSO + 1 }, () => [0, 0]))
const partidasPorFaixa = FAIXAS.slice(0, -1).map(() => 0)

let brancas = 0
let pretas = 0
let resultado = null
let evento = ''

function linha(texto) {
  if (texto.startsWith('[WhiteElo ')) brancas = Number(texto.slice(11, -2))
  else if (texto.startsWith('[BlackElo ')) pretas = Number(texto.slice(11, -2))
  else if (texto.startsWith('[Result ')) resultado = texto.slice(9, -2)
  else if (texto.startsWith('[Event ')) evento = texto
  else if (texto.startsWith('1. ')) {
    if (!texto.includes('%eval') || !brancas || !pretas || Math.abs(brancas - pretas) > DIFERENCA_MAXIMA || !/Blitz|Rapid|Classical/.test(evento)) return
    const pontos = { '1-0': 1, '0-1': 0, '1/2-1/2': 0.5 }[resultado]
    if (pontos === undefined) return
    const faixa = faixaDe((brancas + pretas) / 2)
    partidasPorFaixa[faixa] += 1
    let lance = 0
    for (const achado of texto.matchAll(/\[%eval (#?)(-?[\d.]+)\]/g)) {
      lance += 1
      if (lance < PRIMEIRO_LANCE || achado[1]) continue
      const cp = Math.max(-TETO, Math.min(TETO, Math.round((Number(achado[2]) * 100) / PASSO) * PASSO))
      const casa = dados[faixa][(cp + TETO) / PASSO]
      casa[0] += 1
      casa[1] += pontos
    }
  }
}

let resto = ''
const descompressor = new Decompress((pedaco) => {
  resto += Buffer.from(pedaco).toString('latin1')
  let inicio = 0
  let fim
  while ((fim = resto.indexOf('\n', inicio)) >= 0) {
    linha(resto.slice(inicio, fim))
    inicio = fim + 1
  }
  resto = resto.slice(inicio)
})

const leitor = (await fetch(ENDERECO)).body.getReader()
let lidos = 0
while (lidos < LIMITE_MB * 1e6) {
  const { done, value } = await leitor.read()
  if (done) break
  descompressor.push(value)
  lidos += value.length
}

/** A inclinação k de 1 / (1 + e^(-k * cp)) que melhor explica os resultados da faixa. */
function ajustar(casas) {
  let melhor = [0, -Infinity]
  for (let k = 0.001; k < 0.008; k += 0.00005) {
    let verossimilhanca = 0
    casas.forEach(([quantos, pontos], indice) => {
      if (!quantos) return
      const chance = 1 / (1 + Math.exp(-k * (indice * PASSO - TETO)))
      verossimilhanca += pontos * Math.log(chance) + (quantos - pontos) * Math.log(1 - chance)
    })
    if (verossimilhanca > melhor[1]) melhor = [k, verossimilhanca]
  }
  return melhor[0]
}

dados.forEach((casas, faixa) => {
  console.log(`${FAIXAS[faixa]}-${FAIXAS[faixa + 1]}: ${partidasPorFaixa[faixa]} partidas, inclinação ${ajustar(casas).toFixed(5)}`)
})
process.exit(0)
