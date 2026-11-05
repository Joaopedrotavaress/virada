// Backend opcional: roda só no computador da pessoa, com "npm run local".
// O site publicado não depende dele em nada. Serve o mesmo app e guarda uma cópia dos dados num SQLite.
// Só escuta em 127.0.0.1: nada fica acessível para outras máquinas da rede.
import { spawnSync } from 'node:child_process'
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs'
import http from 'node:http'
import { createRequire } from 'node:module'
import { dirname, extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const argumento = (nome, padrao) => {
  const indice = process.argv.indexOf(`--${nome}`)
  return indice === -1 ? padrao : process.argv[indice + 1]
}
const PORTA = Number(argumento('porta', 4300))
const PASTA_DADOS = resolve(argumento('dados', join(raiz, 'data-local')))
const PASTA_SITE = resolve(argumento('site', join(raiz, 'dist')))
const USAR_MOTOR = !process.argv.includes('--sem-motor')
const LIMITE_CORPO = 512 * 1024 * 1024

// ---------- Banco ----------

mkdirSync(PASTA_DADOS, { recursive: true })
const banco = new DatabaseSync(join(PASTA_DADOS, 'treinador.db'))
banco.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS games (key TEXT PRIMARY KEY, updated_at INTEGER NOT NULL, json TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS analyses (key TEXT PRIMARY KEY, depth INTEGER NOT NULL, updated_at INTEGER NOT NULL, json TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, updated_at INTEGER NOT NULL, json TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, updated_at INTEGER NOT NULL, json TEXT NOT NULL);
`)

const q = {
  jogo: banco.prepare('SELECT updated_at FROM games WHERE key = ?'),
  gravarJogo: banco.prepare('INSERT OR REPLACE INTO games (key, updated_at, json) VALUES (?, ?, ?)'),
  analise: banco.prepare('SELECT depth FROM analyses WHERE key = ?'),
  gravarAnalise: banco.prepare('INSERT OR REPLACE INTO analyses (key, depth, updated_at, json) VALUES (?, ?, ?, ?)'),
  apagarAnalise: banco.prepare('DELETE FROM analyses WHERE key = ?'),
  cartao: banco.prepare('SELECT updated_at FROM cards WHERE id = ?'),
  gravarCartao: banco.prepare('INSERT OR REPLACE INTO cards (id, updated_at, json) VALUES (?, ?, ?)'),
  valor: banco.prepare('SELECT updated_at FROM kv WHERE key = ?'),
  gravarValor: banco.prepare('INSERT OR REPLACE INTO kv (key, updated_at, json) VALUES (?, ?, ?)'),
  jogosDesde: banco.prepare('SELECT json FROM games WHERE updated_at > ?'),
  analisesDesde: banco.prepare('SELECT key, json FROM analyses WHERE updated_at > ?'),
  cartoesDesde: banco.prepare('SELECT json FROM cards WHERE updated_at > ?'),
  valoresDesde: banco.prepare('SELECT key, json FROM kv WHERE updated_at > ?'),
  contagem: banco.prepare('SELECT (SELECT COUNT(*) FROM games) AS games, (SELECT COUNT(*) FROM analyses) AS analyses'),
}

/** De cada item fica a versão mais nova, e de cada partida a análise mais profunda. */
function juntar(dados) {
  const agora = Date.now()
  let recebidos = 0
  banco.exec('BEGIN')
  try {
    for (const jogo of dados.games ?? []) {
      if (!jogo?.key) continue
      const atual = q.jogo.get(jogo.key)
      if (atual && atual.updated_at >= jogo.updatedAt) continue
      q.gravarJogo.run(jogo.key, jogo.updatedAt, JSON.stringify(jogo))
      if (jogo.deletedAt) q.apagarAnalise.run(jogo.key)
      recebidos += 1
    }
    for (const { key, analysis } of dados.analyses ?? []) {
      if (!key || !analysis) continue
      const atual = q.analise.get(key)
      if (atual && atual.depth >= analysis.depth) continue
      q.gravarAnalise.run(key, analysis.depth, agora, JSON.stringify(analysis))
      recebidos += 1
    }
    for (const cartao of dados.cards ?? []) {
      if (!cartao?.id) continue
      const atual = q.cartao.get(cartao.id)
      if (atual && atual.updated_at >= cartao.updatedAt) continue
      q.gravarCartao.run(cartao.id, cartao.updatedAt, JSON.stringify(cartao))
      recebidos += 1
    }
    for (const { key, value } of dados.kv ?? []) {
      if (!key || !value) continue
      const atual = q.valor.get(key)
      if (atual && atual.updated_at >= value.updatedAt) continue
      q.gravarValor.run(key, value.updatedAt, JSON.stringify(value))
      recebidos += 1
    }
    banco.exec('COMMIT')
  } catch (falha) {
    banco.exec('ROLLBACK')
    throw falha
  }
  return recebidos
}

function exportar(desde) {
  return {
    app: 'treinador-xadrez',
    version: 1,
    exportedAt: Date.now(),
    games: q.jogosDesde.all(desde).map((linha) => JSON.parse(linha.json)),
    analyses: q.analisesDesde.all(desde).map((linha) => ({ key: linha.key, analysis: JSON.parse(linha.json) })),
    cards: q.cartoesDesde.all(desde).map((linha) => JSON.parse(linha.json)),
    kv: q.valoresDesde.all(desde).map((linha) => ({ key: linha.key, value: JSON.parse(linha.json) })),
  }
}

// ---------- Motor completo, para análise em lote ----------

const SABOR_MOTOR = argumento('motor', 'single')
let motor = null
let filaMotor = Promise.resolve()

function carregarMotor() {
  if (motor) return motor
  const require = createRequire(import.meta.url)
  const carregar = require('stockfish')
  let aoReceber = () => {}
  const stockfish = carregar(SABOR_MOTOR, (linha) => aoReceber(linha))
  const enviar = (comando) => setImmediate(() => stockfish.processCommand(comando))
  const esperar = (fim) =>
    new Promise((resolver) => {
      const linhas = []
      aoReceber = (linha) => {
        linhas.push(linha)
        if (fim(linha)) resolver(linhas)
      }
    })
  const pronto = (async () => {
    const uci = esperar((linha) => linha === 'uciok')
    enviar('uci')
    await uci
    const ok = esperar((linha) => linha === 'readyok')
    enviar('isready')
    await ok
  })()
  motor = { pronto, enviar, esperar }
  return motor
}

function buscarNoMotor({ fen, depth, movetime, multiPv }) {
  const trabalho = filaMotor.then(async () => {
    const { pronto, enviar, esperar } = carregarMotor()
    await pronto
    enviar(`setoption name MultiPV value ${Number(multiPv) || 1}`)
    const ok = esperar((linha) => linha === 'readyok')
    enviar('isready')
    await ok
    const fim = esperar((linha) => linha.startsWith('bestmove'))
    enviar(`position fen ${fen}`)
    const limites = [depth ? `depth ${Number(depth)}` : '', movetime ? `movetime ${Number(movetime)}` : ''].filter(Boolean).join(' ')
    enviar(`go ${limites || 'depth 15'}`)
    return fim
  })
  filaMotor = trabalho.catch(() => undefined)
  return trabalho
}

// ---------- Servidor ----------

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' }

const responderJson = (resposta, status, corpo) => {
  resposta.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  resposta.end(JSON.stringify(corpo))
}

function lerCorpo(pedido) {
  return new Promise((resolver, rejeitar) => {
    const pedacos = []
    let tamanho = 0
    pedido.on('data', (pedaco) => {
      tamanho += pedaco.length
      if (tamanho > LIMITE_CORPO) {
        rejeitar(new Error('muito grande'))
        pedido.destroy()
        return
      }
      pedacos.push(pedaco)
    })
    pedido.on('end', () => resolver(Buffer.concat(pedacos).toString('utf8')))
    pedido.on('error', rejeitar)
  })
}

/** Outro site aberto no navegador não pode falar com este servidor. */
function origemPermitida(pedido) {
  const host = pedido.headers.host ?? ''
  const hostLocal = /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)
  const origem = pedido.headers.origin
  if (!hostLocal) return false
  if (!origem) return true
  try {
    return new URL(origem).host === host
  } catch {
    return false
  }
}

function servirArquivo(pedido, resposta, caminho) {
  const alvo = normalize(join(PASTA_SITE, decodeURIComponent(caminho)))
  if (alvo !== PASTA_SITE && !alvo.startsWith(PASTA_SITE + sep)) {
    resposta.writeHead(403).end()
    return
  }
  const existe = existsSync(alvo) && statSync(alvo).isFile()
  const arquivo = existe ? alvo : join(PASTA_SITE, 'index.html')
  if (!existsSync(arquivo)) {
    resposta.writeHead(404).end('Site não encontrado. Rode "npm run build".')
    return
  }
  const cache = existe && caminho.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
  resposta.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] ?? 'application/octet-stream', 'Cache-Control': cache })
  createReadStream(arquivo).pipe(resposta)
}

const servidor = http.createServer(async (pedido, resposta) => {
  const endereco = new URL(pedido.url ?? '/', 'http://local')
  if (!endereco.pathname.startsWith('/api/')) {
    if (pedido.method !== 'GET' && pedido.method !== 'HEAD') {
      resposta.writeHead(405).end()
      return
    }
    servirArquivo(pedido, resposta, endereco.pathname)
    return
  }
  if (!origemPermitida(pedido)) {
    responderJson(resposta, 403, { error: 'origem não permitida' })
    return
  }
  try {
    if (endereco.pathname === '/api/health' && pedido.method === 'GET') {
      responderJson(resposta, 200, { app: 'treinador-xadrez', version: 1, engine: USAR_MOTOR, ...q.contagem.get() })
      return
    }
    if (endereco.pathname === '/api/data' && pedido.method === 'GET') {
      responderJson(resposta, 200, exportar(Number(endereco.searchParams.get('desde')) || 0))
      return
    }
    if (endereco.pathname === '/api/merge' && pedido.method === 'POST') {
      const dados = JSON.parse(await lerCorpo(pedido))
      responderJson(resposta, 200, { received: juntar(dados) })
      return
    }
    if (endereco.pathname === '/api/engine' && pedido.method === 'POST') {
      if (!USAR_MOTOR) {
        responderJson(resposta, 503, { error: 'motor desligado' })
        return
      }
      const pedidoMotor = JSON.parse(await lerCorpo(pedido))
      if (typeof pedidoMotor.fen !== 'string' || !/^[\w/]+ [wb] [\w-]+ [\w-]+ \d+ \d+$/.test(pedidoMotor.fen)) {
        responderJson(resposta, 400, { error: 'posição inválida' })
        return
      }
      responderJson(resposta, 200, { lines: await buscarNoMotor(pedidoMotor) })
      return
    }
    responderJson(resposta, 404, { error: 'não encontrado' })
  } catch (falha) {
    responderJson(resposta, 500, { error: falha instanceof Error ? falha.message : 'erro' })
  }
})

// Sem o site pronto, gera antes de abrir.
if (!existsSync(join(PASTA_SITE, 'index.html')) && !process.argv.includes('--sem-build')) {
  console.log('Gerando o site pela primeira vez…')
  const resultado = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: raiz, stdio: 'inherit', shell: process.platform === 'win32' })
  if (resultado.status !== 0) process.exit(resultado.status ?? 1)
}

servidor.listen(PORTA, '127.0.0.1', () => {
  const { port } = servidor.address()
  console.log(`Treinador de Xadrez rodando em http://127.0.0.1:${port}`)
  console.log(`Dados em ${PASTA_DADOS}. Só este computador tem acesso. Ctrl+C para sair.`)
})

const encerrar = () => {
  servidor.close()
  banco.close()
  process.exit(0)
}
process.on('SIGINT', encerrar)
process.on('SIGTERM', encerrar)
