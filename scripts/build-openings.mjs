// Gera src/chess/openings.generated.json a partir da base aberta do Lichess
// (github.com/lichess-org/chess-openings, CC0), guardada em data/openings.
// Roda no postinstall e antes do build: nada é baixado em tempo de execução.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

// As famílias mais comuns têm nome consagrado em português.
const FAMILIAS = {
  "Sicilian Defense": 'Defesa Siciliana',
  "French Defense": 'Defesa Francesa',
  "Queen's Gambit Declined": 'Gambito da Dama Recusado',
  "Queen's Gambit Accepted": 'Gambito da Dama Aceito',
  "Queen's Gambit": 'Gambito da Dama',
  'Italian Game': 'Abertura Italiana',
  'English Opening': 'Abertura Inglesa',
  "King's Gambit Accepted": 'Gambito do Rei Aceito',
  "King's Gambit Declined": 'Gambito do Rei Recusado',
  "King's Gambit": 'Gambito do Rei',
  "King's Indian Defense": 'Defesa Índia do Rei',
  "King's Indian Attack": 'Ataque Índio do Rei',
  'Caro-Kann Defense': 'Defesa Caro-Kann',
  'Nimzo-Indian Defense': 'Defesa Nimzoíndia',
  "Queen's Pawn Game": 'Jogo do Peão da Dama',
  "Queen's Indian Defense": 'Defesa Índia da Dama',
  'Semi-Slav Defense': 'Defesa Semi-Eslava',
  'Dutch Defense': 'Defesa Holandesa',
  'Indian Defense': 'Defesa Índia',
  'Slav Defense': 'Defesa Eslava',
  "Petrov's Defense": 'Defesa Petrov',
  'Four Knights Game': 'Jogo dos Quatro Cavalos',
  'Three Knights Opening': 'Abertura dos Três Cavalos',
  'Scandinavian Defense': 'Defesa Escandinava',
  'Scotch Game': 'Abertura Escocesa',
  'Vienna Game': 'Abertura Vienense',
  'Vienna Gambit': 'Gambito Vienense',
  "Bishop's Opening": 'Abertura do Bispo',
  'Modern Defense': 'Defesa Moderna',
  "King's Pawn Game": 'Jogo do Peão do Rei',
  'Catalan Opening': 'Abertura Catalã',
  'Polish Opening': 'Abertura Polonesa',
  'Bogo-Indian Defense': 'Defesa Bogo-Índia',
  'Hungarian Opening': 'Abertura Húngara',
  'Center Game': 'Jogo do Centro',
  'Latvian Gambit': 'Gambito Letão',
  'Latvian Gambit Accepted': 'Gambito Letão Aceito',
  'Old Indian Defense': 'Defesa Índia Antiga',
  'London System': 'Sistema Londres',
  'Ruy Lopez': 'Ruy Lopez',
}

const PALAVRAS = [
  [/\bMain Line\b/g, 'Linha Principal'],
  [/\bExchange Variation\b/g, 'Variante das Trocas'],
  [/\bAdvance Variation\b/g, 'Variante do Avanço'],
  [/\bClassical Variation\b/g, 'Variante Clássica'],
  [/\bClosed Variation\b/g, 'Variante Fechada'],
  [/\bOpen Variation\b/g, 'Variante Aberta'],
  [/\bModern Variation\b/g, 'Variante Moderna'],
  [/\bAccepted\b/g, 'Aceito'],
  [/\bDeclined\b/g, 'Recusado'],
  [/([^,:]+?) Variation\b/g, 'Variante$1'],
]

function traduzirFamilia(familia) {
  if (FAMILIAS[familia]) return FAMILIAS[familia]
  const generico = familia.match(/^(.+) (Defense|Opening|Game|Gambit|Attack|System)( Accepted| Declined)?$/)
  if (!generico) return familia
  const tipo = { Defense: 'Defesa', Opening: 'Abertura', Game: 'Jogo', Gambit: 'Gambito', Attack: 'Ataque', System: 'Sistema' }[generico[2]]
  const estado = generico[3] ? { ' Accepted': ' Aceito', ' Declined': ' Recusado' }[generico[3]] : ''
  return `${tipo} ${generico[1]}${estado}`
}

export function traduzir(nome) {
  const separador = nome.indexOf(':')
  const familia = separador === -1 ? nome : nome.slice(0, separador)
  let resto = separador === -1 ? '' : nome.slice(separador)
  for (const [padrao, troca] of PALAVRAS) {
    resto = resto.replace(padrao, (match, grupo) => (typeof grupo === 'string' ? `${grupo.startsWith(':') || grupo.startsWith(',') ? grupo[0] + ' ' : ' '}Variante ${grupo.replace(/^[:,]?\s*/, '')}` : troca))
  }
  return `${traduzirFamilia(familia)}${resto}`.replace(/\s+/g, ' ').trim()
}

const chave = (fen) => fen.split(' ').slice(0, 4).join(' ')

const nomes = []
const indiceDoNome = new Map()
/** Posição → índice do nome, ou -1 para posição de livro sem nome próprio. */
const posicoes = {}

let linhas = 0
for (const letra of ['a', 'b', 'c', 'd', 'e']) {
  const texto = readFileSync(join(raiz, 'data', 'openings', `${letra}.tsv`), 'utf8')
  for (const linha of texto.split('\n').slice(1)) {
    if (!linha.trim()) continue
    const [eco, nome, pgn] = linha.split('\t')
    const chess = new Chess()
    const lances = pgn.replace(/\d+\.+/g, ' ').trim().split(/\s+/)
    for (const lance of lances) {
      chess.move(lance)
      const k = chave(chess.fen())
      if (!(k in posicoes)) posicoes[k] = -1
    }
    const rotulo = `${eco}|${traduzir(nome)}`
    if (!indiceDoNome.has(rotulo)) {
      indiceDoNome.set(rotulo, nomes.length)
      nomes.push(rotulo)
    }
    // Se a mesma posição tem mais de um nome (transposição), fica o primeiro da base.
    const k = chave(chess.fen())
    if (posicoes[k] === -1) posicoes[k] = indiceDoNome.get(rotulo)
    linhas += 1
  }
}

const destino = join(raiz, 'src', 'chess', 'openings.generated.json')
writeFileSync(destino, JSON.stringify({ names: nomes, positions: posicoes }))
console.log(`[aberturas] ${linhas} linhas, ${Object.keys(posicoes).length} posições, ${nomes.length} nomes`)
