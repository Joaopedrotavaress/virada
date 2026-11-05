// Gera src/puzzles/puzzles.json: um recorte da base aberta de puzzles do Lichess (CC0).
// Só precisa rodar de novo para trocar o recorte; o arquivo gerado fica no repositório.
//
//   npm install --no-save fzstd
//   node scripts/build-puzzles.mjs
//
// Lê o arquivo aos poucos e para assim que tem puzzles suficientes: não baixa os 310 MB inteiros.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'
import { Decompress } from 'fzstd'

const URL_BASE = 'https://database.lichess.org/lichess_db_puzzle.csv.zst'
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const destino = join(raiz, 'src', 'puzzles', 'puzzles.json')

const TEMAS = [
  'fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck', 'hangingPiece', 'deflection', 'attraction',
  'intermezzo', 'sacrifice', 'trappedPiece', 'backRankMate', 'smotheredMate', 'mateIn1', 'mateIn2', 'mateIn3',
  'kingsideAttack', 'endgame', 'pawnEndgame', 'rookEndgame', 'queenEndgame', 'opening',
]
const FAIXAS = [[400, 1000], [1000, 1400], [1400, 1800], [1800, 2300]]
const POR_GRUPO = 30
const MAX_LINHAS = 3_000_000

const grupos = new Map()
const escolhidos = new Map()
let linhas = 0

const faixaDe = (nota) => FAIXAS.findIndex(([de, ate]) => nota >= de && nota < ate)
const completo = () => TEMAS.every((tema) => FAIXAS.every((_, faixa) => (grupos.get(`${tema}|${faixa}`) ?? 0) >= POR_GRUPO))

function valido(fen, lances) {
  try {
    const chess = new Chess(fen)
    for (const uci of lances) chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    return true
  } catch {
    return false
  }
}

function linha(texto) {
  linhas += 1
  const colunas = texto.split(',')
  if (colunas.length < 8 || colunas[0] === 'PuzzleId') return
  const [id, fen, moves, nota, desvio, popularidade, jogadas, temas] = colunas
  const rating = Number(nota)
  const faixa = faixaDe(rating)
  if (faixa === -1 || Number(desvio) > 100 || Number(popularidade) < 80 || Number(jogadas) < 300) return
  const lista = temas.split(' ')
  const lances = moves.split(' ')
  const uteis = lista.filter((tema) => TEMAS.includes(tema))
  if (uteis.length === 0 || lances.length < 2 || lances.length > 8) return
  // Só conta para os grupos que ainda estão incompletos.
  const novos = uteis.filter((tema) => (grupos.get(`${tema}|${faixa}`) ?? 0) < POR_GRUPO)
  if (novos.length === 0 || !valido(fen, lances)) return
  for (const tema of novos) grupos.set(`${tema}|${faixa}`, (grupos.get(`${tema}|${faixa}`) ?? 0) + 1)
  escolhidos.set(id, [id, fen, moves, rating, uteis.join(' ')])
}

const resposta = await fetch(URL_BASE, { headers: { 'User-Agent': 'treinador-xadrez build script' } })
if (!resposta.ok || !resposta.body) throw new Error(`Download falhou: ${resposta.status}`)

let resto = ''
const decodificador = new TextDecoder()
const zstd = new Decompress((pedaco) => {
  resto += decodificador.decode(pedaco, { stream: true })
  const partes = resto.split('\n')
  resto = partes.pop() ?? ''
  for (const parte of partes) linha(parte)
})

const leitor = resposta.body.getReader()
for (;;) {
  const { done, value } = await leitor.read()
  if (done) break
  zstd.push(value)
  if (completo() || linhas >= MAX_LINHAS) {
    await leitor.cancel()
    break
  }
}

const lista = [...escolhidos.values()].sort((a, b) => a[3] - b[3])
mkdirSync(dirname(destino), { recursive: true })
writeFileSync(destino, JSON.stringify(lista))
const faltando = TEMAS.flatMap((tema) => FAIXAS.flatMap((_, faixa) => ((grupos.get(`${tema}|${faixa}`) ?? 0) < POR_GRUPO ? [`${tema}|${faixa}=${grupos.get(`${tema}|${faixa}`) ?? 0}`] : [])))
console.log(`[puzzles] ${linhas} linhas lidas, ${lista.length} puzzles guardados`)
if (faltando.length > 0) console.log(`[puzzles] grupos incompletos: ${faltando.join(', ')}`)
